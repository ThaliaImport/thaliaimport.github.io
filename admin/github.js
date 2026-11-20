/* Conexión del panel con GitHub (API REST).
 * - leer():   rama → commit → árbol completo → productos.json
 * - guardar(): UN solo commit con todos los cambios (blobs → árbol → commit → mover la rama).
 *   Si la rama cambió mientras tanto, avisa con un error de tipo "conflicto" y no pisa nada.
 */
(function () {
  'use strict';

  var API = 'https://api.github.com';

  function ErrorPanel(tipo, detalle) {
    var e = new Error(detalle || tipo);
    e.tipo = tipo;
    return e;
  }

  // ------------------------------------------------------------ bytes, base64 y SHA de git
  function bytesDeTexto(t) { return new TextEncoder().encode(t); }
  function textoDeBytes(b) { return new TextDecoder('utf-8').decode(b); }
  function base64DeBytes(bytes) {
    var partes = [];
    for (var i = 0; i < bytes.length; i += 0x8000) {
      partes.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)));
    }
    return btoa(partes.join(''));
  }
  function bytesDeBase64(b64) {
    var bin = atob(String(b64 || '').replace(/\s/g, ''));
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  // SHA-1 del blob tal como lo calcula git: "blob <tamaño>\0<contenido>"
  function shaGit(bytes) {
    var cab = bytesDeTexto('blob ' + bytes.length + '\0');
    var todo = new Uint8Array(cab.length + bytes.length);
    todo.set(cab, 0);
    todo.set(bytes, cab.length);
    return crypto.subtle.digest('SHA-1', todo).then(hex);
  }

  // ------------------------------------------------------------ cliente
  function crear(opciones) {
    var usuario = opciones.usuario, repo = opciones.repo, rama = opciones.rama || 'main';
    var token = opciones.token;
    var raiz = API + '/repos/' + encodeURIComponent(usuario) + '/' + encodeURIComponent(repo);

    function api(metodo, ruta, cuerpo) {
      var init = {
        method: metodo,
        cache: 'no-store',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': 'Bearer ' + token,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      };
      if (cuerpo !== undefined) {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(cuerpo);
      }
      return fetch(raiz + ruta, init).then(function (r) {
        if (r.ok) return r.status === 204 ? null : r.json();
        return r.text().then(function (texto) {
          var msg = '';
          try { msg = JSON.parse(texto).message || ''; } catch (e) { msg = texto.slice(0, 200); }
          var det = metodo + ' ' + ruta + ' → ' + r.status + ' ' + msg;
          if (r.status === 401) throw ErrorPanel('clave', det);
          if (r.status === 403 || r.status === 429) {
            if (r.headers.get('x-ratelimit-remaining') === '0' || /rate limit/i.test(msg)) throw ErrorPanel('limite', det);
            throw ErrorPanel('permiso', det);
          }
          if (r.status === 404) throw ErrorPanel(metodo === 'GET' ? 'noExiste' : 'permiso', det);
          if (r.status === 409 || (r.status === 422 && (ruta.indexOf('/git/refs/') === 0 || /fast.forward/i.test(msg)))) throw ErrorPanel('conflicto', det);
          throw ErrorPanel('servidor', det);
        });
      }, function (e) {
        throw ErrorPanel('sinRed', String(e && e.message || e));
      });
    }

    function shaDeRama() {
      return api('GET', '/git/ref/heads/' + encodeURIComponent(rama)).then(function (r) { return r.object.sha; });
    }

    // Comprueba que la clave funcione (y que el repositorio exista).
    function validar() { return api('GET', ''); }

    // Lee todo lo necesario para editar: commit, árbol (ruta → sha) y productos.json
    function leer(shaConocido) {
      var base = {};
      return (shaConocido ? Promise.resolve(shaConocido) : shaDeRama()).then(function (sha) {
        base.commit = sha;
        return api('GET', '/git/commits/' + sha);
      }).then(function (c) {
        base.arbol = c.tree.sha;
        return api('GET', '/git/trees/' + c.tree.sha + '?recursive=1');
      }).then(function (t) {
        if (t.truncated) throw ErrorPanel('servidor', 'árbol truncado');
        base.archivos = {};
        t.tree.forEach(function (e) { if (e.type === 'blob') base.archivos[e.path] = e.sha; });
        var shaJson = base.archivos['productos.json'];
        if (!shaJson) throw ErrorPanel('noExiste', 'falta productos.json');
        return api('GET', '/git/blobs/' + shaJson);
      }).then(function (b) {
        var texto = textoDeBytes(bytesDeBase64(b.content)).replace(/^﻿/, '');
        try { base.catalogo = JSON.parse(texto); } catch (e) { throw ErrorPanel('datos', 'productos.json no es JSON válido'); }
        return base;
      });
    }

    /* cambios = { escribir: [{ ruta, bytes(Uint8Array) }], borrar: [ruta] }
     * Crea un solo commit sobre base.commit y mueve la rama (sin forzar).
     * Devuelve { commit, arbol, shas: { ruta: sha } }.  */
    function guardar(base, cambios, mensaje) {
      var shas = {};
      // Blobs de a 3 a la vez (fotos en base64): rápido sin saturar el celular.
      var pendientes = cambios.escribir.slice();
      function siguiente() {
        var lote = pendientes.splice(0, 3);
        if (!lote.length) return Promise.resolve();
        return Promise.all(lote.map(function (a) {
          return api('POST', '/git/blobs', { content: base64DeBytes(a.bytes), encoding: 'base64' }).then(function (r) { shas[a.ruta] = r.sha; });
        })).then(siguiente);
      }
      var nuevo = {};
      return siguiente().then(function () {
        var arbol = cambios.escribir.map(function (a) {
          return { path: a.ruta, mode: '100644', type: 'blob', sha: shas[a.ruta] };
        }).concat(cambios.borrar.map(function (ruta) {
          return { path: ruta, mode: '100644', type: 'blob', sha: null };
        }));
        return api('POST', '/git/trees', { base_tree: base.arbol, tree: arbol });
      }).then(function (t) {
        nuevo.arbol = t.sha;
        return api('POST', '/git/commits', { message: mensaje, tree: t.sha, parents: [base.commit] });
      }).then(function (c) {
        nuevo.commit = c.sha;
        return api('PATCH', '/git/refs/heads/' + encodeURIComponent(rama), { sha: c.sha, force: false });
      }).then(function () {
        nuevo.shas = shas;
        return nuevo;
      });
    }

    function urlCruda(ruta) {
      return 'https://raw.githubusercontent.com/' + encodeURIComponent(usuario) + '/' + encodeURIComponent(repo) + '/' + encodeURIComponent(rama) + '/' + ruta;
    }

    return { validar: validar, leer: leer, shaDeRama: shaDeRama, guardar: guardar, urlCruda: urlCruda };
  }

  window.GitHubTienda = {
    crear: crear, shaGit: shaGit, bytesDeTexto: bytesDeTexto, ErrorPanel: ErrorPanel
  };
})();
