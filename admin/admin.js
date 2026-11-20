/* Panel de Thalia Import: pantallas, formulario y guardado.
 * La cuenta, el repositorio y la rama salen de ajustes.js (AJUSTES.github).
 * Cada acción (guardar, agotado, eliminar) es UN commit en GitHub.
 */
(function () {
  'use strict';

  const A = window.AJUSTES || {};
  const G = A.github || {};
  const CLAVE_LS = 'thalia.panel.clave';
  const TALLAS_BASE = [34, 35, 36, 37, 38, 39, 40, 41];
  const GENERICO = { plataformas: 'Plataforma', deportivas: 'Deportiva', urbanas: 'Urbana' };
  const FRASE = {
    plataformas: 'Suela alta, cómoda y fácil de combinar.',
    deportivas: 'Cómoda para caminar todo el día.',
    urbanas: 'Un básico que va con todo.'
  };
  const MENSAJES = {
    sinRed: ['No hay internet', 'Revisa tu señal o el wifi y toca Reintentar.'],
    clave: ['Clave incorrecta o vencida, pídele una nueva a Ronald.', ''],
    permiso: ['Esta clave no tiene permiso para guardar.', 'Pídele una nueva a Ronald.'],
    noExiste: ['No encuentro la tienda en GitHub.', 'Avísale a Ronald (puede que la tienda se haya mudado).'],
    conflicto: ['Alguien más estaba cambiando la tienda al mismo tiempo.', 'Toca Reintentar.'],
    limite: ['Hiciste muchos cambios seguidos.', 'Espera unos minutos y toca Reintentar.'],
    yaNoExiste: ['Esa zapatilla ya no está en la tienda.', 'Quizás la borraron desde otro celular. Ya actualicé la lista.'],
    datos: ['Hay un problema con los datos de la tienda.', 'Avísale a Ronald.'],
    servidor: ['GitHub no respondió bien.', 'Espera un ratito y toca Reintentar.']
  };

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const leerLS = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ponerLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  const borrarLS = k => { try { localStorage.removeItem(k); } catch (e) { /* nada */ } };
  const precioTexto = v => 'S/ ' + (Math.round(v) === v ? String(v) : v.toFixed(2));
  const listaTexto = l => l.length === 1 ? String(l[0]) : l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1];

  let gh = null;        // cliente de GitHub
  let base = null;      // { commit, arbol, archivos: {ruta: sha}, catalogo }
  const nuevas = {};    // fotos hechas en esta sesión: id → { grande, tarjeta, mini, og, url } o { procesando: true }
  const filtro = { texto: '', seccion: '' };
  let form = null;      // estado del formulario abierto
  let pendiente = null; // operación para "Reintentar"

  // ================================================================ pantallas
  function mostrarPantalla(nombre) {
    ['clave', 'cargando', 'lista', 'form'].forEach(n => { $('#pantalla-' + n).hidden = n !== nombre; });
  }

  // ================================================================ fotos (direcciones)
  function rutaFoto(tipo, id) { return 'img/fotos/' + tipo + '/' + id + (tipo === 'og' ? '.jpg' : '.webp'); }
  function imgFoto(id, tipo, alt) {
    if (nuevas[id] && nuevas[id].url) return '<img src="' + nuevas[id].url + '" alt="' + esc(alt) + '">';
    if (nuevas[id]) return '';
    let t = tipo;
    if (base && !base.archivos[rutaFoto(t, id)]) t = 'grande';
    const ruta = rutaFoto(t, id);
    return '<img src="../' + esc(ruta) + '" data-cruda="' + esc(gh ? gh.urlCruda(ruta) : '') + '" alt="' + esc(alt) + '" loading="lazy" decoding="async">';
  }
  // Si la foto aún no llegó a la web (recién guardada desde otro celular), se pide directo a GitHub.
  document.addEventListener('error', e => {
    const img = e.target;
    if (img && img.tagName === 'IMG' && img.dataset.cruda && !img.dataset.probada) {
      img.dataset.probada = '1';
      img.src = img.dataset.cruda;
    }
  }, true);

  // ================================================================ clave
  function iniciar() {
    if (location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* nada */ } }
    if (!G.usuario || !G.repo) {
      mostrarPantalla('clave');
      errorClave('Falta configurar la tienda (github en ajustes.js). Avísale a Ronald.');
      $('#boton-entrar').disabled = true;
      return;
    }
    const t = leerLS(CLAVE_LS);
    if (t) entrar(t, true);
    else mostrarPantalla('clave');
  }

  function errorClave(texto) {
    const p = $('#clave-error');
    p.textContent = texto;
    p.hidden = !texto;
  }

  function cargando(texto) {
    $('#cargando-texto').textContent = texto || 'Cargando tus productos…';
    $('#cargando-reintentar').hidden = true;
    $('#cargando-otra').hidden = true;
    $('.pantalla--cargando .ruedita').hidden = false;
    mostrarPantalla('cargando');
  }

  function entrar(token, guardada) {
    gh = GitHubTienda.crear({ usuario: G.usuario, repo: G.repo, rama: G.rama || 'main', token: token });
    cargando(guardada ? 'Cargando tus productos…' : 'Revisando la clave…');
    gh.validar().then(() => gh.leer()).then(b => {
      base = b;
      ponerLS(CLAVE_LS, token);
      $('#clave').value = '';
      pintarFiltros();
      pintarLista();
      mostrarPantalla('lista');
    }).catch(e => {
      const tipo = e.tipo || 'servidor';
      if (window.console) console.warn('Panel:', e);
      if (tipo === 'clave' || tipo === 'permiso' || !guardada) {
        if (tipo === 'clave') borrarLS(CLAVE_LS);
        mostrarPantalla('clave');
        errorClave(tipo === 'clave' ? 'Clave incorrecta o vencida, pídele una nueva a Ronald.'
          : tipo === 'sinRed' ? 'No hay internet. Revisa tu señal o el wifi y vuelve a tocar Entrar.'
          : (MENSAJES[tipo] || MENSAJES.servidor).join(' '));
        return;
      }
      // Clave guardada pero falló otra cosa (sin internet, GitHub caído): se ofrece reintentar.
      $('.pantalla--cargando .ruedita').hidden = true;
      $('#cargando-texto').textContent = (MENSAJES[tipo] || MENSAJES.servidor).join('. ').replace('. Toca Reintentar.', '.');
      $('#cargando-reintentar').hidden = false;
      $('#cargando-otra').hidden = false;
    });
  }

  $('#form-clave').addEventListener('submit', e => {
    e.preventDefault();
    const t = $('#clave').value.trim().replace(/^bearer\s+/i, '');
    if (!t) { errorClave('Pega tu clave de acceso.'); return; }
    errorClave('');
    if (!navigator.onLine) { errorClave('No hay internet. Revisa tu señal o el wifi y vuelve a tocar Entrar.'); return; }
    entrar(t, false);
  });
  $('#ver-clave').addEventListener('change', e => { $('#clave').type = e.target.checked ? 'text' : 'password'; });
  $('#cargando-reintentar').addEventListener('click', () => { const t = leerLS(CLAVE_LS); if (t) entrar(t, true); else mostrarPantalla('clave'); });
  $('#cargando-otra').addEventListener('click', () => { borrarLS(CLAVE_LS); mostrarPantalla('clave'); });

  $('#boton-salir').addEventListener('click', () => {
    confirmar({ texto: '¿Cerrar sesión?', detalle: 'Para volver a entrar vas a necesitar tu clave de acceso.', si: 'Sí, salir', no: 'No', peligro: false })
      .then(si => { if (si) salir(); });
  });
  function salir() {
    borrarLS(CLAVE_LS);
    gh = null; base = null;
    errorClave('');
    mostrarPantalla('clave');
  }

  // ================================================================ lista
  function secciones() { return (base && Array.isArray(base.catalogo.secciones)) ? base.catalogo.secciones : []; }
  function tituloSeccion(id) { const s = secciones().find(x => x.id === id); return s ? s.titulo : id; }

  function pintarFiltros() {
    const ops = [{ id: '', titulo: 'Todas' }].concat(secciones());
    $('#filtros').innerHTML = ops.map(s =>
      '<button type="button" class="filtro" data-seccion="' + esc(s.id) + '" aria-pressed="' + (filtro.seccion === s.id) + '">' + esc(s.titulo) + '</button>').join('');
  }

  function itemHtml(p, c) {
    const ef = Catalogo.efectivo(p, c);
    const etq = [];
    if (ef.agotado) etq.push('<span class="etq etq--agotado">Agotado</span>');
    if (c.ultimoPar) etq.push('<span class="etq etq--ultimo">Último par</span>');
    if (c.liquidacion && !ef.agotado) etq.push('<span class="etq etq--liquidacion">Liquidación</span>');
    if (!ef.agotado && ef.tallas && ef.tallas.length === 1) etq.push('<span class="etq">Solo talla ' + ef.tallas[0] + '</span>');
    const tallas = ef.tallas ? (ef.tallas.length > 1 ? 'Tallas ' + listaTexto(ef.tallas) : '') : 'Consulta tallas';
    const nombre = p.nombre + ' ' + c.nombre;
    return '<li class="item' + (ef.agotado ? ' item--agotado' : '') + '" data-pid="' + esc(p.id) + '" data-cid="' + esc(c.id) + '">' +
      '<div class="item__fila">' +
        '<div class="item__foto">' + imgFoto((c.fotos || [])[0], 'tarjeta', nombre) + '</div>' +
        '<div class="item__datos">' +
          '<h2 class="item__nombre">' + esc(p.nombre) + '</h2>' +
          '<p class="item__color">' + esc(c.nombre) + '</p>' +
          '<p class="item__precio' + (ef.precio ? '' : ' item__precio--sin') + '">' + (ef.precio ? esc(precioTexto(ef.precio)) : 'Sin precio') +
            (tallas ? ' <span class="suave" style="font-weight:500;font-size:.92rem">· ' + esc(tallas) + '</span>' : '') + '</p>' +
          (etq.length ? '<div class="etiquetas">' + etq.join('') + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="item__acciones">' +
        '<div class="stock" role="group" aria-label="Stock de ' + esc(nombre) + '">' +
          '<button type="button" data-stock="hay" aria-pressed="' + !ef.agotado + '">' + (ef.agotado ? '' : '✓ ') + 'Hay stock</button>' +
          '<button type="button" data-stock="agotado" aria-pressed="' + ef.agotado + '">' + (ef.agotado ? '✓ ' : '') + 'Agotado</button>' +
        '</div>' +
        '<button type="button" class="editar">✏️ Editar<span class="oculto"> ' + esc(nombre) + '</span></button>' +
      '</div>' +
    '</li>';
  }

  function pintarLista() {
    if (!base) return;
    const q = Catalogo.normal(filtro.texto);
    let total = 0;
    const html = [];
    base.catalogo.productos.forEach(p => (p.colores || []).forEach(c => {
      total++;
      if (filtro.seccion && p.seccion !== filtro.seccion) return;
      if (q && Catalogo.normal(p.nombre + ' ' + c.nombre).indexOf(q) === -1) return;
      html.push(itemHtml(p, c));
    }));
    $('#lista').innerHTML = html.join('');
    $('#lista-vacia').hidden = html.length > 0;
    $('#contador').textContent = '(' + total + ')';
  }

  $('#buscar').addEventListener('input', e => { filtro.texto = e.target.value; pintarLista(); });
  $('#filtros').addEventListener('click', e => {
    const b = e.target.closest('[data-seccion]');
    if (!b) return;
    filtro.seccion = b.dataset.seccion;
    pintarFiltros();
    pintarLista();
  });
  $('#lista').addEventListener('click', e => {
    const li = e.target.closest('.item');
    if (!li) return;
    const pid = li.dataset.pid, cid = li.dataset.cid;
    const st = e.target.closest('[data-stock]');
    if (st) {
      if (st.getAttribute('aria-pressed') === 'true') return;
      ejecutar({ tipo: 'agotado', pid: pid, cid: cid, valor: st.dataset.stock === 'agotado' }, { rapido: true });
      return;
    }
    if (e.target.closest('.editar')) abrirForm(pid, cid);
  });
  $('#boton-agregar').addEventListener('click', () => abrirForm(null, null));
  $('#boton-actualizar').addEventListener('click', () => {
    cargando('Actualizando…');
    gh.leer().then(b => { base = b; pintarFiltros(); pintarLista(); mostrarPantalla('lista'); })
      .catch(e => { mostrarPantalla('lista'); mostrarEstado('error', e); });
  });

  // ================================================================ formulario
  function abrirForm(pid, cid) {
    const cat = base.catalogo;
    const p = pid ? Catalogo.productoPorId(cat, pid) : null;
    const c = p ? Catalogo.colorPorId(p, cid) : null;
    const ef = c ? Catalogo.efectivo(p, c) : null;
    form = {
      original: c ? { pid: p.id, cid: c.id } : null,
      producto: p,
      fotos: c ? (c.fotos || []).slice() : [],
      seccion: p ? p.seccion : '',
      tallas: {},
      sucio: false,
      descAuto: ''
    };
    if (ef && ef.tallas) ef.tallas.forEach(t => { form.tallas[t] = ef.tallasAgotadas.indexOf(t) !== -1 ? 'agotada' : 'hay'; });
    $('#nombre').value = p ? p.nombre : '';
    $('#color').value = c ? c.nombre : '';
    $('#precio').value = ef && ef.precio ? (Math.round(ef.precio) === ef.precio ? String(ef.precio) : ef.precio.toFixed(2)) : '';
    $('#ultimo-par').checked = !!(c && c.ultimoPar);
    $('#liquidacion').checked = !!(c && c.liquidacion);
    $('#agotado').checked = !!(ef && ef.agotado);
    $('#descripcion').value = p ? (p.descripcion || '') : '';
    $('#form-titulo').textContent = c ? 'Editar zapatilla' : 'Agregar zapatilla';
    $('#boton-eliminar').hidden = !c;
    $('#modelos').innerHTML = cat.productos.map(x => '<option value="' + esc(x.nombre) + '"></option>').join('');
    $$('[data-error]').forEach(el => { el.hidden = true; });
    pintarFotos();
    pintarSecciones();
    pintarTallas();
    revisarNombre();
    revisarMarcas();
    actualizarSugerencia();
    try { history.pushState({ pantalla: 'form' }, '', '#editar'); } catch (e) { /* nada */ }
    mostrarPantalla('form');
    window.scrollTo(0, 0);
  }

  function cerrarForm() {
    form = null;
    mostrarPantalla('lista');
  }

  // Botón atrás del celular: vuelve a la lista (pregunta si hay cambios sin guardar).
  window.addEventListener('popstate', () => {
    if (!form || $('#pantalla-form').hidden) return;
    if (!form.sucio) { cerrarForm(); return; }
    try { history.pushState({ pantalla: 'form' }, '', '#editar'); } catch (e) { /* nada */ }
    confirmar({ texto: '¿Salir sin guardar?', detalle: 'Los cambios que hiciste se van a perder.', si: 'Sí, salir', no: 'Seguir editando', peligro: true })
      .then(si => { if (si) { form.sucio = false; history.back(); } });
  });
  $('#boton-volver').addEventListener('click', () => history.back());
  function volverALista() {
    if (history.state && history.state.pantalla === 'form') { form.sucio = false; history.back(); }
    else cerrarForm();
  }
  $('#form').addEventListener('input', () => { if (form) form.sucio = true; });
  $('#form').addEventListener('change', () => { if (form) form.sucio = true; });

  // ---------------------------------------------------------------- fotos
  function pintarFotos() {
    $('#fotos').innerHTML = form.fotos.map((id, i) => {
      const cargandoFoto = nuevas[id] && nuevas[id].procesando;
      return '<li class="foto" data-id="' + esc(id) + '">' +
        '<div class="foto__img">' + imgFoto(id, i === 0 ? 'tarjeta' : 'mini', 'Foto ' + (i + 1)) +
          (i === 0 ? '<span class="foto__marca">Principal</span>' : '') +
          (cargandoFoto ? '<span class="foto__cargando">Preparando…</span>' : '') +
        '</div>' +
        '<div class="foto__botones">' +
          (i === 0 ? '' : '<button type="button" data-accion="primera">★ Principal</button>') +
          '<button type="button" class="quitar" data-accion="quitar"' + (i === 0 ? ' style="grid-column: 1 / -1"' : '') + '>✕ Quitar</button>' +
        '</div>' +
      '</li>';
    }).join('');
  }
  $('#fotos').addEventListener('click', e => {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    const id = b.closest('.foto').dataset.id;
    const i = form.fotos.indexOf(id);
    if (i === -1) return;
    form.fotos.splice(i, 1);
    if (b.dataset.accion === 'primera') form.fotos.unshift(id);
    form.sucio = true;
    pintarFotos();
  });
  function agregarFotos(archivos) {
    const lista = Array.from(archivos || []).filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
    if (!lista.length) return;
    $('[data-error="fotos"]').hidden = true;
    lista.forEach(archivo => {
      const id = FotosPanel.idNuevo();
      nuevas[id] = { procesando: true };
      form.fotos.push(id);
      form.sucio = true;
      const f = form;
      FotosPanel.procesar(archivo).then(r => {
        r.url = URL.createObjectURL(r.tarjeta);
        nuevas[id] = r;
        if (form === f) pintarFotos();
      }).catch(err => {
        delete nuevas[id];
        if (form === f) {
          form.fotos = form.fotos.filter(x => x !== id);
          pintarFotos();
          mostrarError('fotos', (err && err.message) || 'Esa foto no se pudo abrir. Prueba con otra.');
        }
      });
    });
    pintarFotos();
  }
  ['#foto-camara', '#foto-galeria'].forEach(sel => {
    $(sel).addEventListener('change', e => { agregarFotos(e.target.files); e.target.value = ''; });
  });

  // ---------------------------------------------------------------- sección
  function pintarSecciones() {
    $('#secciones').innerHTML = secciones().map(s =>
      '<button type="button" class="seccion-op" role="radio" data-seccion="' + esc(s.id) + '" aria-checked="' + (form.seccion === s.id) + '">' + esc(s.titulo) + '</button>').join('');
  }
  $('#secciones').addEventListener('click', e => {
    const b = e.target.closest('[data-seccion]');
    if (!b) return;
    form.seccion = b.dataset.seccion;
    form.sucio = true;
    $('[data-error="seccion"]').hidden = true;
    pintarSecciones();
    actualizarSugerencia();
  });

  // ---------------------------------------------------------------- tallas
  function pintarTallas() {
    const todas = TALLAS_BASE.slice();
    Object.keys(form.tallas).map(Number).forEach(t => { if (todas.indexOf(t) === -1) todas.push(t); });
    todas.sort((a, b) => a - b);
    $('#tallas').innerHTML = todas.map(t => {
      const est = form.tallas[t] || '';
      const txt = est === 'hay' ? 'hay' : est === 'agotada' ? 'agotada' : 'no hay';
      return '<button type="button" class="talla" data-talla="' + t + '" data-estado="' + est + '" aria-label="Talla ' + t + ': ' + txt + '">' + t + '</button>';
    }).join('');
    const alguna = Object.keys(form.tallas).some(t => form.tallas[t]);
    $('#talla-nose').setAttribute('aria-pressed', String(!alguna));
  }
  $('#tallas').addEventListener('click', e => {
    const b = e.target.closest('[data-talla]');
    if (!b) return;
    const t = Number(b.dataset.talla);
    const est = form.tallas[t] || '';
    // Sin marcar → hay → agotada (tachada) → sin marcar
    if (!est) form.tallas[t] = 'hay';
    else if (est === 'hay') form.tallas[t] = 'agotada';
    else delete form.tallas[t];
    form.sucio = true;
    pintarTallas();
  });
  $('#talla-nose').addEventListener('click', () => {
    form.tallas = {};
    form.sucio = true;
    pintarTallas();
  });

  // ---------------------------------------------------------------- nombre, marcas y descripción
  function revisarNombre() {
    const info = $('#nombre-info');
    const nombre = $('#nombre').value.trim();
    const m = nombre ? Catalogo.productoPorNombre(base.catalogo, nombre) : null;
    const p0 = form.producto;
    let texto = '';
    if (m && (!p0 || m.id !== p0.id)) {
      texto = p0 ? 'Este color pasará al modelo «' + m.nombre + '».' : 'Se agregará como un color nuevo de «' + m.nombre + '».';
      if (!form.original || m.id !== form.original.pid) {
        if (form.seccion !== m.seccion) { form.seccion = m.seccion; pintarSecciones(); }
        const d = $('#descripcion');
        if (!d.value.trim() || d.value === form.descAuto) { d.value = m.descripcion || ''; form.descAuto = d.value; }
      }
    } else if (p0 && nombre && Catalogo.normal(nombre) !== Catalogo.normal(p0.nombre) && p0.colores.length > 1) {
      texto = 'Este modelo tiene ' + p0.colores.length + ' colores: el nombre nuevo se verá en todos.';
    }
    info.textContent = texto;
    info.hidden = !texto;
    const modelo = m || p0;
    $('#descripcion-info').hidden = !(modelo && modelo.colores && modelo.colores.length > (m && m !== p0 ? 0 : 1));
  }

  function revisarMarcas() {
    const nombre = $('#nombre').value, color = $('#color').value, desc = $('#descripcion').value;
    const marcas = Catalogo.marcasEn(nombre + ' ' + color + ' ' + desc);
    const caja = $('#aviso-marca');
    caja.hidden = !marcas.length;
    const b = $('#usar-sin-marca');
    if (!marcas.length) { b.hidden = true; return; }
    if (Catalogo.marcasEn(nombre).length) {
      const sugerido = Catalogo.quitarMarcas(nombre) || GENERICO[form.seccion] || 'Zapatilla';
      b.dataset.sugerido = sugerido.length < 3 ? (GENERICO[form.seccion] || 'Zapatilla') + ' ' + sugerido : sugerido;
      b.textContent = 'Cambiar el nombre a «' + b.dataset.sugerido + '»';
    } else {
      delete b.dataset.sugerido;
      b.textContent = 'Quitar la marca del texto';
    }
    b.hidden = false;
  }
  $('#usar-sin-marca').addEventListener('click', e => {
    const s = e.currentTarget.dataset.sugerido;
    if (s) $('#nombre').value = s;
    $('#color').value = Catalogo.quitarMarcas($('#color').value);
    $('#descripcion').value = Catalogo.quitarMarcas($('#descripcion').value);
    form.sucio = true;
    revisarNombre();
    revisarMarcas();
    actualizarSugerencia();
  });

  function sugerencia() {
    const nombre = $('#nombre').value.trim(), color = $('#color').value.trim();
    if (!nombre) return '';
    return Catalogo.quitarMarcas(nombre) + (color ? ' en color ' + Catalogo.quitarMarcas(color).toLowerCase() : '') + '. ' + (FRASE[form.seccion] || 'Cómoda y fácil de combinar.');
  }
  function actualizarSugerencia() {
    const s = sugerencia();
    $('#descripcion').placeholder = s ? 'Sugerencia: ' + s : 'Ej: Blanca con detalles en rosa, suela alta.';
    $('#usar-sugerencia').hidden = !s;
  }
  $('#usar-sugerencia').addEventListener('click', () => {
    $('#descripcion').value = sugerencia();
    form.sucio = true;
    revisarMarcas();
  });
  $('#nombre').addEventListener('input', () => { revisarNombre(); revisarMarcas(); actualizarSugerencia(); $('[data-error="nombre"]').hidden = true; });
  $('#nombre').addEventListener('change', () => { revisarNombre(); actualizarSugerencia(); });
  $('#color').addEventListener('input', () => { revisarMarcas(); actualizarSugerencia(); $('[data-error="color"]').hidden = true; });
  $('#descripcion').addEventListener('input', revisarMarcas);
  $('#precio').addEventListener('input', () => { $('[data-error="precio"]').hidden = true; });

  function mostrarError(campo, texto) {
    const el = $('[data-error="' + campo + '"]');
    el.textContent = texto;
    el.hidden = false;
    return el;
  }

  // ---------------------------------------------------------------- guardar y eliminar
  $('#form').addEventListener('submit', e => {
    e.preventDefault();
    const errores = [];
    if (!form.fotos.length) errores.push(mostrarError('fotos', 'Agrega al menos una foto.'));
    else if (form.fotos.some(id => nuevas[id] && nuevas[id].procesando)) errores.push(mostrarError('fotos', 'Espera un momento: la foto se está preparando.'));
    if (!$('#nombre').value.trim()) errores.push(mostrarError('nombre', 'Escribe el nombre del modelo.'));
    if (!$('#color').value.trim()) errores.push(mostrarError('color', 'Escribe el color.'));
    if (!form.seccion) errores.push(mostrarError('seccion', 'Elige una sección.'));
    const precio = Catalogo.leerPrecio($('#precio').value);
    if (Number.isNaN(precio)) errores.push(mostrarError('precio', 'Escribe solo el número, por ejemplo 39.90'));
    if (errores.length) {
      errores[0].closest('.campo').scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const tallas = Object.keys(form.tallas).filter(t => form.tallas[t]).map(Number);
    const datos = {
      fotos: form.fotos.slice(),
      nombre: $('#nombre').value,
      color: $('#color').value,
      seccion: form.seccion,
      precio: precio,
      tallas: tallas,
      tallasAgotadas: tallas.filter(t => form.tallas[t] === 'agotada'),
      ultimoPar: $('#ultimo-par').checked,
      liquidacion: $('#liquidacion').checked,
      agotado: $('#agotado').checked,
      descripcion: $('#descripcion').value
    };
    ejecutar({ tipo: 'guardar', original: form.original, datos: datos }, { alTerminar: volverALista });
  });

  $('#boton-eliminar').addEventListener('click', () => {
    const p = form.producto;
    const c = Catalogo.colorPorId(p, form.original.cid);
    const ultimo = p.colores.length === 1;
    confirmar({
      texto: '¿Eliminar ' + p.nombre + ' ' + c.nombre + '?',
      detalle: 'Ya no se verá en la tienda.' + (ultimo ? '' : ' Los otros colores de este modelo se quedan.'),
      si: 'Sí, eliminar', no: 'No, volver', peligro: true
    }).then(si => {
      if (si) ejecutar({ tipo: 'eliminar', pid: form.original.pid, cid: form.original.cid }, { alTerminar: volverALista });
    });
  });

  // ================================================================ guardar en GitHub (un commit)
  async function bytesDeBlob(b) { return new Uint8Array(await b.arrayBuffer()); }

  async function fotosDesdeGrande(id) {
    let r = await fetch(gh.urlCruda(rutaFoto('grande', id)), { cache: 'no-store' }).catch(() => null);
    if (!r || !r.ok) r = await fetch('../' + rutaFoto('grande', id), { cache: 'no-store' }).catch(() => null);
    if (!r || !r.ok) return null;
    return FotosPanel.desdeGrande(await r.blob());
  }

  async function calcularCambios(b, cat) {
    const escribir = [], borrar = [];
    const textos = Object.assign({ 'productos.json': Catalogo.textoJson(cat) }, PaginaProducto.todas(cat.productos, A.urlBase));
    for (const ruta of Object.keys(textos)) {
      const bytes = GitHubTienda.bytesDeTexto(textos[ruta]);
      if (b.archivos[ruta] !== await GitHubTienda.shaGit(bytes)) escribir.push({ ruta: ruta, bytes: bytes });
    }
    Object.keys(b.archivos).forEach(ruta => { if (/^p\/[^/]+\.html$/.test(ruta) && !(ruta in textos)) borrar.push(ruta); });

    const usadas = Catalogo.fotosUsadas(cat);
    for (const id of Object.keys(usadas.todas)) {
      const n = nuevas[id];
      if (n && n.grande) {
        for (const tipo of ['grande', 'tarjeta', 'mini', 'og']) {
          if (!b.archivos[rutaFoto(tipo, id)]) escribir.push({ ruta: rutaFoto(tipo, id), bytes: await bytesDeBlob(n[tipo]) });
        }
      } else if (usadas.principales[id]) {
        const faltan = ['tarjeta', 'mini', 'og'].filter(t => !b.archivos[rutaFoto(t, id)]);
        if (faltan.length && b.archivos[rutaFoto('grande', id)]) {
          const hechas = await fotosDesdeGrande(id);
          if (hechas) for (const t of faltan) escribir.push({ ruta: rutaFoto(t, id), bytes: await bytesDeBlob(hechas[t]) });
        }
      }
    }
    Object.keys(b.archivos).forEach(ruta => {
      const m = ruta.match(/^img\/fotos\/(tarjeta|grande|mini|og)\/(.+)\.(webp|jpg)$/);
      if (m && !usadas.todas[m[2]]) borrar.push(ruta);
    });
    return { escribir: escribir, borrar: borrar };
  }

  function mensajeCommit(op, res) {
    if (op.tipo === 'agotado') return 'Panel: ' + res.titulo + (op.valor ? ' agotado' : ' con stock');
    if (op.tipo === 'eliminar') return 'Panel: elimina ' + res.titulo;
    return 'Panel: ' + (op.original ? 'cambia ' : 'agrega ') + res.titulo;
  }

  async function guardarOperacion(op) {
    for (let intento = 0; ; intento++) {
      const sha = await gh.shaDeRama();
      if (sha !== base.commit) base = await gh.leer(sha);   // alguien guardó antes: se trabaja sobre lo último
      const res = Catalogo.aplicar(base.catalogo, op);
      const cambios = await calcularCambios(base, res.catalogo);
      if (!cambios.escribir.length && !cambios.borrar.length) return res;
      try {
        const nuevo = await gh.guardar(base, cambios, mensajeCommit(op, res));
        const archivos = Object.assign({}, base.archivos);
        cambios.escribir.forEach(w => { archivos[w.ruta] = nuevo.shas[w.ruta]; });
        cambios.borrar.forEach(r => { delete archivos[r]; });
        base = { commit: nuevo.commit, arbol: nuevo.arbol, archivos: archivos, catalogo: res.catalogo };
        return res;
      } catch (e) {
        if (e.tipo === 'conflicto' && intento < 3) {           // la rama se movió: se vuelve a aplicar sobre lo último
          await new Promise(r => setTimeout(r, 1200 * (intento + 1)));
          continue;
        }
        throw e;
      }
    }
  }

  function ejecutar(op, opciones) {
    opciones = opciones || {};
    pendiente = { op: op, opciones: opciones };
    clearTimeout(temporizador);
    $('#aviso').hidden = true;
    mostrarEstado('guardando');
    if (navigator.onLine === false) {
      mostrarEstado('error', GitHubTienda.ErrorPanel('sinRed'));
      return;
    }
    guardarOperacion(op).then(res => {
      pendiente = null;
      pintarLista();
      if (opciones.alTerminar) opciones.alTerminar(res);
      if (opciones.rapido) { ocultarEstado(); avisoListo(); }
      else mostrarEstado('listo');
    }).catch(e => {
      if (window.console) console.warn('Panel:', e);
      if (e.tipo === 'yaNoExiste') {
        pendiente = null;
        pintarLista();
        if (form) volverALista();
      }
      mostrarEstado('error', e);
    });
  }

  // ================================================================ estado del guardado
  function mostrarEstado(modo, error) {
    const v = $('#estado');
    v.hidden = false;
    $('#estado-ruedita').hidden = modo !== 'guardando';
    $('#estado-icono').hidden = modo === 'guardando';
    $('#estado-botones').hidden = modo === 'guardando';
    const det = $('#estado-detalle');
    ['#estado-tienda', '#estado-reintentar', '#estado-clave'].forEach(s => { $(s).hidden = true; });
    if (modo === 'guardando') {
      $('#estado-texto').textContent = 'Guardando…';
      det.textContent = 'No cierres esta página.';
      det.hidden = false;
    } else if (modo === 'listo') {
      $('#estado-icono').textContent = '✅';
      $('#estado-texto').textContent = '¡Listo! En 1 minuto se ve en tu tienda 💕';
      det.hidden = true;
      $('#estado-tienda').hidden = false;
      $('#estado-cerrar').textContent = 'Seguir';
      $('#estado-cerrar').focus();
    } else {
      const tipo = (error && error.tipo && MENSAJES[error.tipo]) ? error.tipo : (error && error.tipo === undefined && error.message && /foto/i.test(error.message) ? 'foto' : 'servidor');
      const m = tipo === 'foto' ? [error.message, 'Prueba con otra foto.'] : MENSAJES[tipo];
      $('#estado-icono').textContent = tipo === 'sinRed' ? '📶' : '⚠️';
      $('#estado-texto').textContent = m[0];
      det.textContent = m[1];
      det.hidden = !m[1];
      $('#estado-reintentar').hidden = !pendiente || tipo === 'yaNoExiste' || tipo === 'clave' || tipo === 'datos';
      $('#estado-clave').hidden = !(tipo === 'clave' || tipo === 'permiso');
      $('#estado-cerrar').textContent = 'Cerrar';
      ($('#estado-reintentar').hidden ? $('#estado-cerrar') : $('#estado-reintentar')).focus();
    }
  }
  function ocultarEstado() { $('#estado').hidden = true; }
  $('#estado-cerrar').addEventListener('click', ocultarEstado);
  $('#estado-reintentar').addEventListener('click', () => { if (pendiente) ejecutar(pendiente.op, pendiente.opciones); });
  $('#estado-clave').addEventListener('click', () => {
    ocultarEstado();
    if (form) { form.sucio = false; form = null; }
    salir();
  });

  let temporizador = null;
  function avisoListo() {
    const a = $('#aviso');
    a.innerHTML = '<span>¡Listo! En 1 minuto se ve en tu tienda 💕</span><a href="../" target="_blank" rel="noopener">Ver tienda</a>';
    a.hidden = false;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { a.hidden = true; }, 6000);
  }

  // ================================================================ confirmar
  function confirmar(o) {
    return new Promise(listo => {
      const v = $('#confirmar');
      $('#confirmar-texto').textContent = o.texto;
      $('#confirmar-detalle').textContent = o.detalle || '';
      const si = $('#confirmar-si'), no = $('#confirmar-no');
      si.textContent = o.si || 'Sí';
      no.textContent = o.no || 'No';
      si.className = 'boton boton--ancho ' + (o.peligro === false ? 'boton--principal' : 'boton--peligro-lleno');
      v.hidden = false;
      no.focus();
      const fin = r => { v.hidden = true; si.onclick = no.onclick = null; listo(r); };
      si.onclick = () => fin(true);
      no.onclick = () => fin(false);
    });
  }

  iniciar();
})();
