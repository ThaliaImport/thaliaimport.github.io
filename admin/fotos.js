/* Fotos del panel, hechas en el celular con canvas (sin servidor):
 *   grande   hasta 1200 px, sin recortar, WebP   → img/fotos/grande/<id>.webp
 *   tarjeta  cuadrado 600 px centrado, WebP ≤ ~60 KB → img/fotos/tarjeta/<id>.webp
 *   mini     cuadrado 160 px, WebP               → img/fotos/mini/<id>.webp
 *   og       cuadrado 600 px, JPEG               → img/fotos/og/<id>.jpg  (vista previa en WhatsApp)
 * La orientación de la cámara (EXIF) se corrige al abrir la foto.
 */
(function () {
  'use strict';

  var MAX_GRANDE = 1200, LADO = 600, LADO_MINI = 160;
  var TOPE_TARJETA = 60 * 1024;

  var webpOk = (function () {
    try { return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0; }
    catch (e) { return false; }
  })();

  function lienzo(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function aBlob(c, tipo, calidad) {
    return new Promise(function (ok, mal) {
      c.toBlob(function (b) { if (b) ok(b); else mal(new Error('No se pudo preparar la foto')); }, tipo, calidad);
    });
  }
  // Abre la foto respetando la orientación (fotos de la cámara del celular).
  function abrir(archivo) {
    if (window.createImageBitmap) {
      return createImageBitmap(archivo, { imageOrientation: 'from-image' }).catch(function () { return abrirConImg(archivo); });
    }
    return abrirConImg(archivo);
  }
  function abrirConImg(archivo) {
    return new Promise(function (ok, mal) {
      var url = URL.createObjectURL(archivo);
      var img = new Image();
      img.onload = function () { ok(img); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); };
      img.onerror = function () { URL.revokeObjectURL(url); mal(new Error('Esa foto no se pudo abrir. Prueba con otra.')); };
      img.src = url;
    });
  }
  // Achica en pasos de a la mitad: se ve más nítido que de un solo salto.
  function achicar(fuente, sx, sy, sw, sh, tw, th) {
    var w = sw, h = sh, actual = fuente, x = sx, y = sy;
    while (w / 2 >= tw && h / 2 >= th) {
      var nw = Math.round(w / 2), nh = Math.round(h / 2);
      var paso = lienzo(nw, nh);
      var g = paso.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(actual, x, y, w, h, 0, 0, nw, nh);
      actual = paso; x = 0; y = 0; w = nw; h = nh;
    }
    var fin = lienzo(tw, th);
    var gf = fin.getContext('2d');
    gf.imageSmoothingQuality = 'high';
    gf.drawImage(actual, x, y, w, h, 0, 0, tw, th);
    return fin;
  }
  function tipoWebp() { return webpOk ? 'image/webp' : 'image/jpeg'; }

  function cuadrados(grande) {
    var lado = Math.min(grande.width, grande.height);
    var sx = Math.floor((grande.width - lado) / 2), sy = Math.floor((grande.height - lado) / 2);
    var c600 = achicar(grande, sx, sy, lado, lado, Math.min(LADO, lado), Math.min(LADO, lado));
    if (c600.width !== LADO) {           // foto chica: se agranda a 600 igual
      var c = lienzo(LADO, LADO);
      var g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(c600, 0, 0, LADO, LADO);
      c600 = c;
    }
    var mini = achicar(c600, 0, 0, LADO, LADO, LADO_MINI, LADO_MINI);
    var calidades = [0.78, 0.72, 0.66, 0.6, 0.52, 0.45];
    function tarjeta(i) {
      return aBlob(c600, tipoWebp(), calidades[i]).then(function (b) {
        if (b.size <= TOPE_TARJETA || i === calidades.length - 1) return b;
        return tarjeta(i + 1);
      });
    }
    return Promise.all([tarjeta(0), aBlob(mini, tipoWebp(), 0.72), aBlob(c600, 'image/jpeg', 0.8)])
      .then(function (r) { return { tarjeta: r[0], mini: r[1], og: r[2] }; });
  }

  // Foto nueva (de la galería o la cámara) → { grande, tarjeta, mini, og } como Blob.
  function procesar(archivo) {
    return abrir(archivo).then(function (img) {
      var w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
      if (!w || !h) throw new Error('Esa foto no se pudo abrir. Prueba con otra.');
      var k = Math.min(1, MAX_GRANDE / Math.max(w, h));
      var grande = achicar(img, 0, 0, w, h, Math.round(w * k), Math.round(h * k));
      if (img.close) img.close();
      return Promise.all([aBlob(grande, tipoWebp(), 0.72), cuadrados(grande)]).then(function (r) {
        return { grande: r[0], tarjeta: r[1].tarjeta, mini: r[1].mini, og: r[1].og };
      });
    });
  }

  // Para una foto vieja que pasa a ser la principal y no tiene tarjeta/mini/og: se hacen desde la grande.
  function desdeGrande(blob) {
    return abrir(blob).then(function (img) {
      var w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
      var c = lienzo(w, h);
      c.getContext('2d').drawImage(img, 0, 0);
      if (img.close) img.close();
      return cuadrados(c);
    });
  }

  // Nombre único para la foto: f + fecha + 4 letras al azar (p. ej. f20261120-k3x9)
  function idNuevo() {
    var d = new Date();
    var f = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
    var letras = '';
    var abc = 'abcdefghijkmnpqrstuvwxyz23456789';
    var r = new Uint8Array(4);
    crypto.getRandomValues(r);
    for (var i = 0; i < 4; i++) letras += abc[r[i] % abc.length];
    return 'f' + f + '-' + letras;
  }

  window.FotosPanel = { procesar: procesar, desdeGrande: desdeGrande, idNuevo: idNuevo, webpOk: webpOk };
})();
