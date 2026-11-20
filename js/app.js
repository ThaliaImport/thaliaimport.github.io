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
  var TALLAS_FILTRO = [34, 35, 36, 37, 38, 39, 40, 41];   // chips de "Mi talla"
  var TEMAS = ['a', 'b', 'c'];
  var MOVIMIENTO = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  // Con "reducir movimiento" no hay vuelos, escalonados ni crecimientos: todo aparece directo.
  function sinMovimiento() { return !!(MOVIMIENTO && MOVIMIENTO.matches); }

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
  // Código corto de cada color (#07): Thalia lo reconoce al instante en el chat.
  function codigoTexto(c) {
    var n = Number(c && c.codigo);
    return n > 0 ? '#' + (n < 10 ? '0' + n : String(n)) : '';
  }
  function nombreMensaje(p, c) { var k = codigoTexto(c); return (k ? k + ' ' : '') + nombreModelo(p, c); }
  function tallaTexto(talla) {
    if (talla === 'nose') return 'Talla por confirmar';
    return talla ? 'Talla ' + talla : 'Talla por elegir';
  }
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
    var modelo = nombreMensaje(p, c);
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
        modelo: nombreMensaje(it.p, it.c),
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
  // ------------------------------------------------------------------ tarjeta de pedido (una sola imagen)
  // Una imagen JPEG 1080×1350 con el logo, la foto (o las 2 del dúo) y, en letra grande,
  // código, modelo, color, talla y precio. Es lo que Thalia ve primero en el chat.
  var PEDIDO_ANCHO = 1080, PEDIDO_ALTO = 1350;
  var ROJO_LIQUIDACION = '#C8102E';

  function varCss(nombre, defecto) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
    return v || defecto;
  }
  function cargarImagen(src) {
    return new Promise(function (ok, mal) {
      var im = new Image();
      im.onload = function () { ok(im); };
      im.onerror = function () { mal(new Error('No cargó ' + src)); };
      im.src = src;
    });
  }
  // Foto cuadrada ya recortada (og/ JPEG); si falta, la grande.
  function fotoPedido(id) {
    return cargarImagen(fotoJpg(id)).catch(function () { return cargarImagen(foto('grande', id)); });
  }
  function esperarFuentes(familias) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var cargas = Promise.all(familias.map(function (f) { return document.fonts.load(f).catch(function () {}); }))
      .then(function () { return document.fonts.ready; });
    var tope = new Promise(function (r) { setTimeout(r, 3000); });
    return Promise.race([cargas, tope]);
  }
  function rectRedondo(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function fotoRecortada(g, im, x, y, lado, radio) {
    var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    var s = Math.min(w, h);
    g.save();
    g.shadowColor = 'rgba(0, 0, 0, 0.16)';
    g.shadowBlur = 40;
    g.shadowOffsetY = 14;
    rectRedondo(g, x, y, lado, lado, radio);
    g.fillStyle = '#FFFFFF';
    g.fill();
    g.restore();
    g.save();
    rectRedondo(g, x, y, lado, lado, radio);
    g.clip();
    g.imageSmoothingQuality = 'high';
    g.drawImage(im, (w - s) / 2, (h - s) / 2, s, s, x, y, lado, lado);
    g.restore();
  }
  // Escribe un texto centrado que entra en "ancho": achica la letra y, si hace falta, usa 2 líneas.
  function textoAjustado(g, texto, cx, y, ancho, fuente, tam, min, maxLineas) {
    var t = tam;
    function medir(s) { g.font = fuente(t); return g.measureText(s).width; }
    while (t > min && medir(texto) > ancho) t -= 2;
    var lineas = [texto];
    if (medir(texto) > ancho && maxLineas > 1) {
      t = tam;
      var palabras = texto.split(' ');
      while (t >= min) {
        lineas = [];
        var linea = '';
        palabras.forEach(function (p) {
          var prueba = linea ? linea + ' ' + p : p;
          if (medir(prueba) > ancho && linea) { lineas.push(linea); linea = p; } else linea = prueba;
        });
        lineas.push(linea);
        if (lineas.length <= maxLineas && lineas.every(function (l) { return medir(l) <= ancho; })) break;
        t -= 2;
      }
    }
    g.font = fuente(t);
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    var alto = Math.round(t * 1.12);
    lineas.slice(0, maxLineas).forEach(function (l, i) { g.fillText(l, cx, y + i * alto); });
    return y + (Math.min(lineas.length, maxLineas) - 1) * alto;
  }
  function pastilla(g, texto, cx, y, fuente, fondo, tinta, altoP, padX) {
    g.font = fuente;
    var w = g.measureText(texto).width + padX * 2;
    rectRedondo(g, cx - w / 2, y, w, altoP, altoP / 2);
    g.fillStyle = fondo;
    g.fill();
    g.fillStyle = tinta;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(texto, cx, y + altoP / 2 + 2);
    g.textBaseline = 'alphabetic';
    return w;
  }
  function cintaLiquidacion(g, x, y, escala) {
    var f = '800 ' + Math.round(30 * escala) + 'px ' + varCss('--fuente-texto', 'sans-serif');
    g.font = f;
    var w = g.measureText('LIQUIDACIÓN').width + 44 * escala, h = 58 * escala;
    g.save();
    g.shadowColor = 'rgba(0, 0, 0, 0.25)';
    g.shadowBlur = 16;
    rectRedondo(g, x, y, w, h, 14 * escala);
    g.fillStyle = ROJO_LIQUIDACION;
    g.fill();
    g.restore();
    g.fillStyle = '#FFFFFF';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText('LIQUIDACIÓN', x + 22 * escala, y + h / 2 + 2);
    g.textBaseline = 'alphabetic';
  }

  // Datos de un par en la imagen: pastilla con el código, modelo, color, talla y precio.
  // apilar = talla y precio uno debajo del otro (dúo). Devuelve dónde terminó.
  function datosPar(g, it, cx, y, ancho, escala, colores, fuentes, apilar) {
    var p = it.p, c = it.c;
    var precio = precioDe(p, c);
    var liq = !!c.liquidacion;
    var k = codigoTexto(c);
    if (k) {
      pastilla(g, k, cx, y, '700 ' + Math.round(40 * escala) + 'px ' + fuentes.texto, colores.cta, colores.ctaTinta, Math.round(64 * escala), 26 * escala);
      y += Math.round(64 * escala) + Math.round(66 * escala);
    } else {
      y += Math.round(50 * escala);
    }
    g.fillStyle = colores.tinta;
    y = textoAjustado(g, p.nombre, cx, y, ancho, function (t) { return fuentes.pesoTitulos + ' ' + t + 'px ' + fuentes.titulos; },
      Math.round(70 * escala), Math.round(40 * escala), apilar ? 2 : 1);
    y += Math.round(54 * escala);
    g.fillStyle = colores.tintaSuave;
    y = textoAjustado(g, c.nombre, cx, y, ancho, function (t) { return '500 ' + t + 'px ' + fuentes.texto; }, Math.round(40 * escala), Math.round(28 * escala), 1);
    y += Math.round(30 * escala);
    // Talla (pastilla suave) y precio
    var talla = tallaTexto(it.talla);
    var precioTxt = precio ? formatoPrecio(precio) : 'Consultar precio';
    var fTalla = '700 ' + Math.round(42 * escala) + 'px ' + fuentes.texto;
    var fPrecio = (precio ? '800 ' + Math.round(54 * escala) : '700 ' + Math.round(38 * escala)) + 'px ' + fuentes.texto;
    var altoP = Math.round(76 * escala);
    g.font = fTalla;
    var wT = g.measureText(talla).width + 56;
    g.font = fPrecio;
    var wP = g.measureText(precioTxt).width;
    if (!apilar && wT + 32 + wP <= ancho) {
      // En una sola fila: [Talla 38]  S/ 39.90
      var x0 = cx - (wT + 32 + wP) / 2;
      pastilla(g, talla, x0 + wT / 2, y, fTalla, colores.tonal, colores.tonalTinta, altoP, 28);
      g.font = fPrecio;
      g.fillStyle = liq ? ROJO_LIQUIDACION : (precio ? colores.acento : colores.tintaSuave);
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(precioTxt, x0 + wT + 32, y + altoP / 2 + 3);
      g.textBaseline = 'alphabetic';
      return y + altoP;
    }
    pastilla(g, talla, cx, y, fTalla, colores.tonal, colores.tonalTinta, altoP, 24 * escala);
    y += altoP + Math.round(64 * escala);
    g.font = fPrecio;
    g.fillStyle = liq ? ROJO_LIQUIDACION : (precio ? colores.acento : colores.tintaSuave);
    g.textAlign = 'center';
    g.fillText(precioTxt, cx, y);
    return y;
  }

  function dibujarPedido(items) {
    var tema = temaActual();
    var colores = {
      fondo: varCss('--fondo', '#FBF4EF'), superficie: varCss('--superficie', '#FFFFFF'),
      tinta: varCss('--tinta', '#3B2230'), tintaSuave: varCss('--tinta-suave', '#6E5562'),
      acento: varCss('--acento-tinta', '#96506A'), cta: varCss('--cta', '#3B2230'), ctaTinta: varCss('--cta-tinta', '#FBF4EF'),
      tonal: varCss('--tonal', '#F3DCE2'), tonalTinta: varCss('--tonal-tinta', '#3B2230'), rosa: varCss('--acento-2', '#E4A5B5')
    };
    var fuentes = {
      titulos: varCss('--fuente-titulos', 'Georgia, serif'), texto: varCss('--fuente-texto', 'sans-serif'),
      pesoTitulos: varCss('--peso-titulos', '700')
    };
    var ratio = parseFloat(varCss('--logo-ratio', '3.9')) || 3.9;
    return Promise.all([
      esperarFuentes([fuentes.pesoTitulos + ' 60px ' + fuentes.titulos, '500 40px ' + fuentes.texto, '700 40px ' + fuentes.texto, '800 40px ' + fuentes.texto]),
      cargarImagen('img/logo/logo-' + tema + '.svg').catch(function () { return null; }),
      Promise.all(items.map(function (it) { return fotoPedido(it.c.fotos[0]); }))
    ]).then(function (r) {
      var logo = r[1], fotos = r[2];
      var lienzo = document.createElement('canvas');
      lienzo.width = PEDIDO_ANCHO;
      lienzo.height = PEDIDO_ALTO;
      var g = lienzo.getContext('2d');
      var W = PEDIDO_ANCHO, H = PEDIDO_ALTO, duo = items.length > 1;
      // Fondo con un arco suave del color del tema
      g.fillStyle = colores.fondo;
      g.fillRect(0, 0, W, H);
      g.fillStyle = colores.tonal;
      g.globalAlpha = 0.7;
      g.beginPath();
      g.ellipse(W / 2, -260, W * 0.95, 560, 0, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
      // Logo
      var altoLogo = duo ? 92 : 96;
      if (logo) g.drawImage(logo, (W - altoLogo * ratio) / 2, 44, altoLogo * ratio, altoLogo);
      // Rótulo
      g.fillStyle = colores.acento;
      g.font = '700 30px ' + fuentes.texto;
      g.textAlign = 'center';
      if ('letterSpacing' in g) g.letterSpacing = '6px';
      g.fillText(duo ? 'MI DÚO' : 'MI PEDIDO', W / 2, 186);
      if ('letterSpacing' in g) g.letterSpacing = '0px';

      if (!duo) {
        var lado = 740, x = (W - lado) / 2, y = 214;
        fotoRecortada(g, fotos[0], x, y, lado, 40);
        if (items[0].c.liquidacion) cintaLiquidacion(g, x + 26, y + 26, 1);
        datosPar(g, items[0], W / 2, y + lado - 32, W - 120, 1, colores, fuentes, false);
      } else {
        var ladoD = 480, gap = 40, x0 = (W - ladoD * 2 - gap) / 2, esc = 0.95;
        // Se mide el alto del texto en un lienzo aparte para centrar todo entre el rótulo y el pie.
        var prueba = document.createElement('canvas').getContext('2d');
        var altoTexto = Math.max.apply(null, items.map(function (it) {
          return datosPar(prueba, it, 0, 0, ladoD - 10, esc, colores, fuentes, true);
        }));
        var yD = Math.round(214 + Math.max(0, (H - 110 - 214) - (ladoD - 30 + altoTexto)) / 2);
        var fin = 0;
        items.forEach(function (it, i) {
          var xi = x0 + i * (ladoD + gap);
          fotoRecortada(g, fotos[i], xi, yD, ladoD, 32);
          if (it.c.liquidacion) cintaLiquidacion(g, xi + 18, yD + 18, 0.85);
          fin = Math.max(fin, datosPar(g, it, xi + ladoD / 2, yD + ladoD - 30, ladoD - 10, esc, colores, fuentes, true));
        });
        // Línea separadora entre los dos pares
        g.strokeStyle = colores.tonal;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(W / 2, yD + ladoD + 60);
        g.lineTo(W / 2, fin);
        g.stroke();
      }
      // Pie
      g.fillStyle = colores.tintaSuave;
      g.font = '500 28px ' + fuentes.texto;
      g.textAlign = 'center';
      g.fillText('Pedido desde la tienda web · Thalia Import', W / 2, H - 46);
      return new Promise(function (ok, mal) {
        lienzo.toBlob(function (b) { if (b) ok(b); else mal(new Error('canvas')); }, 'image/jpeg', 0.9);
      });
    });
  }

  var pedidos = {};
  function imagenPedido(items) {
    var firma = temaActual() + '|' + items.map(function (it) { return claveDe(it.p, it.c) + ':' + (it.talla || ''); }).join('+');
    if (!pedidos[firma]) {
      pedidos[firma] = dibujarPedido(items).then(function (blob) {
        var nombre = 'pedido-thalia-import-' + items.map(function (it) { return codigoTexto(it.c).replace('#', '') || it.c.id; }).join('-') + '.jpg';
        return new File([blob], nombre, { type: 'image/jpeg' });
      });
      pedidos[firma].catch(function () { delete pedidos[firma]; });
    }
    return pedidos[firma];
  }
  window.__imagenPedido = imagenPedido;   // para las pruebas automáticas

  // Botón principal "Enviar pedido con foto" (celular) o, si no se puede, el enlace de WhatsApp de siempre.
  function modoEnvio(botonFotos, nota, cta, textoNormal, conFoto) {
    botonFotos.hidden = !conFoto;
    if (nota) nota.hidden = !conFoto;
    cta.classList.toggle('boton--primario', !conFoto);
    cta.classList.toggle('boton--solo-texto', conFoto);
    var t = $('[data-texto-cta]', cta);
    if (t) t.innerHTML = conFoto ? 'Enviar solo texto' : textoNormal;
  }
  // Prepara la imagen antes del toque (compartir debe ocurrir en el mismo toque).
  function prepararBotonFotos(boton, items, alFallar) {
    if (!boton || boton.hidden) return;
    var marca = String(Date.now() + Math.random());
    boton.setAttribute('data-preparando', marca);
    boton._archivos = null;
    if (!items.length) { boton.disabled = false; boton.removeAttribute('aria-busy'); return; }
    boton.disabled = true;
    boton.setAttribute('aria-busy', 'true');
    imagenPedido(items).then(function (archivo) {
      if (boton.getAttribute('data-preparando') !== marca) return;
      boton._archivos = [archivo];
      boton.disabled = false;
      boton.removeAttribute('aria-busy');
    }).catch(function (e) {
      if (window.console) console.warn('No se pudo armar la imagen del pedido:', e);
      if (boton.getAttribute('data-preparando') === marca && alFallar) alFallar();
    });
  }
  function compartirConFotos(boton, texto, avisar) {
    var lista = boton._archivos || [];
    var datos = { files: lista, text: texto };
    try {
      if (navigator.canShare && !navigator.canShare(datos)) datos = { files: lista };
      navigator.share(datos).catch(function (err) {
        if (err && err.name === 'AbortError') return;
        avisar('No se pudo enviar la foto. Usa «Enviar solo texto», reina 💕');
      });
    } catch (e) {
      avisar('No se pudo enviar la foto. Usa «Enviar solo texto», reina 💕');
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

  // Línea de tallas de la tarjeta. Con "Mi talla" elegida: la talla va resaltada, o "Talla 37 · consulta".
  function lineaTallasHtml(p, c, talla) {
    if (estaAgotado(p, c)) return '';
    var tallas = tallasDe(p, c);
    if (!tallas) {
      return talla
        ? '<p class="tarjeta__tallas tarjeta__tallas--consulta">Talla ' + esc(talla) + ' · <span>consulta</span></p>'
        : '<p class="tarjeta__tallas">Consulta tallas</p>';
    }
    if (tallas.length === 1) return '';
    var partes = tallas.map(function (t) { return String(t) === String(talla) ? '<strong>' + t + '</strong>' : String(t); });
    return '<p class="tarjeta__tallas">Tallas ' + listaTexto(partes) + '</p>';
  }

  // ------------------------------------------------------------------ filtros (Mi talla + rápidos)
  var filtro = { talla: null, liquidacion: false, conPrecio: false, secciones: [] };

  function hayEnTalla(p, c, t) {
    if (estaAgotado(p, c)) return false;
    var tallas = tallasDe(p, c);
    if (!tallas) return true;   // "Consulta tallas": se muestra, con la nota "consulta"
    return tallas.indexOf(Number(t)) !== -1 && !tallaAgotada(c, t);
  }
  function pasaFiltro(p, c) {
    if (filtro.secciones.length && filtro.secciones.indexOf(p.seccion) === -1) return false;
    if (filtro.liquidacion && !(c.liquidacion && !estaAgotado(p, c))) return false;
    if (filtro.conPrecio && !precioDe(p, c)) return false;
    if (filtro.talla && !hayEnTalla(p, c, filtro.talla)) return false;
    return true;
  }
  function hayFiltros() { return !!(filtro.talla || filtro.liquidacion || filtro.conPrecio || filtro.secciones.length); }

  function pintarFiltros() {
    var lista = $('#filtros-lista');
    if (!lista) return;
    var secciones = seccionesConProductos().map(function (s) {
      return '<button type="button" class="chip" data-filtro="seccion" data-valor="' + esc(s.id) + '" aria-pressed="false">' + esc(s.titulo) + '</button>';
    }).join('');
    var hayLiq = PRODUCTOS.some(function (p) { return (p.colores || []).some(function (c) { return c.liquidacion && !estaAgotado(p, c); }); });
    lista.innerHTML =
      '<a class="chip chip--talla" href="#mi-talla" data-ir-talla><svg class="icono" aria-hidden="true"><use href="#i-pie"/></svg><span id="chip-talla-texto">Mi talla</span></a>' +
      '<span class="filtros__sep" aria-hidden="true"></span>' +
      (hayLiq ? '<button type="button" class="chip chip--liquidacion" data-filtro="liquidacion" aria-pressed="false"><span class="chip__punto" aria-hidden="true"></span>Liquidación</button>' : '') +
      '<button type="button" class="chip" data-filtro="conPrecio" aria-pressed="false">Con precio</button>' +
      '<span class="filtros__sep" aria-hidden="true"></span>' +
      secciones +
      '<button type="button" class="chip chip--quitar" data-quitar-filtros hidden><svg class="icono" aria-hidden="true"><use href="#i-cerrar"/></svg>Quitar</button>';
    var chips = $('#mi-talla-chips');
    chips.innerHTML = '<button type="button" class="talla-chip talla-chip--todas" data-talla="" aria-pressed="true">Todas</button>' +
      TALLAS_FILTRO.map(function (t) {
        return '<button type="button" class="talla-chip" data-talla="' + t + '" aria-pressed="false"><span class="oculto">Talla </span>' + t + '</button>';
      }).join('') +
      '<a class="talla-chip talla-chip--guia" href="#tallas"><svg class="icono" aria-hidden="true"><use href="#i-regla"/></svg><span>Guía</span><span class="oculto"> de tallas</span></a>';
    $('#mi-talla').hidden = false;
  }

  function aplicarFiltros() {
    var total = 0;
    $$('.seccion-catalogo').forEach(function (sec) {
      var visibles = 0;
      $$('.tarjeta', sec).forEach(function (li) {
        var x = desdeClave(li.getAttribute('data-clave'));
        if (!x) return;
        var pasa = pasaFiltro(x.p, x.c);
        li.hidden = !pasa;
        if (pasa) visibles++;
        var viejo = $('.tarjeta__tallas', li);
        var nuevo = lineaTallasHtml(x.p, x.c, filtro.talla);
        if (viejo && viejo.outerHTML === nuevo) return;
        if (viejo) viejo.parentNode.removeChild(viejo);
        if (nuevo) $('.tarjeta__precio', li).insertAdjacentHTML('afterend', nuevo);
      });
      sec.hidden = visibles === 0;
      total += visibles;
    });
    // Estado de los botones
    $$('#mi-talla-chips [data-talla]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-talla') || '') === String(filtro.talla || '') ? 'true' : 'false');
    });
    $$('#filtros-lista [data-filtro]').forEach(function (b) {
      var tipo = b.getAttribute('data-filtro');
      var activo = tipo === 'seccion' ? filtro.secciones.indexOf(b.getAttribute('data-valor')) !== -1 : !!filtro[tipo];
      b.setAttribute('aria-pressed', activo ? 'true' : 'false');
    });
    var conFiltros = hayFiltros();
    var textoTalla = filtro.talla ? 'Talla ' + filtro.talla : 'Mi talla';
    var chipTalla = $('#chip-talla-texto');
    if (chipTalla) {
      chipTalla.textContent = textoTalla;
      chipTalla.parentNode.classList.toggle('chip--activo', !!filtro.talla);
    }
    var appTalla = $('#app-talla-texto');
    if (appTalla) appTalla.textContent = textoTalla;
    $$('[data-quitar-filtros], #quitar-filtros').forEach(function (b) { b.hidden = !conFiltros; });
    var cuenta = $('#resultado-cuenta');
    if (cuenta) {
      cuenta.innerHTML = '<strong>' + total + '</strong> ' + (total === 1 ? 'zapatilla' : 'zapatillas') +
        (filtro.talla ? ' en talla ' + esc(filtro.talla) : '');
    }
    // Sin resultados
    var vacio = $('#catalogo-vacio');
    if (vacio) {
      vacio.hidden = total > 0;
      if (!total) {
        var texto = filtro.talla
          ? plantilla(M.tallaBuscada || 'Hola Thalia Import 💕 Busco zapatillas en talla *{talla}*. ¿Me avisas cuando lleguen, preciosa?', { talla: filtro.talla })
          : (M.general || 'Hola Thalia Import 💕');
        $('#catalogo-vacio-titulo').textContent = filtro.talla ? 'No hay en tu talla por ahora 💕' : 'No hay modelos con estos filtros 💕';
        $('#catalogo-vacio-texto').textContent = filtro.talla ? 'Escríbenos y te avisamos cuando lleguen.' : 'Escríbenos y te ayudamos a encontrar tu par.';
        $('#catalogo-vacio-wa').href = urlWhatsApp(texto);
      }
    }
    document.documentElement.classList.toggle('con-filtros', conFiltros);
  }

  // Después de cambiar un filtro: si la clienta ya bajó, sube hasta el contador para que vea el resultado.
  function mostrarResultado() {
    var linea = $('.resultado');
    var barraF = $('#filtros');
    if (!linea || !barraF) return;
    var tope = barraF.getBoundingClientRect().bottom;
    var r = linea.getBoundingClientRect();
    if (r.top >= tope - 1) return;   // ya está a la vista (o más abajo, justo antes de las tarjetas)
    var destino = window.pageYOffset + r.top - barraF.offsetHeight - 12;
    try { window.scrollTo({ top: destino, behavior: sinMovimiento() ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, destino); }
  }

  function elegirTalla(t) {
    filtro.talla = t ? String(t) : null;
    if (filtro.talla) guardar('miTalla', filtro.talla);
    else { try { localStorage.removeItem('thalia.miTalla'); } catch (e) { /* nada */ } }
    aplicarFiltros();
  }
  function quitarFiltros() {
    filtro.liquidacion = false;
    filtro.conPrecio = false;
    filtro.secciones = [];
    elegirTalla(null);
  }
  function irAMiTalla() {
    var caja = $('#mi-talla');
    if (!caja) return;
    var barraF = $('#filtros');
    var destino = window.pageYOffset + caja.getBoundingClientRect().top - (barraF ? barraF.offsetHeight : 0) - 10;
    try { window.scrollTo({ top: destino, behavior: sinMovimiento() ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, destino); }
    var b = $('#mi-talla-chips [aria-pressed="true"]');
    if (b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }
  }

  function iniciarFiltros() {
    var guardada = leer('miTalla');
    if (guardada && TALLAS_FILTRO.indexOf(Number(guardada)) !== -1) filtro.talla = String(Number(guardada));
    pintarFiltros();
    aplicarFiltros();
    $('#mi-talla-chips').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-talla]');
      if (!b) return;
      var t = b.getAttribute('data-talla');
      elegirTalla(t && t !== filtro.talla ? t : null);
      mostrarResultado();
    });
    $('#filtros-lista').addEventListener('click', function (e) {
      if (e.target.closest('[data-ir-talla]')) { e.preventDefault(); irAMiTalla(); return; }
      if (e.target.closest('[data-quitar-filtros]')) { quitarFiltros(); mostrarResultado(); return; }
      var b = e.target.closest('button[data-filtro]');
      if (!b) return;
      var tipo = b.getAttribute('data-filtro');
      if (tipo === 'seccion') {
        var v = b.getAttribute('data-valor');
        var i = filtro.secciones.indexOf(v);
        if (i === -1) filtro.secciones.push(v); else filtro.secciones.splice(i, 1);
      } else {
        filtro[tipo] = !filtro[tipo];
      }
      aplicarFiltros();
      mostrarResultado();
    });
    $('#quitar-filtros').addEventListener('click', quitarFiltros);
  }

  // ------------------------------------------------------------------ entrada escalonada de tarjetas
  // Aparecen al bajar (opacidad + desplazamiento), una sola vez. Sin IntersectionObserver o con
  // "reducir movimiento", aparecen directo.
  function iniciarEntrada() {
    if (sinMovimiento() || !('IntersectionObserver' in window)) return;
    var tarjetas = $$('.tarjeta');
    var obs = new IntersectionObserver(function (entradas) {
      var n = 0;
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        var li = en.target;
        obs.unobserve(li);
        var retraso = Math.min(n++, 5) * 70;
        li.style.setProperty('--retraso', retraso + 'ms');
        li.classList.add('tarjeta--vista');
        setTimeout(function () {
          li.classList.remove('tarjeta--entra', 'tarjeta--vista');
          li.style.removeProperty('--retraso');
        }, 650 + retraso);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    tarjetas.forEach(function (li) {
      var r = li.getBoundingClientRect();
      if (r.bottom < 0) return;   // ya pasó (por ejemplo al volver con el botón atrás)
      li.classList.add('tarjeta--entra');
      obs.observe(li);
    });
  }

  // ------------------------------------------------------------------ carrusel de liquidación
  function pintarLiquidacion() {
    var caja = $('#liquidacion');
    if (!caja) return;
    var items = [];
    PRODUCTOS.forEach(function (p) {
      (p.colores || []).forEach(function (c) {
        if (c.liquidacion && !estaAgotado(p, c) && c.fotos && c.fotos.length) items.push({ p: p, c: c });
      });
    });
    if (!items.length) { caja.hidden = true; return; }
    var pista = $('#liquidacion-pista');
    pista.innerHTML = items.map(function (it) {
      var p = it.p, c = it.c;
      var precio = precioDe(p, c);
      var u = tallaUnica(p, c);
      var tallas = tallasDe(p, c);
      var talla = u ? 'Solo talla ' + u : (tallas ? 'Tallas ' + listaTexto(tallas) : 'Consulta tallas');
      return '<li class="liquidacion__item">' +
        '<button type="button" class="liq-tarjeta" data-producto="' + esc(p.id) + '" data-color="' + esc(c.id) + '" data-clave="' + esc(claveDe(p, c)) + '">' +
          '<span class="liq-tarjeta__foto"><img src="' + foto('tarjeta', c.fotos[0]) + '" alt="" width="600" height="600" loading="lazy" decoding="async">' +
            '<span class="etiqueta etiqueta--liquidacion">Liquidación</span></span>' +
          '<span class="liq-tarjeta__cuerpo">' +
            '<span class="liq-tarjeta__nombre">' + esc(p.nombre) + '</span>' +
            '<span class="liq-tarjeta__color">' + esc(c.nombre) + (codigoTexto(c) ? ' <span class="tarjeta__codigo">' + codigoTexto(c) + '</span>' : '') + '</span>' +
            '<span class="liq-tarjeta__precio">' + (precio ? esc(formatoPrecio(precio)) : 'Consultar precio') + '</span>' +
            '<span class="liq-tarjeta__talla">' + esc(talla) + '</span>' +
          '</span>' +
          '<span class="oculto">. Ver fotos y detalles</span>' +
        '</button></li>';
    }).join('');
    caja.hidden = false;
    var flechas = $$('[data-liq]', caja);
    function marcarFlechas() {
      var max = pista.scrollWidth - pista.clientWidth;
      caja.classList.toggle('liquidacion--desliza', max > 4);
      flechas.forEach(function (b) {
        var dir = Number(b.getAttribute('data-liq'));
        b.disabled = dir < 0 ? pista.scrollLeft <= 4 : pista.scrollLeft >= max - 4;
      });
    }
    flechas.forEach(function (b) {
      b.addEventListener('click', function () {
        var paso = Math.max(pista.clientWidth * 0.8, 200) * Number(b.getAttribute('data-liq'));
        try { pista.scrollBy({ left: paso, behavior: sinMovimiento() ? 'auto' : 'smooth' }); } catch (e) { pista.scrollLeft += paso; }
      });
    });
    var pendiente = false;
    pista.addEventListener('scroll', function () {
      if (pendiente) return;
      pendiente = true;
      window.requestAnimationFrame(function () { pendiente = false; marcarFlechas(); });
    }, { passive: true });
    window.addEventListener('resize', marcarFlechas);
    marcarFlechas();
  }

  function tarjetaHtml(p, c) {
    var agotada = estaAgotado(p, c);
    var k = claveDe(p, c);
    var principal = (c.fotos && c.fotos[0]) || '';
    var etiqueta = etiquetaDe(p, c);
    var precio = precioDe(p, c);
    var unica = tallaUnica(p, c);
    var lineaTallas = lineaTallasHtml(p, c, filtro.talla);
    var nombreCompleto = p.nombre + ', ' + c.nombre;
    var pedir;
    if (agotada) {
      pedir = '<a class="tarjeta__pedir" href="' + esc(urlWhatsApp(mensajeProducto(p, c))) + '" target="_blank" rel="noopener">Avísame cuando llegue<span class="oculto">: ' + esc(nombreCompleto) + '</span></a>';
    } else if (unica && !tallaAgotada(c, unica) && !soportaFotos) {
      pedir = '<a class="tarjeta__pedir" href="' + esc(urlWhatsApp(mensajeProducto(p, c, String(unica)))) + '" target="_blank" rel="noopener"><svg class="icono" aria-hidden="true"><use href="#i-wa"/></svg>Pedir por WhatsApp<span class="oculto">: ' + esc(nombreCompleto) + ', talla ' + unica + '</span></a>';
    } else {
      pedir = '<button type="button" class="tarjeta__pedir" data-producto="' + esc(p.id) + '" data-color="' + esc(c.id) + '"><svg class="icono" aria-hidden="true"><use href="#i-wa"/></svg>Pedir por WhatsApp<span class="oculto">: ' + esc(nombreCompleto) + (unica ? ', talla ' + unica : ' (elige tu talla)') + '</span></button>';
    }
    return '<li class="tarjeta' + (agotada ? ' tarjeta--agotada' : '') + '" data-clave="' + esc(k) + '">' +
      '<div class="tarjeta__foto">' +
        '<img src="' + foto('tarjeta', principal) + '" alt="' + esc(p.nombre + ', color ' + c.nombre) + '" width="600" height="600" loading="lazy" decoding="async">' +
        (c.liquidacion && !agotada ? '<span class="etiqueta etiqueta--liquidacion">Liquidación</span>' : '') +
        (etiqueta ? '<span class="etiqueta ' + etiqueta.clase + '">' + esc(etiqueta.texto) + '</span>' : '') +
        (agotada ? '' : '<button type="button" class="tarjeta__duo" data-duo="' + esc(k) + '" data-nombre="' + esc(nombreCompleto) + '" aria-pressed="false">' +
          '<svg class="icono icono--mas" aria-hidden="true"><use href="#i-mas"/></svg><svg class="icono icono--check" aria-hidden="true"><use href="#i-check"/></svg>' +
          '<span aria-hidden="true">Dúo</span><span class="oculto">Agregar ' + esc(nombreCompleto) + ' a mi dúo</span></button>') +
      '</div>' +
      '<div class="tarjeta__cuerpo">' +
        '<div class="tarjeta__datos">' +
          '<h3 class="tarjeta__nombre"><button type="button" class="tarjeta__ver" data-producto="' + esc(p.id) + '" data-color="' + esc(c.id) + '">' + esc(p.nombre) + '<span class="oculto">, ' + esc(c.nombre) + '. Ver fotos y detalles</span></button></h3>' +
          '<p class="tarjeta__color">' + esc(c.nombre) + (codigoTexto(c) ? ' <span class="tarjeta__codigo" title="Código del modelo">' + codigoTexto(c) + '</span>' : '') + '</p>' +
          '<p class="tarjeta__precio' + (precio ? '' : ' tarjeta__precio--consultar') + (c.liquidacion && !agotada ? ' tarjeta__precio--liquidacion' : '') + '">' + (precio ? esc(formatoPrecio(precio)) : 'Consultar precio') + '</p>' +
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
    html += '<div class="contenedor catalogo__vacio" id="catalogo-vacio" hidden>' +
      '<div class="vacio">' +
        '<span class="vacio__icono" aria-hidden="true"><svg class="icono"><use href="#i-pie"/></svg></span>' +
        '<p class="vacio__titulo" id="catalogo-vacio-titulo">No hay en tu talla por ahora 💕</p>' +
        '<p class="vacio__texto" id="catalogo-vacio-texto">Escríbenos y te avisamos cuando lleguen.</p>' +
        '<div class="vacio__botones">' +
          '<a class="boton boton--primario" id="catalogo-vacio-wa" href="#" target="_blank" rel="noopener"><svg class="icono" aria-hidden="true"><use href="#i-wa"/></svg>Escríbenos por WhatsApp</a>' +
          '<button type="button" class="boton boton--borde" data-quitar-filtros>Ver todas</button>' +
        '</div>' +
      '</div>' +
    '</div>';
    cont.insertAdjacentHTML('beforeend', html);
    var vacio = $('#catalogo-vacio [data-quitar-filtros]');
    if (vacio) vacio.addEventListener('click', function () { quitarFiltros(); mostrarResultado(); });
  }

  // ------------------------------------------------------------------ hojas (diálogos) + botón atrás
  var dlgFicha = $('#ficha');
  var soportaDialogo = !!(dlgFicha && typeof dlgFicha.showModal === 'function');
  var abridor = null;

  function estaAbierto(d) { return !!(d && (d.open || d.hasAttribute('open'))); }
  function abrirModal(d, sinAnimacionCss) {
    abridor = document.activeElement;
    if (!estaAbierto(d)) {
      // Si la ficha "crece" desde la tarjeta, la animación de la hoja (CSS) se apaga para no chocar.
      d.classList.toggle('hoja--crece', !!sinAnimacionCss);
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
    if (!estaAbierto(d) || cerrando) return;
    if (d === dlgFicha && encogerFicha(function () { cerrarModalYa(d); })) return;
    cerrarModalYa(d);
  }
  function cerrarModalYa(d) {
    if (!estaAbierto(d)) return;
    if (soportaDialogo && d.open) d.close();
    else { d.removeAttribute('open'); d.classList.remove('hoja--falsa'); }
    document.documentElement.classList.remove('con-hoja');
    if (abridor && document.contains(abridor) && typeof abridor.focus === 'function') {
      try { abridor.focus({ preventScroll: true }); } catch (e) { abridor.focus(); }
    }
  }
  // ---- La ficha "crece" desde la foto de la tarjeta (View Transitions o, si no hay, escala/opacidad)
  var fichaOrigen = null;   // foto de la tarjeta que abrió la ficha
  var cerrando = false;
  function esperarImagen(im, ms) {
    return new Promise(function (ok) {
      var listo = false;
      var fin = function () { if (!listo) { listo = true; ok(); } };
      setTimeout(fin, ms);
      if (!im) fin();
      else if (im.decode) im.decode().then(fin, fin);
      else if (im.complete) fin();
      else im.addEventListener('load', fin);
    });
  }
  function nombrarFoto(el, si) { if (el) el.style.viewTransitionName = si ? 'foto-ficha' : ''; }
  function primerItemGaleria() { return $('#ficha-galeria .galeria__item'); }
  function abrirFichaDesde(img, pid, cid) {
    fichaOrigen = img || null;
    if (!img || sinMovimiento() || estaAbierto(dlgFicha)) { abrirFicha(pid, cid); return; }
    if (typeof document.startViewTransition === 'function') {
      var vt;
      nombrarFoto(img, true);
      try {
        vt = document.startViewTransition(function () {
          nombrarFoto(img, false);
          abrirFicha(pid, cid, true, true);
          nombrarFoto(primerItemGaleria(), true);
          return esperarImagen($('#ficha-galeria .galeria__previa') || $('#ficha-galeria .galeria__foto'), 160);
        });
      } catch (e) {
        nombrarFoto(img, false);
        if (!estaAbierto(dlgFicha)) abrirFicha(pid, cid);
        return;
      }
      var limpiar = function () { nombrarFoto(img, false); nombrarFoto(primerItemGaleria(), false); };
      vt.finished.then(limpiar, limpiar);
      return;
    }
    var desde = img.getBoundingClientRect();
    abrirFicha(pid, cid, true, true);
    crecerDesde(dlgFicha, desde);
  }
  // Respaldo sin View Transitions: la hoja sale escalada desde donde estaba la foto.
  function crecerDesde(d, r0) {
    if (typeof d.animate !== 'function') return;
    var r = d.getBoundingClientRect();
    if (!r.width || !r.height || !r0.width) return;
    var s = Math.max(0.2, Math.min(1, r0.width / r.width));
    var dx = (r0.left + r0.width / 2) - (r.left + r.width / 2);
    var dy = (r0.top + r0.height / 2) - (r.top + r.height / 2);
    d.animate([
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')', opacity: 0 },
      { transform: 'none', opacity: 1 }
    ], { duration: 340, easing: 'cubic-bezier(.2, .8, .2, 1)' });
  }
  // Al cerrar, si la tarjeta sigue a la vista, la foto vuelve a su lugar.
  function encogerFicha(cerrar) {
    var img = fichaOrigen;
    if (!img || sinMovimiento() || typeof document.startViewTransition !== 'function') return false;
    if (!document.contains(img) || img.closest('[hidden]')) return false;
    var r = img.getBoundingClientRect();
    var item = primerItemGaleria();
    if (!item || !r.width || r.bottom < 0 || r.top > window.innerHeight || indiceGaleria() !== 0) return false;
    nombrarFoto(item, true);
    var vt;
    cerrando = true;
    try {
      vt = document.startViewTransition(function () {
        cerrando = false;
        nombrarFoto(item, false);
        cerrar();
        nombrarFoto(img, true);
      });
    } catch (e) {
      cerrando = false;
      nombrarFoto(item, false);
      return false;
    }
    var limpiar = function () { cerrando = false; nombrarFoto(img, false); nombrarFoto(item, false); };
    vt.finished.then(limpiar, limpiar);
    return true;
  }

  function mostrarHoja(d, hash, crece) {
    abrirModal(d, crece);
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

  // Talla que la ficha deja marcada: la única que hay, si no "Mi talla" (filtro), si no la última elegida.
  function tallaInicial(p, c) {
    var u = tallaUnica(p, c);
    if (u && !tallaAgotada(c, u)) return String(u);
    var prefs = [leer('miTalla'), leer('talla')];
    for (var i = 0; i < prefs.length; i++) {
      var pref = prefs[i];
      if (pref && opcionesTalla(p, c).indexOf(Number(pref)) !== -1 && !tallaAgotada(c, pref)) return String(pref);
    }
    return null;
  }

  function abrirFicha(pid, cid, conHistoria, crece) {
    var p = productoPorId(pid);
    if (!p || !p.colores || !p.colores.length) return;
    var c = colorPorId(p, cid) || p.colores[0];
    ficha.p = p;
    ficha.c = c;
    ficha.talla = estaAgotado(p, c) ? null : tallaInicial(p, c);
    pintarFicha();
    var hash = '#producto=' + encodeURIComponent(p.id) + '&color=' + encodeURIComponent(c.id);
    if (conHistoria === false) abrirModal(dlgFicha);
    else mostrarHoja(dlgFicha, hash, crece);
  }

  function pintarFicha() {
    var p = ficha.p, c = ficha.c;
    var precio = precioDe(p, c);
    var etiqueta = etiquetaDe(p, c);
    $('#ficha-titulo').textContent = p.nombre;
    var codigo = codigoTexto(c);
    $('#ficha-codigo').textContent = codigo ? 'Código ' + codigo : '';
    $('#ficha-codigo').hidden = !codigo;
    $('#ficha-desc').textContent = p.descripcion || '';
    var precioEl = $('#ficha-precio');
    precioEl.textContent = precio ? formatoPrecio(precio) : 'Consultar precio';
    precioEl.classList.toggle('ficha__precio--consultar', !precio);
    $('#ficha-etiquetas').innerHTML = (c.liquidacion && !estaAgotado(p, c) ? '<span class="etiqueta etiqueta--liquidacion">Liquidación</span>' : '') +
      (etiqueta ? '<span class="etiqueta ' + etiqueta.clase + '">' + esc(etiqueta.texto) + '</span>' : '');
    pintarColoresFicha();
    pintarTallasFicha();
    pintarGaleria();
    ocultarAviso('#ficha-aviso');
    actualizarCta();
    actualizarBotonDuoFicha();
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
      // La primera foto lleva debajo la de la tarjeta (ya está en caché): se ve al instante con datos lentos.
      var previa = i ? '' : '<img class="galeria__previa" src="' + foto('tarjeta', id) + '" alt="" aria-hidden="true">';
      return '<div class="galeria__item">' + previa + '<img class="galeria__foto" src="' + foto('grande', id) + '" alt="' + esc(alt) + '" decoding="async"' + (i ? ' loading="lazy"' : '') + '></div>';
    }).join('');
    var primera = $('.galeria__foto', g);
    var quitarPrevia = function () { var pv = $('.galeria__previa', g); if (pv) pv.parentNode.removeChild(pv); };
    if (primera) {
      if (primera.complete && primera.naturalWidth) quitarPrevia();
      else { primera.addEventListener('load', quitarPrevia); }
    }
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
    var conFoto = soportaFotos && !agot;
    var textoNormal = agot ? 'Avísame cuando llegue' : 'Pedir por WhatsApp';
    var volverATexto = function () { modoEnvio($('#ficha-fotos'), $('#ficha-fotos-nota'), cta, textoNormal, false); };
    modoEnvio($('#ficha-fotos'), $('#ficha-fotos-nota'), cta, textoNormal, conFoto);
    if (conFoto) prepararBotonFotos($('#ficha-fotos'), [{ p: p, c: c, talla: ficha.talla }], volverATexto);
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
    minimizarDuo(false);
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
    var precio = precioDe(p, c);
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
      '<span class="par-duo__foto"><img src="' + foto('tarjeta', c.fotos[0]) + '" alt="" width="600" height="600"></span>' +
      '<button type="button" class="par-duo__quitar" data-quitar="' + i + '" aria-label="Quitar ' + esc(nombre) + ' de mi dúo"><svg class="icono" aria-hidden="true"><use href="#i-cerrar"/></svg></button>' +
      '<span class="par-duo__info">' +
        (codigoTexto(c) ? '<span class="par-duo__codigo">' + codigoTexto(c) + '</span>' : '') +
        '<span class="par-duo__nombre">' + esc(p.nombre) + '</span>' +
        '<span class="par-duo__color">' + esc(c.nombre) + '</span>' +
        '<span class="par-duo__precio' + (c.liquidacion ? ' par-duo__precio--liquidacion' : '') + '">' + (precio ? esc(formatoPrecio(precio)) : 'Consultar precio') + '</span>' +
        talla +
      '</span>' +
    '</div>';
  }

  function pintarDuo() {
    if (!barra) return;
    var lista = $('#barra-duo-pares');
    if (!duo.length) {
      barra.hidden = true;
      minimizarDuo(false);
      document.documentElement.classList.remove('con-duo');
    } else {
      barra.hidden = false;
      document.documentElement.classList.add('con-duo');
      lista.innerHTML = duo.map(parHtml).join('') +
        (duo.length < 2 ? '<div class="par-duo par-duo--vacio" aria-hidden="true"><span class="par-duo__foto"><svg class="icono"><use href="#i-mas"/></svg></span><span class="par-duo__info"><span class="par-duo__nombre">Elige otro par 👟</span><span class="par-duo__talla">Toca «+ Dúo» en otro modelo</span></span></div>' : '');
    }
    actualizarCtaDuo();
    marcarTarjetas();
    actualizarBotonDuoFicha();
    actualizarAppDuo();
    medirBarra();
  }

  // ---- Barra del dúo minimizada (solo celular: se vuelve a abrir con "Mi dúo" de la barra de abajo)
  function esCelular() { return !!(window.matchMedia && window.matchMedia('(max-width: 719px)').matches); }
  function minimizarDuo(si) {
    if (!barra) return;
    var antes = barra.classList.contains('barra-duo--minimizada');
    if (antes === !!si) return;
    barra.classList.toggle('barra-duo--minimizada', !!si);
    document.documentElement.classList.toggle('duo-minimizado', !!si);
    actualizarAppDuo();
    medirBarra();
  }
  function actualizarAppDuo() {
    var n = duo.length;
    var insignia = $('#app-duo-cuenta');
    if (insignia) { insignia.textContent = String(n); insignia.hidden = !n; }
    var oculto = $('#app-duo-oculto');
    if (oculto) oculto.textContent = n ? ': ' + n + (n === 1 ? ' par' : ' pares') + ' de 2' : ': sin pares todavía';
    var b = $('[data-app="duo"]');
    if (b) b.setAttribute('aria-expanded', n && !barra.classList.contains('barra-duo--minimizada') ? 'true' : 'false');
  }
  function avisoApp(texto) {
    var el = $('#aviso-app');
    if (!el) return;
    el.textContent = texto;
    el.classList.add('visible');
    clearTimeout(avisoApp.t);
    avisoApp.t = setTimeout(function () { el.classList.remove('visible'); }, 3600);
  }
  // "Mi dúo": abre la barra (si estaba minimizada) o la enfoca con un pequeño salto.
  function abrirMiDuo() {
    if (!duo.length) {
      avisoApp('Toca «+ Dúo» en 2 modelos que te gusten 💕');
      var cat = $('.seccion-catalogo:not([hidden])');
      if (cat) {
        var destino = window.pageYOffset + cat.getBoundingClientRect().top - ($('#filtros') ? $('#filtros').offsetHeight : 0) - 8;
        try { window.scrollTo({ top: destino, behavior: sinMovimiento() ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, destino); }
      }
      return;
    }
    var estaba = barra.classList.contains('barra-duo--minimizada');
    minimizarDuo(false);
    var titulo = $('#barra-duo-titulo');
    var enfocar = function () { if (titulo) { try { titulo.focus({ preventScroll: true }); } catch (e) { titulo.focus(); } } };
    enfocar();
    // Si estaba escondida, su "visibility" puede tardar un cuadro en volver: se reintenta.
    if (estaba) window.requestAnimationFrame(function () { setTimeout(enfocar, 0); });
    if (!estaba && !sinMovimiento() && typeof barra.animate === 'function') {
      barra.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }, { transform: 'translateY(0)' }], { duration: 360, easing: 'ease-out' });
    }
  }

  // ---- Vuelo de la foto hasta el dúo y corazoncitos al completar los 2 pares
  function desplazamientoY(el) {
    var t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    var n = t.slice(t.indexOf('(') + 1, -1).split(',').map(Number);
    if (/^matrix3d/.test(t)) return n[13] || 0;   // matrix3d(…): el valor 14 es Y
    return n[5] || 0;                             // matrix(a, b, c, d, x, y)
  }
  function volarAlDuo(img, desde, indice, alLlegar) {
    if (sinMovimiento() || !img || !desde || typeof img.animate !== 'function') return false;
    var par = $$('#barra-duo-pares .par-duo')[indice];
    var meta = par && $('.par-duo__foto', par);
    if (!meta) return false;
    var r = meta.getBoundingClientRect();
    var top = r.top - desplazamientoY(barra);   // la barra puede estar entrando (subiendo)
    if (!r.width || !desde.width) return false;
    var dx = r.left - desde.left, dy = top - desde.top, s = r.width / desde.width;
    var fotoMeta = $('img', meta);
    if (fotoMeta) fotoMeta.style.opacity = '0';
    // Tres capas: X lineal, Y con curva (hace el arco) y la foto (escala y opacidad).
    var x = document.createElement('div');
    x.className = 'vuelo';
    x.setAttribute('aria-hidden', 'true');
    x.style.left = desde.left + 'px';
    x.style.top = desde.top + 'px';
    x.style.width = desde.width + 'px';
    x.style.height = desde.height + 'px';
    x.setAttribute('data-destino', Math.round(r.left) + ',' + Math.round(top) + ',' + Math.round(r.width));
    x.innerHTML = '<div class="vuelo__y"><img class="vuelo__foto" src="' + img.currentSrc.replace(/"/g, '&quot;') + '" alt=""></div>';
    document.body.appendChild(x);
    var y = x.firstChild, f = y.firstChild;
    var dur = 620;
    x.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + dx + 'px)' }], { duration: dur, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' });
    y.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + dy + 'px)' }], { duration: dur, easing: 'cubic-bezier(.5, -0.45, .75, .9)', fill: 'forwards' });
    var anim = f.animate([
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(' + (1 + (s - 1) * 0.35) + ')', opacity: 1, offset: 0.55 },
      { transform: 'scale(' + s + ')', opacity: 0.85 }
    ], { duration: dur, easing: 'ease-in-out', fill: 'forwards' });
    var terminado = false;
    var fin = function () {
      if (terminado) return;
      terminado = true;
      if (x.parentNode) x.parentNode.removeChild(x);
      if (fotoMeta && document.contains(fotoMeta)) {
        fotoMeta.style.opacity = '';
        if (typeof meta.animate === 'function') meta.animate([{ transform: 'scale(.86)' }, { transform: 'scale(1.06)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
      }
      if (alLlegar) alLlegar(r.left + r.width / 2, top + r.height / 2);
    };
    anim.onfinish = fin;
    setTimeout(fin, dur + 400);   // por si la pestaña estaba en segundo plano
    return true;
  }
  function corazones(cx, cy) {
    if (sinMovimiento()) return;
    var caja = document.createElement('div');
    caja.className = 'corazones';
    caja.setAttribute('aria-hidden', 'true');
    caja.style.left = cx + 'px';
    caja.style.top = cy + 'px';
    var colores = ['var(--acento)', 'var(--enfasis)', '#E2306C', 'var(--acento-2)'];
    var total = 14;
    var html = '';
    for (var i = 0; i < total; i++) {
      html += '<svg class="corazon" style="color:' + colores[i % colores.length] + '"><use href="#i-corazon"/></svg>';
    }
    caja.innerHTML = html;
    document.body.appendChild(caja);
    $$('.corazon', caja).forEach(function (h, i) {
      if (typeof h.animate !== 'function') return;
      var ang = (i / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      var dist = 52 + Math.random() * 58;
      var hx = Math.cos(ang) * dist, hy = Math.sin(ang) * dist - 26;
      var giro = Math.round((Math.random() - 0.5) * 50);
      h.animate([
        { transform: 'translate(0, 0) scale(.3)', opacity: 0 },
        { transform: 'translate(' + (hx * 0.6) + 'px, ' + (hy * 0.6) + 'px) scale(1.1) rotate(' + giro + 'deg)', opacity: 1, offset: 0.35 },
        { transform: 'translate(' + hx + 'px, ' + (hy - 18) + 'px) scale(.7) rotate(' + giro + 'deg)', opacity: 0 }
      ], { duration: 820 + Math.random() * 260, easing: 'cubic-bezier(.2, .7, .3, 1)', fill: 'forwards' });
    });
    setTimeout(function () { if (caja.parentNode) caja.parentNode.removeChild(caja); }, 1300);
  }

  function actualizarCtaDuo() {
    var cta = $('#duo-cta');
    var listo = duo.length === 2 && duo.every(function (it) { return it.talla; });
    cta.href = listo ? urlWhatsApp(mensajeDuo(itemsDuo())) : '#';
    cta.classList.toggle('boton--esperando', !listo);
    var textoNormal = 'Pedir mi dúo<span class="solo-ancho"> por WhatsApp</span>';
    var conFoto = soportaFotos && duo.length > 0;
    modoEnvio($('#duo-fotos'), $('#duo-fotos-nota'), cta, textoNormal, conFoto);
    if (conFoto) prepararBotonFotos($('#duo-fotos'), duo.length === 2 ? itemsDuo() : [], function () {
      modoEnvio($('#duo-fotos'), $('#duo-fotos-nota'), cta, textoNormal, false);
      medirBarra();
    });
    medirBarra();
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
    var alto = barra.hidden || barra.classList.contains('barra-duo--minimizada') ? 0 : barra.offsetHeight;
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
    $('#duo-ocultar').addEventListener('click', function () {
      minimizarDuo(true);
      avisoApp('Tu dúo sigue guardado: tócalo abajo, en «Mi dúo» 💕');
    });
    if ('ResizeObserver' in window) new ResizeObserver(medirBarra).observe(barra);
    window.addEventListener('resize', function () {
      if (!esCelular()) minimizarDuo(false);
      medirBarra();
    });
  }

  // ------------------------------------------------------------------ barra de abajo (celular)
  function iniciarBarraApp() {
    var nav = $('#barra-app');
    if (!nav) return;
    nav.addEventListener('click', function (e) {
      var item = e.target.closest('[data-app]');
      if (!item) return;
      var que = item.getAttribute('data-app');
      if (que === 'inicio') {
        e.preventDefault();
        try { window.scrollTo({ top: 0, behavior: sinMovimiento() ? 'auto' : 'smooth' }); } catch (err) { window.scrollTo(0, 0); }
      } else if (que === 'talla') {
        e.preventDefault();
        irAMiTalla();
      } else if (que === 'duo') {
        abrirMiDuo();
      }
    });
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
    fichaOrigen = null;
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
    iniciarBarraApp();
    pintarCatalogo();
    if (!PRODUCTOS) return;
    pintarLiquidacion();
    iniciarFiltros();
    iniciarEntrada();
    iniciarFicha();
    iniciarDuo();

    document.addEventListener('click', function (e) {
      var duoBtn = e.target.closest('.tarjeta__duo');
      if (duoBtn) {
        var k = duoBtn.getAttribute('data-duo');
        var i = indiceEnDuo(k);
        if (i !== -1) { quitarDelDuo(i); return; }
        var img = $('.tarjeta__foto img', duoBtn.closest('.tarjeta'));
        var desde = img ? img.getBoundingClientRect() : null;
        if (agregarAlDuo(k)) {
          var completo = duo.length === 2;
          volarAlDuo(img, desde, duo.length - 1, completo ? corazones : null);
        }
        return;
      }
      var abrir = e.target.closest('.tarjeta__ver, button.tarjeta__pedir, .liq-tarjeta');
      if (abrir) {
        var caja = abrir.closest('.tarjeta, .liq-tarjeta');
        abrirFichaDesde(caja ? $('img', caja) : null, abrir.getAttribute('data-producto'), abrir.getAttribute('data-color'));
      }
    });

    abrirDesdeHash(true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
