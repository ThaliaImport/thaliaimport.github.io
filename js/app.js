/* =====================================================================
   THALIA IMPORT · lógica de la tienda
   No hace falta tocar este archivo para agregar productos:
   los productos están en productos.json (Thalia los cambia desde su panel,
   admin/) y los ajustes en ajustes.js.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.AJUSTES || {};
  var M = A.mensajes || {};
  var SECCIONES = [];
  var PRODUCTOS = null;  // se llena con productos.json
  var RUTA_FOTOS = 'img/fotos/';
  var TALLAS_BASE = [35, 36, 37, 38, 39];
  var TEMAS = ['a', 'b', 'c'];

  // ------------------------------------------------------------------ utilidades
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function plantilla(texto, datos) {
    return String(texto || '').replace(/\{(\w+)\}/g, function (m, k) {
      return datos[k] != null ? datos[k] : m;
    });
  }
  function numeroWa() { return String(A.whatsapp || '').replace(/\D/g, ''); }
  function urlWhatsApp(texto) { return 'https://wa.me/' + numeroWa() + '?text=' + encodeURIComponent(texto); }
  function foto(tipo, id) { return RUTA_FOTOS + tipo + '/' + encodeURIComponent(id) + '.webp'; }
  function fotoJpg(id) { return RUTA_FOTOS + 'og/' + encodeURIComponent(id) + '.jpg'; }
  function guardar(clave, valor) { try { localStorage.setItem('thalia.' + clave, valor); } catch (e) { /* sin almacenamiento */ } }
  function leer(clave) { try { return localStorage.getItem('thalia.' + clave); } catch (e) { return null; } }

  // ------------------------------------------------------------------ datos
  function productoPorId(id) {
    for (var i = 0; i < PRODUCTOS.length; i++) if (String(PRODUCTOS[i].id) === String(id)) return PRODUCTOS[i];
    return null;
  }
  function colorPorId(p, id) {
    var cs = p.colores || [];
    for (var i = 0; i < cs.length; i++) if (String(cs[i].id) === String(id)) return cs[i];
    return null;
  }
  function claveDe(p, c) { return p.id + '|' + c.id; }
  function desdeClave(k) {
    var partes = String(k || '').split('|');
    var p = productoPorId(partes[0]);
    var c = p && colorPorId(p, partes[1]);
    return c ? { p: p, c: c } : null;
  }
  function estaAgotado(p, c) { return !!(p.agotado || (c && c.agotado)); }
  function precioDe(p, c) {
    var v = (c && c.precio !== undefined && c.precio !== null && c.precio !== '') ? c.precio : p.precio;
    v = Number(v);
    return v > 0 ? v : null;
  }
  function formatoPrecio(v) { return 'S/ ' + (Math.round(v) === v ? String(v) : v.toFixed(2)); }
  // Tallas conocidas (lista) o null si no se saben.
  function tallasDe(p, c) {
    var t = (c && Array.isArray(c.tallas) && c.tallas.length) ? c.tallas : (Array.isArray(p.tallas) && p.tallas.length ? p.tallas : null);
    if (!t) return null;
    t = t.map(Number).filter(function (x) { return !isNaN(x) && x > 0; }).sort(function (a, b) { return a - b; });
    return t.length ? t : null;
  }
  function opcionesTalla(p, c) { return tallasDe(p, c) || TALLAS_BASE; }
  function tallaUnica(p, c) { var t = tallasDe(p, c); return t && t.length === 1 ? t[0] : null; }
  function tallaAgotada(c, t) {
    return !!(c && Array.isArray(c.tallasAgotadas) && c.tallasAgotadas.map(Number).indexOf(Number(t)) !== -1);
  }
  function listaTexto(lista) {
    if (lista.length === 1) return String(lista[0]);
    return lista.slice(0, -1).join(', ') + ' y ' + lista[lista.length - 1];
  }
  function nombreModelo(p, c) { return (p.nombreEnMensaje || p.nombre) + ' ' + c.nombre; }
  function etiquetaDe(p, c) {
    if (estaAgotado(p, c)) return { texto: 'Agotado', clase: 'etiqueta--agotado' };
    if (c.ultimoPar) return { texto: 'Último par', clase: 'etiqueta--aviso' };
    var u = tallaUnica(p, c);
    if (u) return { texto: 'Solo talla ' + u, clase: 'etiqueta--aviso' };
    return null;
  }

  // ------------------------------------------------------------------ enlaces y mensajes
  function paginaProducto(p, c) { return 'p/' + p.id + '-' + c.id + '.html'; }
  function enlaceProducto(p, c) {
    if (!A.incluirEnlaceDelProducto) return '';
    var rel = paginaProducto(p, c);
    var base = String(A.urlBase || '').trim();
    if (base) return base.replace(/\/*$/, '/') + rel;
    if (!/^https?:$/.test(location.protocol)) return '';
    try { return new URL(rel, location.href).href; } catch (e) { return ''; }
  }
  function mensajeProducto(p, c, talla) {
    var modelo = nombreModelo(p, c);
    var precio = precioDe(p, c);
    var datos = { modelo: modelo, talla: talla, precio: precio ? formatoPrecio(precio) : '' };
    var texto;
    if (estaAgotado(p, c)) texto = plantilla(M.agotado, datos);
    else if (talla === 'nose') texto = plantilla(precio ? M.sinTalla : M.sinTallaSinPrecio, datos);
    else texto = plantilla(precio ? M.pedido : M.pedidoSinPrecio, datos);
    var enlace = enlaceProducto(p, c);
    if (enlace && M.enlace) texto += '\n\n' + plantilla(M.enlace, { enlace: enlace });
    return texto;
  }
  function mensajeDuo(items) {
    var lineas = items.map(function (it) {
      var precio = precioDe(it.p, it.c);
      return plantilla(M.lineaDuo, {
        modelo: nombreModelo(it.p, it.c),
        talla: it.talla === 'nose' ? (M.tallaPorConfirmar || 'por confirmar') : it.talla,
        precio: precio ? formatoPrecio(precio) : (M.precioPorConfirmar || 'precio por confirmar')
      });
    });
    var texto = plantilla(M.duo, { pares: lineas.join('\n') });
    var enlaces = items.map(function (it, i) {
      var e = enlaceProducto(it.p, it.c);
      return e ? (i + 1) + '. ' + e : '';
    }).filter(Boolean);
    if (enlaces.length && M.enlacesDuo) texto += '\n\n' + plantilla(M.enlacesDuo, { enlaces: enlaces.join('\n') });
    return texto;
  }

  // ------------------------------------------------------------------ enviar con fotos (Web Share)
  var soportaFotos = (function () {
    try {
      if (!navigator.share || !navigator.canShare || typeof File !== 'function') return false;
      if (window.matchMedia && !window.matchMedia('(pointer: coarse)').matches) return false;
      return navigator.canShare({ files: [new File(['x'], 'prueba.jpg', { type: 'image/jpeg' })] });
    } catch (e) { return false; }
  })();
  var archivos = {};
  function aJpeg(blob) {
    return new Promise(function (resolver, fallar) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        var lienzo = document.createElement('canvas');
        lienzo.width = img.naturalWidth;
        lienzo.height = img.naturalHeight;
        lienzo.getContext('2d').drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        lienzo.toBlob(function (b) { if (b) resolver(b); else fallar(new Error('canvas')); }, 'image/jpeg', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); fallar(new Error('foto')); };
      img.src = url;
    });
  }
  // Prepara la foto como JPEG: usa la versión JPEG ya generada y, si falla, convierte el WebP con canvas.
  function archivoDe(p, c) {
    var id = c.fotos[0];
    var k = claveDe(p, c);
    if (!archivos[k]) {
      archivos[k] = fetch(fotoJpg(id))
        .then(function (r) { if (!r.ok) throw new Error('jpg'); return r.blob(); })
        .catch(function () { return fetch(foto('grande', id)).then(function (r) { return r.blob(); }).then(aJpeg); })
        .then(function (blob) { return new File([blob], 'thalia-import-' + p.id + '-' + c.id + '.jpg', { type: 'image/jpeg' }); });
      archivos[k].catch(function () { delete archivos[k]; });
    }
    return archivos[k];
  }
  function prepararBotonFotos(boton, pares) {
    if (!boton) return;
    boton.hidden = !soportaFotos || !pares.length;
    if (boton.hidden) return;
    boton.disabled = true;
    boton.setAttribute('aria-busy', 'true');
    var marca = String(Date.now() + Math.random());
    boton.setAttribute('data-preparando', marca);
    Promise.all(pares.map(function (it) { return archivoDe(it.p, it.c); })).then(function (lista) {
      if (boton.getAttribute('data-preparando') !== marca) return;
      boton._archivos = lista;
      boton.disabled = false;
      boton.removeAttribute('aria-busy');
    }).catch(function () {
      if (boton.getAttribute('data-preparando') === marca) boton.hidden = true;
    });
  }
  function compartirConFotos(boton, texto, avisar) {
    var lista = boton._archivos || [];
    var datos = { files: lista, text: texto };
    try {
      if (navigator.canShare && !navigator.canShare(datos)) datos = { files: lista };
      navigator.share(datos).catch(function (err) {
        if (err && err.name === 'AbortError') return;
        avisar('No se pudieron enviar las fotos. Usa «Pedir por WhatsApp», reina 💕');
      });
    } catch (e) {
      avisar('No se pudieron enviar las fotos. Usa «Pedir por WhatsApp», reina 💕');
    }
  }

  // ------------------------------------------------------------------ enlaces fijos (WhatsApp, redes)
  function prepararEnlaces() {
    var general = urlWhatsApp(M.general || 'Hola Thalia Import 💕');
    $$('[data-wa="general"]').forEach(function (a) { a.href = general; });
    $$('[data-texto="whatsappVisible"]').forEach(function (el) { if (A.whatsappVisible) el.textContent = A.whatsappVisible; });
    if (A.tiktokTienda) $$('[data-red="tiktok-tienda"]').forEach(function (a) { a.href = 'https://www.tiktok.com/@' + A.tiktokTienda; });
    if (A.tiktokLives) $$('[data-red="tiktok-lives"]').forEach(function (a) { a.href = 'https://www.tiktok.com/@' + A.tiktokLives; });
    var ig = String(A.instagram || '').replace(/^@/, '').trim();
    if (ig) {
      $$('[data-red="instagram"]').forEach(function (a) { a.href = 'https://www.instagram.com/' + encodeURIComponent(ig) + '/'; });
      $$('[data-red-usuario="instagram"]').forEach(function (el) { el.textContent = '@' + ig; });
      $$('[data-red-contenedor="instagram"]').forEach(function (el) { el.hidden = false; });
    }
    var anio = $('#anio');
    if (anio) anio.textContent = String(new Date().getFullYear());
  }

  // ------------------------------------------------------------------ temas (logos)
  function temaActual() { return document.documentElement.getAttribute('data-tema') || 'a'; }
  function cargarFuentes(t) {
    if (!window.FUENTES_TEMA || document.getElementById('fuentes-' + t)) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.id = 'fuentes-' + t;
    l.href = 'https://fonts.googleapis.com/css2?' + window.FUENTES_TEMA[t] + '&display=swap';
    document.head.appendChild(l);
  }
  function actualizarIconos(t) {
    var cambia = function (id, valor) { var el = document.getElementById(id); if (el) el.setAttribute('href', valor); };
    cambia('favicon-svg', 'img/logo/icono-' + t + '.svg');
    cambia('favicon-png', 'img/logo/icono-' + t + '-32.png');
    cambia('icono-iphone', 'img/logo/icono-' + t + '-180.png');
    var meta = document.getElementById('meta-color');
    var color = getComputedStyle(document.documentElement).getPropertyValue('--color-navegador').trim();
    if (meta && color) meta.setAttribute('content', color);
  }
  function cambiarTema(t) {
    if (TEMAS.indexOf(t) === -1) return;
    document.documentElement.setAttribute('data-tema', t);
    cargarFuentes(t);
    actualizarIconos(t);
    try {
      var u = new URL(location.href);
      u.searchParams.set('logo', t);
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
    } catch (e) { /* abierto como archivo u otro caso raro */ }
    marcarSelector(t);
    medirBarra();
  }
  function marcarSelector(t) {
    $$('#selector-logo button[data-tema]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-tema') === t ? 'true' : 'false');
    });
  }
  function iniciarSelectorLogo() {
    var caja = $('#selector-logo');
    actualizarIconos(temaActual());
    if (!caja) return;
    if (!A.vistaPreviaDeLogos) { caja.parentNode.removeChild(caja); return; }
    caja.hidden = false;
    marcarSelector(temaActual());
    caja.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tema]');
      if (b) cambiarTema(b.getAttribute('data-tema'));
    });
  }

  // ------------------------------------------------------------------ catálogo
  function seccionesConProductos() {
    return SECCIONES.filter(function (s) {
      return PRODUCTOS.some(function (p) { return p.seccion === s.id && p.colores && p.colores.length; });
    });
  }

  function tarjetaHtml(p, c) {
    var agotada = estaAgotado(p, c);
    var k = claveDe(p, c);
    var principal = (c.fotos && c.fotos[0]) || '';
    var etiqueta = etiquetaDe(p, c);
    var precio = precioDe(p, c);
    var tallas = tallasDe(p, c);
    var unica = tallaUnica(p, c);
    var lineaTallas = '';
    if (!agotada) {
      if (!tallas) lineaTallas = '<p class="tarjeta__tallas">Consulta tallas</p>';
      else if (!unica) lineaTallas = '<p class="tarjeta__tallas">Tallas ' + esc(listaTexto(tallas)) + '</p>';
    }
    var nombreCompleto = p.nombre + ', ' + c.nombre;
    var pedir;
    if (agotada) {
      pedir = '<a class="tarjeta__pedir" href="' + esc(urlWhatsApp(mensajeProducto(p, c))) + '" target="_blank" rel="noopener">Avísame cuando llegue<span class="oculto">: ' + esc(nombreCompleto) + '</span></a>';
    } else if (unica && !tallaAgotada(c, unica)) {
      pedir = '<a class="tarjeta__pedir" href="' + esc(urlWhatsApp(mensajeProducto(p, c, String(unica)))) + '" target="_blank" rel="noopener"><svg class="icono" aria-hidden="true"><use href="#i-wa"/></svg>Pedir por WhatsApp<span class="oculto">: ' + esc(nombreCompleto) + ', talla ' + unica + '</span></a>';
    } else {
      pedir = '<button type="button" class="tarjeta__pedir" data-producto="' + esc(p.id) + '" data-color="' + esc(c.id) + '"><svg class="icono" aria-hidden="true"><use href="#i-wa"/></svg>Pedir por WhatsApp<span class="oculto">: ' + esc(nombreCompleto) + ' (elige tu talla)</span></button>';
    }
    return '<li class="tarjeta' + (agotada ? ' tarjeta--agotada' : '') + '" data-clave="' + esc(k) + '">' +
      '<div class="tarjeta__foto">' +
        '<img src="' + foto('tarjeta', principal) + '" alt="' + esc(p.nombre + ', color ' + c.nombre) + '" width="600" height="600" loading="lazy" decoding="async">' +
        (etiqueta ? '<span class="etiqueta ' + etiqueta.clase + '">' + esc(etiqueta.texto) + '</span>' : '') +
        (agotada ? '' : '<button type="button" class="tarjeta__duo" data-duo="' + esc(k) + '" data-nombre="' + esc(nombreCompleto) + '" aria-pressed="false">' +
          '<svg class="icono icono--mas" aria-hidden="true"><use href="#i-mas"/></svg><svg class="icono icono--check" aria-hidden="true"><use href="#i-check"/></svg>' +
          '<span aria-hidden="true">Dúo</span><span class="oculto">Agregar ' + esc(nombreCompleto) + ' a mi dúo</span></button>') +
      '</div>' +
      '<div class="tarjeta__cuerpo">' +
        '<div class="tarjeta__datos">' +
          '<h3 class="tarjeta__nombre"><button type="button" class="tarjeta__ver" data-producto="' + esc(p.id) + '" data-color="' + esc(c.id) + '">' + esc(p.nombre) + '<span class="oculto">, ' + esc(c.nombre) + '. Ver fotos y detalles</span></button></h3>' +
          '<p class="tarjeta__color">' + esc(c.nombre) + '</p>' +
          '<p class="tarjeta__precio' + (precio ? '' : ' tarjeta__precio--consultar') + '">' + (precio ? esc(formatoPrecio(precio)) : 'Consultar precio') + '</p>' +
          lineaTallas +
        '</div>' +
        pedir +
      '</div>' +
    '</li>';
  }

  function pintarCatalogo() {
    var cont = $('#catalogo');
    if (!PRODUCTOS) {
      cont.insertAdjacentHTML('beforeend', '<div class="contenedor"><p class="catalogo__error">No se pudo cargar el catálogo. Revisa tu conexión y vuelve a abrir la página. Mientras tanto, escríbenos por WhatsApp 💕</p></div>');
      return;
    }
    var html = '';
    seccionesConProductos().forEach(function (s) {
      var tarjetas = [];
      PRODUCTOS.forEach(function (p) {
        if (p.seccion !== s.id || !p.colores || !p.colores.length) return;
        p.colores.forEach(function (c) {
          try { tarjetas.push(tarjetaHtml(p, c)); } catch (e) { if (window.console) console.warn('Color con datos incompletos:', p.id, c && c.id, e); }
        });
      });
      html += '<section class="seccion-catalogo" id="seccion-' + esc(s.id) + '" aria-labelledby="titulo-' + esc(s.id) + '">' +
        '<div class="contenedor">' +
          '<header class="seccion-catalogo__cabecera">' +
            (s.antetitulo ? '<p class="antetitulo">' + esc(s.antetitulo) + '</p>' : '') +
            '<h2 class="titulo-seccion" id="titulo-' + esc(s.id) + '">' + esc(s.titulo) + '</h2>' +
            (s.descripcion ? '<p>' + esc(s.descripcion) + '</p>' : '') +
          '</header>' +
          '<ul class="rejilla">' + tarjetas.join('') + '</ul>' +
        '</div>' +
      '</section>';
    });
    cont.insertAdjacentHTML('beforeend', html);
  }

  function pintarMenu() {
    var lista = $('#menu-secciones');
    if (!lista) return;
    var items = seccionesConProductos().map(function (s) {
      return '<li><a href="#seccion-' + esc(s.id) + '" data-espia="seccion-' + esc(s.id) + '">' + esc(s.titulo) + '</a></li>';
    });
    items.push('<li><a href="#tallas" data-espia="tallas">Guía de tallas</a></li>');
    items.push('<li><a href="#como-comprar" data-espia="como-comprar">Cómo comprar</a></li>');
    items.push('<li><a href="#preguntas" data-espia="preguntas">Preguntas</a></li>');
    lista.innerHTML = items.join('');
  }

  function iniciarEspia() {
    if (!('IntersectionObserver' in window)) return;
    var lista = $('#menu-secciones');
    var enlaces = $$('a[data-espia]', lista);
    var porId = {};
    enlaces.forEach(function (a) { porId[a.getAttribute('data-espia')] = a; });
    var activo = null;
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        var a = porId[en.target.id];
        if (!a || a === activo) return;
        if (activo) activo.removeAttribute('aria-current');
        a.setAttribute('aria-current', 'true');
        activo = a;
        var destino = a.parentNode.offsetLeft - (lista.clientWidth - a.parentNode.offsetWidth) / 2;
        try { lista.scrollTo({ left: destino, behavior: 'smooth' }); } catch (e) { lista.scrollLeft = destino; }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(porId).forEach(function (id) { var s = document.getElementById(id); if (s) obs.observe(s); });
  }

  // ------------------------------------------------------------------ hojas (diálogos) + botón atrás
  var dlgFicha = $('#ficha');
  var soportaDialogo = !!(dlgFicha && typeof dlgFicha.showModal === 'function');
  var abridor = null;

  function estaAbierto(d) { return !!(d && (d.open || d.hasAttribute('open'))); }
  function abrirModal(d) {
    abridor = document.activeElement;
    if (!estaAbierto(d)) {
      if (soportaDialogo) d.showModal();
      else { d.setAttribute('open', ''); d.classList.add('hoja--falsa'); }
    }
    document.documentElement.classList.add('con-hoja');
    var contenido = $('.hoja__contenido', d);
    if (contenido) contenido.scrollTop = 0;
    var cerrar = $('.hoja__cerrar', d);
    if (cerrar) { try { cerrar.focus({ preventScroll: true }); } catch (e) { cerrar.focus(); } }
  }
  function cerrarModal(d) {
    if (!estaAbierto(d)) return;
    if (soportaDialogo && d.open) d.close();
    else { d.removeAttribute('open'); d.classList.remove('hoja--falsa'); }
    document.documentElement.classList.remove('con-hoja');
    if (abridor && document.contains(abridor) && typeof abridor.focus === 'function') {
      try { abridor.focus({ preventScroll: true }); } catch (e) { abridor.focus(); }
    }
  }
  function mostrarHoja(d, hash) {
    abrirModal(d);
    try { history.pushState({ hoja: d.id }, '', hash); } catch (e) { /* sin historial */ }
  }
  function pedirCierre(d) {
    if (history.state && history.state.hoja === d.id) history.back();
    else cerrarModal(d);
  }
  function prepararHoja(d) {
    if (!d) return;
    d.addEventListener('cancel', function (e) { e.preventDefault(); pedirCierre(d); });
    d.addEventListener('close', function () {
      document.documentElement.classList.remove('con-hoja');
      if (history.state && history.state.hoja === d.id) { try { history.back(); } catch (e) { /* nada */ } }
    });
    d.addEventListener('click', function (e) {
      if (e.target === d) { pedirCierre(d); return; }
      if (e.target.closest('[data-cerrar]')) pedirCierre(d);
    });
    if (!soportaDialogo) {
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && estaAbierto(d)) pedirCierre(d);
      });
    }
  }
  window.addEventListener('popstate', function () {
    var st = history.state;
    if (estaAbierto(dlgFicha) && !(st && st.hoja === 'ficha')) cerrarModal(dlgFicha);
    if (st && st.hoja === 'ficha' && !estaAbierto(dlgFicha)) abrirDesdeHash(false);
  });

  // ------------------------------------------------------------------ ficha de producto
  var ficha = { p: null, c: null, talla: null };

  function tallaInicial(p, c) {
    var u = tallaUnica(p, c);
    if (u && !tallaAgotada(c, u)) return String(u);
    var pref = leer('talla');
    if (pref && opcionesTalla(p, c).indexOf(Number(pref)) !== -1 && !tallaAgotada(c, pref)) return String(pref);
    return null;
  }

  function abrirFicha(pid, cid, conHistoria) {
    var p = productoPorId(pid);
    if (!p || !p.colores || !p.colores.length) return;
    var c = colorPorId(p, cid) || p.colores[0];
    ficha.p = p;
    ficha.c = c;
    ficha.talla = estaAgotado(p, c) ? null : tallaInicial(p, c);
    pintarFicha();
    var hash = '#producto=' + encodeURIComponent(p.id) + '&color=' + encodeURIComponent(c.id);
    if (conHistoria === false) abrirModal(dlgFicha);
    else mostrarHoja(dlgFicha, hash);
  }

  function pintarFicha() {
    var p = ficha.p, c = ficha.c;
    var precio = precioDe(p, c);
    var etiqueta = etiquetaDe(p, c);
    $('#ficha-titulo').textContent = p.nombre;
    $('#ficha-desc').textContent = p.descripcion || '';
    var precioEl = $('#ficha-precio');
    precioEl.textContent = precio ? formatoPrecio(precio) : 'Consultar precio';
    precioEl.classList.toggle('ficha__precio--consultar', !precio);
    $('#ficha-etiquetas').innerHTML = etiqueta ? '<span class="etiqueta ' + etiqueta.clase + '">' + esc(etiqueta.texto) + '</span>' : '';
    pintarColoresFicha();
    pintarTallasFicha();
    pintarGaleria();
    ocultarAviso('#ficha-aviso');
    actualizarCta();
    actualizarBotonDuoFicha();
    prepararBotonFotos($('#ficha-fotos'), estaAgotado(p, c) ? [] : [{ p: p, c: c }]);
  }

  function opcionColorHtml(nombreGrupo, p, c, marcado) {
    var agot = estaAgotado(p, c);
    var mini = (c.fotos && c.fotos[0]) || '';
    return '<label class="op-color' + (agot ? ' op-color--agotado' : '') + '">' +
      '<input type="radio" name="' + nombreGrupo + '" value="' + esc(c.id) + '"' + (marcado ? ' checked' : '') + '>' +
      '<span class="op-color__foto"><img src="' + foto('mini', mini) + '" alt="" width="160" height="160" loading="lazy" decoding="async"></span>' +
      '<span class="op-color__nombre">' + esc(c.nombre) + (agot ? ' <em>(agotado)</em>' : '') + '</span>' +
    '</label>';
  }

  function pintarColoresFicha() {
    var p = ficha.p;
    var lista = $('#ficha-colores');
    $('#ficha-color-nombre').textContent = ficha.c.nombre + (estaAgotado(p, ficha.c) ? ' (agotado)' : '');
    if (p.colores.length < 2) { lista.innerHTML = ''; lista.hidden = true; return; }
    lista.hidden = false;
    lista.innerHTML = p.colores.map(function (c) { return opcionColorHtml('ficha-color', p, c, c === ficha.c); }).join('');
  }

  function opcionesTallaHtml(nombreGrupo, p, c, elegida) {
    return opcionesTalla(p, c).map(function (t) {
      var agot = tallaAgotada(c, t);
      return '<label class="op-talla"><input type="radio" name="' + nombreGrupo + '" value="' + t + '"' +
        (String(elegida) === String(t) && !agot ? ' checked' : '') + (agot ? ' disabled' : '') + '>' +
        '<span>' + t + (agot ? '<span class="oculto"> (agotada)</span>' : '') + '</span></label>';
    }).join('') +
    '<label class="op-talla op-talla--nose"><input type="radio" name="' + nombreGrupo + '" value="nose"' + (elegida === 'nose' ? ' checked' : '') + '><span>No sé mi talla</span></label>';
  }

  function pintarTallasFicha() {
    var p = ficha.p, c = ficha.c;
    var grupo = $('#ficha-tallas-grupo');
    var agot = estaAgotado(p, c);
    grupo.hidden = agot;
    if (ficha.talla && ficha.talla !== 'nose' && (tallaAgotada(c, ficha.talla) || opcionesTalla(p, c).indexOf(Number(ficha.talla)) === -1)) ficha.talla = null;
    if (!ficha.talla && !agot) ficha.talla = tallaInicial(p, c);
    var lista = $('#ficha-tallas');
    var opciones = opcionesTalla(p, c);
    lista.style.setProperty('--columnas', String(Math.min(Math.max(opciones.length, 3), 6)));
    lista.innerHTML = opcionesTallaHtml('ficha-talla', p, c, ficha.talla);
    var tallas = tallasDe(p, c);
    var nota;
    if (!tallas) nota = '<strong>Consulta tallas:</strong> elige la tuya y te confirmamos si hay.';
    else if (c.ultimoPar) nota = '<strong>Último par</strong> en talla ' + esc(tallas[0]) + '.';
    else if (tallas.length === 1) nota = 'Solo queda la talla <strong>' + esc(tallas[0]) + '</strong>.';
    else nota = 'Tallas disponibles: <strong>' + esc(listaTexto(tallas)) + '</strong>.';
    $('#ficha-nota-tallas').innerHTML = nota;
  }

  function pintarGaleria() {
    var p = ficha.p, c = ficha.c;
    var fotos = c.fotos || [];
    var g = $('#ficha-galeria');
    g.innerHTML = fotos.map(function (id, i) {
      var alt = p.nombre + ', color ' + c.nombre + (fotos.length > 1 ? ' (foto ' + (i + 1) + ' de ' + fotos.length + ')' : '');
      return '<div class="galeria__item"><img src="' + foto('grande', id) + '" alt="' + esc(alt) + '" decoding="async"' + (i ? ' loading="lazy"' : '') + '></div>';
    }).join('');
    g.scrollLeft = 0;
    var puntos = $('#ficha-puntos');
    puntos.innerHTML = fotos.length > 1 ? fotos.map(function (f, i) { return '<span' + (i ? '' : ' class="activo"') + '></span>'; }).join('') : '';
    $('.ficha__galeria').classList.toggle('con-varias', fotos.length > 1);
  }
  function indiceGaleria() {
    var g = $('#ficha-galeria');
    return g.clientWidth ? Math.round(g.scrollLeft / g.clientWidth) : 0;
  }
  function marcarPuntoGaleria() {
    var i = indiceGaleria();
    $$('#ficha-puntos span').forEach(function (s, j) { s.classList.toggle('activo', i === j); });
  }

  function actualizarCta() {
    var p = ficha.p, c = ficha.c;
    var cta = $('#ficha-cta');
    var agot = estaAgotado(p, c);
    $('#ficha-cta-texto').textContent = agot ? 'Avísame cuando llegue' : 'Pedir por WhatsApp';
    $('#ficha-duo').hidden = agot;
    if (agot || ficha.talla) {
      cta.href = urlWhatsApp(mensajeProducto(p, c, ficha.talla));
      cta.removeAttribute('aria-describedby');
    } else {
      cta.href = '#';
      cta.setAttribute('aria-describedby', 'ficha-tallas-grupo');
    }
  }

  function actualizarBotonDuoFicha() {
    if (!ficha.p) return;
    var dentro = indiceEnDuo(claveDe(ficha.p, ficha.c)) !== -1;
    var b = $('#ficha-duo');
    b.setAttribute('aria-pressed', dentro ? 'true' : 'false');
    $('#ficha-duo-texto').textContent = dentro ? 'En tu dúo (quitar)' : 'Agregar a mi dúo';
    $('use', b).setAttribute('href', dentro ? '#i-check' : '#i-mas');
  }

  function mostrarAviso(sel, texto) { var el = $(sel); el.textContent = texto; el.hidden = false; }
  function ocultarAviso(sel) { var el = $(sel); if (el) { el.hidden = true; el.textContent = ''; } }

  function iniciarFicha() {
    if (!dlgFicha) return;
    prepararHoja(dlgFicha);
    $('#ficha-colores').addEventListener('change', function (e) {
      if (e.target.name !== 'ficha-color') return;
      var c = colorPorId(ficha.p, e.target.value);
      if (!c) return;
      ficha.c = c;
      if (!ficha.talla) ficha.talla = estaAgotado(ficha.p, c) ? null : tallaInicial(ficha.p, c);
      pintarFicha();
      try {
        history.replaceState(history.state, '', '#producto=' + encodeURIComponent(ficha.p.id) + '&color=' + encodeURIComponent(c.id));
      } catch (err) { /* nada */ }
    });
    $('#ficha-tallas').addEventListener('change', function (e) {
      if (e.target.name !== 'ficha-talla') return;
      ficha.talla = e.target.value;
      if (ficha.talla !== 'nose') guardar('talla', ficha.talla);
      ocultarAviso('#ficha-aviso');
      actualizarCta();
    });
    $('#ficha-cta').addEventListener('click', function (e) {
      if (estaAgotado(ficha.p, ficha.c) || ficha.talla) return;
      e.preventDefault();
      mostrarAviso('#ficha-aviso', 'Elige tu talla, reina 💕 Si no la sabes, toca «No sé mi talla».');
      var primera = $('#ficha-tallas input:not(:disabled)');
      if (primera) {
        try { primera.focus({ preventScroll: true }); } catch (err) { primera.focus(); }
        $('#ficha-tallas-grupo').scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    });
    $('#ficha-fotos').addEventListener('click', function () {
      var p = ficha.p, c = ficha.c;
      if (!ficha.talla) {
        mostrarAviso('#ficha-aviso', 'Elige tu talla antes de enviar las fotos, reina 💕');
        var primera = $('#ficha-tallas input:not(:disabled)');
        if (primera) { try { primera.focus({ preventScroll: true }); } catch (err) { primera.focus(); } }
        return;
      }
      compartirConFotos($('#ficha-fotos'), mensajeProducto(p, c, ficha.talla), function (t) { mostrarAviso('#ficha-aviso', t); });
    });
    $('#ficha-duo').addEventListener('click', function () {
      var k = claveDe(ficha.p, ficha.c);
      var i = indiceEnDuo(k);
      if (i !== -1) {
        quitarDelDuo(i);
        ocultarAviso('#ficha-aviso');
      } else if (duo.length >= 2) {
        mostrarAviso('#ficha-aviso', 'Ya elegiste 2 pares. Quita uno en la barrita de abajo para cambiarlo.');
      } else {
        agregarAlDuo(k, ficha.talla || null);
        mostrarAviso('#ficha-aviso', duo.length === 2 ? '¡Agregado! Tu dúo está listo en la barrita de abajo 💕' : '¡Agregado a tu dúo! Ahora elige otro par 💕');
      }
      actualizarBotonDuoFicha();
    });
    $('#ficha-galeria').addEventListener('scroll', function () {
      window.requestAnimationFrame(marcarPuntoGaleria);
    }, { passive: true });
    $$('[data-galeria]', dlgFicha).forEach(function (b) {
      b.addEventListener('click', function () {
        var g = $('#ficha-galeria');
        var total = g.children.length;
        var i = (indiceGaleria() + Number(b.getAttribute('data-galeria')) + total) % total;
        try { g.scrollTo({ left: i * g.clientWidth, behavior: 'smooth' }); } catch (err) { g.scrollLeft = i * g.clientWidth; }
      });
    });
    $('#ficha-galeria').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var b = $('[data-galeria="' + (e.key === 'ArrowRight' ? '1' : '-1') + '"]', dlgFicha);
      if (b) { e.preventDefault(); b.click(); }
    });
  }

  // ------------------------------------------------------------------ dúo (2 pares de cualquier modelo)
  var duo = [];  // [{ k: 'producto|color', talla: '37' | 'nose' | null }]
  var barra = $('#barra-duo');

  function indiceEnDuo(k) {
    for (var i = 0; i < duo.length; i++) if (duo[i].k === k) return i;
    return -1;
  }
  function guardarDuo() { guardar('duo', JSON.stringify(duo)); }
  function cargarDuo() {
    try {
      var d = JSON.parse(leer('duo') || '[]');
      duo = (Array.isArray(d) ? d : []).filter(function (it) {
        var x = it && desdeClave(it.k);
        return x && !estaAgotado(x.p, x.c);
      }).slice(0, 2);
    } catch (e) { duo = []; }
  }
  function avisoDuo(texto) {
    var el = $('#duo-aviso');
    el.textContent = texto;
    el.classList.add('visible');
    clearTimeout(avisoDuo.t);
    avisoDuo.t = setTimeout(function () { el.classList.remove('visible'); }, 4200);
  }
  function agregarAlDuo(k, talla) {
    if (indiceEnDuo(k) !== -1) return true;
    if (duo.length >= 2) {
      avisoDuo('Ya elegiste 2 pares. Toca × en uno para cambiarlo.');
      return false;
    }
    var x = desdeClave(k);
    if (!x || estaAgotado(x.p, x.c)) return false;
    duo.push({ k: k, talla: talla || tallaInicial(x.p, x.c) });
    guardarDuo();
    pintarDuo();
    avisoDuo(duo.length === 1 ? 'Listo 💕 Ahora elige otro par.' : '¡Tu dúo está listo! Revisa las tallas y pídelo.');
    return true;
  }
  function quitarDelDuo(i) {
    duo.splice(i, 1);
    guardarDuo();
    pintarDuo();
  }
  function itemsDuo() {
    return duo.map(function (it) { var x = desdeClave(it.k); return { p: x.p, c: x.c, talla: it.talla }; });
  }

  function parHtml(it, i) {
    var x = desdeClave(it.k);
    var p = x.p, c = x.c;
    var nombre = nombreModelo(p, c);
    var unica = tallaUnica(p, c);
    var talla = unica
      ? '<span class="par-duo__talla">Talla ' + unica + '</span>'
      : '<label class="par-duo__talla par-duo__talla--elegir"><span class="oculto">Talla para ' + esc(nombre) + '</span>' +
          '<select data-indice="' + i + '">' +
            '<option value=""' + (!it.talla ? ' selected' : '') + '>Talla</option>' +
            opcionesTalla(p, c).map(function (t) {
              return '<option value="' + t + '"' + (String(it.talla) === String(t) ? ' selected' : '') + (tallaAgotada(c, t) ? ' disabled' : '') + '>' + t + '</option>';
            }).join('') +
            '<option value="nose"' + (it.talla === 'nose' ? ' selected' : '') + '>No sé</option>' +
          '</select></label>';
    return '<div class="par-duo' + (it.talla ? '' : ' par-duo--falta') + '">' +
      '<span class="par-duo__foto"><img src="' + foto('mini', c.fotos[0]) + '" alt="" width="160" height="160"></span>' +
      '<button type="button" class="par-duo__quitar" data-quitar="' + i + '" aria-label="Quitar ' + esc(nombre) + ' de mi dúo"><svg class="icono" aria-hidden="true"><use href="#i-cerrar"/></svg></button>' +
      '<span class="par-duo__info"><span class="par-duo__nombre">' + esc(nombre) + '</span>' + talla + '</span>' +
    '</div>';
  }

  function pintarDuo() {
    if (!barra) return;
    var lista = $('#barra-duo-pares');
    if (!duo.length) {
      barra.hidden = true;
      document.documentElement.classList.remove('con-duo');
    } else {
      barra.hidden = false;
      document.documentElement.classList.add('con-duo');
      lista.innerHTML = duo.map(parHtml).join('') +
        (duo.length < 2 ? '<div class="par-duo par-duo--vacio" aria-hidden="true"><span class="par-duo__foto"><svg class="icono"><use href="#i-mas"/></svg></span><span class="par-duo__info"><span class="par-duo__talla">Otro par</span></span></div>' : '');
    }
    actualizarCtaDuo();
    marcarTarjetas();
    actualizarBotonDuoFicha();
    medirBarra();
  }

  function actualizarCtaDuo() {
    var cta = $('#duo-cta');
    var listo = duo.length === 2 && duo.every(function (it) { return it.talla; });
    cta.href = listo ? urlWhatsApp(mensajeDuo(itemsDuo())) : '#';
    cta.classList.toggle('boton--esperando', !listo);
    prepararBotonFotos($('#duo-fotos'), duo.length === 2 ? itemsDuo() : []);
  }

  function faltaEnDuo() {
    if (duo.length < 2) return { texto: 'Elige otro par: toca «+ Dúo» en otro modelo 👟' };
    for (var i = 0; i < duo.length; i++) {
      if (!duo[i].talla) return { texto: 'Elige la talla del par ' + (i + 1) + ', reina 💕', indice: i };
    }
    return null;
  }

  function marcarTarjetas() {
    $$('.tarjeta__duo').forEach(function (b) {
      var dentro = indiceEnDuo(b.getAttribute('data-duo')) !== -1;
      b.setAttribute('aria-pressed', dentro ? 'true' : 'false');
      var t = $('.oculto', b);
      var n = b.getAttribute('data-nombre') || '';
      if (t) t.textContent = dentro ? 'Quitar ' + n + ' de mi dúo' : 'Agregar ' + n + ' a mi dúo';
      var li = b.closest('.tarjeta');
      if (li) li.classList.toggle('tarjeta--en-duo', dentro);
    });
  }

  function medirBarra() {
    if (!barra) return;
    var alto = barra.hidden ? 0 : barra.offsetHeight;
    document.documentElement.style.setProperty('--alto-barra', alto + 'px');
  }

  function iniciarDuo() {
    if (!barra) return;
    cargarDuo();
    pintarDuo();
    $('#barra-duo-pares').addEventListener('change', function (e) {
      var sel = e.target.closest('select[data-indice]');
      if (!sel) return;
      var it = duo[Number(sel.getAttribute('data-indice'))];
      if (!it) return;
      it.talla = sel.value || null;
      if (it.talla && it.talla !== 'nose') guardar('talla', it.talla);
      guardarDuo();
      sel.closest('.par-duo').classList.toggle('par-duo--falta', !it.talla);
      actualizarCtaDuo();
    });
    $('#barra-duo-pares').addEventListener('click', function (e) {
      var b = e.target.closest('[data-quitar]');
      if (b) quitarDelDuo(Number(b.getAttribute('data-quitar')));
    });
    $('#duo-cta').addEventListener('click', function (e) {
      var falta = faltaEnDuo();
      if (!falta) return;
      e.preventDefault();
      avisoDuo(falta.texto);
      if (falta.indice !== undefined) {
        var sel = $('#barra-duo-pares select[data-indice="' + falta.indice + '"]');
        if (sel) sel.focus();
      }
    });
    $('#duo-fotos').addEventListener('click', function () {
      var falta = faltaEnDuo();
      if (falta) { avisoDuo(falta.texto); return; }
      compartirConFotos($('#duo-fotos'), mensajeDuo(itemsDuo()), avisoDuo);
    });
    if ('ResizeObserver' in window) new ResizeObserver(medirBarra).observe(barra);
    window.addEventListener('resize', medirBarra);
  }

  // ------------------------------------------------------------------ enlaces directos (#producto=…)
  function leerHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (h.indexOf('producto=') === -1) return null;
    var datos = {};
    h.split('&').forEach(function (par) {
      var kv = par.split('=');
      try { datos[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); } catch (e) { /* nada */ }
    });
    return datos.producto ? { producto: datos.producto, color: datos.color } : null;
  }
  function abrirDesdeHash(alCargar) {
    var h = leerHash();
    if (!h || !PRODUCTOS || !productoPorId(h.producto)) return;
    if (alCargar) {
      // Deja la página "debajo" en el historial: el botón atrás cierra la ficha y no saca de la web.
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* nada */ }
      abrirFicha(h.producto, h.color, true);
    } else {
      abrirFicha(h.producto, h.color, false);
    }
  }

  // ------------------------------------------------------------------ arranque
  // El catálogo se pide sin caché para que los cambios del panel se vean pronto.
  function cargarCatalogo() {
    if (!window.fetch) return Promise.resolve(null);
    return fetch('productos.json?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (datos) {
        if (!datos || !Array.isArray(datos.productos)) throw new Error('productos.json sin productos');
        return datos;
      })
      .catch(function (e) { if (window.console) console.warn('No se pudo cargar productos.json:', e); return null; });
  }

  function iniciar() {
    prepararEnlaces();
    iniciarSelectorLogo();
    cargarCatalogo().then(function (datos) {
      if (datos) {
        PRODUCTOS = datos.productos;
        SECCIONES = Array.isArray(datos.secciones) ? datos.secciones : [];
      }
      iniciarCatalogo();
    });
  }

  function iniciarCatalogo() {
    pintarCatalogo();
    if (!PRODUCTOS) return;
    pintarMenu();
    iniciarEspia();
    iniciarFicha();
    iniciarDuo();

    document.addEventListener('click', function (e) {
      var duoBtn = e.target.closest('.tarjeta__duo');
      if (duoBtn) {
        var k = duoBtn.getAttribute('data-duo');
        var i = indiceEnDuo(k);
        if (i !== -1) quitarDelDuo(i);
        else agregarAlDuo(k);
        return;
      }
      var abrir = e.target.closest('.tarjeta__ver, button.tarjeta__pedir');
      if (abrir) abrirFicha(abrir.getAttribute('data-producto'), abrir.getAttribute('data-color'));
    });

    abrirDesdeHash(true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
