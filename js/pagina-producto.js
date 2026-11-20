/* Plantilla de las páginas por producto y color (p/<producto>-<color>.html).
 * La usan DOS lugares, así que el resultado es idéntico byte a byte:
 *   - tienda\_trabajo\paginas.js (en la computadora, con Node)
 *   - admin/ (el panel de Thalia, en el navegador del celular)
 * Cada página tiene su imagen para compartir (og:image) y redirige a la ficha del producto.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.PaginaProducto = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function precioTexto(v) { return 'S/ ' + (Math.round(v) === v ? String(v) : v.toFixed(2)); }
  function listaTexto(l) { return l.length === 1 ? String(l[0]) : l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1]; }
  function precioDe(p, c) {
    var v = Number(c.precio !== undefined && c.precio !== null && c.precio !== '' ? c.precio : p.precio);
    return v > 0 ? v : null;
  }
  function tallasDe(p, c) {
    var t = (Array.isArray(c.tallas) && c.tallas.length) ? c.tallas : (Array.isArray(p.tallas) && p.tallas.length ? p.tallas : null);
    return t ? t.map(Number).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; }) : null;
  }
  function normalizarBase(urlBase) { return String(urlBase || '').trim().replace(/\/*$/, '/'); }
  function archivoDe(p, c) { return p.id + '-' + c.id + '.html'; }

  // Devuelve { archivo: 'chunky-m-negro.html', html: '<!doctype html>…' }
  function generar(p, c, urlBase) {
    var base = normalizarBase(urlBase);
    var conBase = base !== '/';
    var archivo = archivoDe(p, c);
    var fotoId = (c.fotos || [])[0];
    var imgRel = '../img/fotos/og/' + encodeURIComponent(fotoId) + '.jpg';
    var img = conBase ? base + 'img/fotos/og/' + encodeURIComponent(fotoId) + '.jpg' : imgRel;
    var destino = '../index.html#producto=' + encodeURIComponent(p.id) + '&color=' + encodeURIComponent(c.id);
    var precio = precioDe(p, c);
    var tallas = tallasDe(p, c);
    var agotado = p.agotado || c.agotado;
    var detalle = [
      agotado ? 'Agotado' : (precio ? precioTexto(precio) : 'Precio por WhatsApp'),
      agotado ? '' : (c.ultimoPar ? 'Último par, talla ' + (tallas ? tallas[0] : '') : (tallas ? (tallas.length === 1 ? 'Solo talla ' + tallas[0] : 'Tallas ' + listaTexto(tallas)) : 'Consulta tallas'))
    ].filter(Boolean).join(' · ');
    var titulo = p.nombre + ' ' + c.nombre;
    var html = '<!doctype html>\n' +
'<html lang="es-PE">\n' +
'<head>\n' +
'  <meta charset="utf-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
'  <title>' + esc(titulo) + ' · Thalia Import</title>\n' +
'  <meta name="description" content="' + esc(detalle) + '. Pide por WhatsApp y recibe en todo el Perú.">\n' +
'  <!-- Página generada por _trabajo/paginas.js: no la edites a mano. -->' + (conBase ? '' : '\n' +
'  <!-- Falta urlBase en ajustes.js: la imagen va con dirección relativa y WhatsApp puede no mostrarla. -->') + '\n' +
'  <meta property="og:type" content="product">\n' +
'  <meta property="og:site_name" content="Thalia Import">\n' +
'  <meta property="og:locale" content="es_PE">\n' +
'  <meta property="og:title" content="' + esc(titulo) + ' · ' + esc(detalle) + '">\n' +
'  <meta property="og:description" content="' + esc(p.descripcion || 'Zapatillas de mujer importadas') + ' Pide por WhatsApp y recibe en todo el Perú.">\n' +
'  <meta property="og:image" content="' + esc(img) + '">\n' +
'  <meta property="og:image:type" content="image/jpeg">\n' +
'  <meta property="og:image:width" content="600">\n' +
'  <meta property="og:image:height" content="600">\n' +
'  <meta property="og:image:alt" content="' + esc(p.nombre) + ', color ' + esc(c.nombre) + '">' + (conBase ? '\n' +
'  <meta property="og:url" content="' + esc(base + 'p/' + archivo) + '">' : '') + '\n' +
'  <meta name="twitter:card" content="summary_large_image">\n' +
'  <meta name="twitter:image" content="' + esc(img) + '">\n' +
'  <style>\n' +
'    :root { --fondo: #FBF4EF; --tinta: #3B2230; --acento: #96506A; }\n' +
'    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box;\n' +
'      background: var(--fondo); color: var(--tinta); font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; text-align: center; }\n' +
'    img { width: 240px; height: 240px; object-fit: cover; border-radius: 18px; box-shadow: 0 12px 30px rgba(0,0,0,.15); }\n' +
'    h1 { font-size: 1.4rem; margin: 18px 0 6px; }\n' +
'    p { margin: 0 0 16px; color: var(--acento); font-weight: 600; }\n' +
'    a { color: var(--tinta); font-weight: 600; }\n' +
'  </style>\n' +
'  <script>location.replace(' + JSON.stringify(destino) + ');</script>\n' +
'</head>\n' +
'<body>\n' +
'  <main>\n' +
'    <img src="' + esc(imgRel) + '" alt="' + esc(p.nombre) + ', color ' + esc(c.nombre) + '" width="240" height="240">\n' +
'    <h1>' + esc(titulo) + '</h1>\n' +
'    <p>' + esc(detalle) + '</p>\n' +
'    <a href="' + esc(destino) + '">Ver en la tienda de Thalia Import</a>\n' +
'  </main>\n' +
'</body>\n' +
'</html>\n';
    return { archivo: archivo, html: html };
  }

  // Todas las páginas del catálogo: { 'p/archivo.html': html, ... }
  function todas(productos, urlBase) {
    var out = {};
    (productos || []).forEach(function (p) {
      (p.colores || []).forEach(function (c) {
        var r = generar(p, c, urlBase);
        out['p/' + r.archivo] = r.html;
      });
    });
    return out;
  }

  return { generar: generar, todas: todas, archivoDe: archivoDe };
});
