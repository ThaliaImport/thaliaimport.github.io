/* Lógica del catálogo para el panel: aplicar un cambio sobre productos.json.
 * No toca la pantalla ni la red: recibe el catálogo y devuelve uno nuevo.
 * Cada cambio es una "operación" que se puede volver a aplicar sobre la versión
 * más nueva si alguien guardó otra cosa al mismo tiempo.
 *
 *   { tipo: 'guardar', original: { pid, cid } | null, datos: {...} }
 *   { tipo: 'agotado', pid, cid, valor: true | false }
 *   { tipo: 'eliminar', pid, cid }
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Catalogo = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MARCAS = ['new balance', 'newbalance', 'nike', 'adidas', 'puma', 'vans', 'converse', 'hello kitty', 'skechers',
    'fila', 'reebok', 'jordan', 'asics', 'sanrio', 'kuromi', 'cinnamoroll', 'labubu', 'yeezy', 'air force', 'miu miu'];

  function ErrorCatalogo(tipo, mensaje) { var e = new Error(mensaje); e.tipo = tipo; return e; }

  function sinTildes(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function normal(s) { return sinTildes(s).toLowerCase().replace(/\s+/g, ' ').trim(); }
  function slug(s) {
    return sinTildes(s).toLowerCase().replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '') || 'modelo';
  }
  function unico(base, usados) {
    if (!usados(base)) return base;
    for (var i = 2; i < 1000; i++) if (!usados(base + '-' + i)) return base + '-' + i;
    return base + '-' + Date.now();
  }
  function clonar(o) { return JSON.parse(JSON.stringify(o)); }

  // Marcas ajenas que aparecen en un texto (sin importar mayúsculas ni tildes).
  function marcasEn(texto) {
    var t = ' ' + normal(texto).replace(/[^a-z0-9]+/g, ' ') + ' ';
    return MARCAS.filter(function (m) { return t.indexOf(' ' + m + ' ') !== -1; });
  }
  function quitarMarcas(texto) {
    var t = String(texto || '');
    MARCAS.forEach(function (m) {
      var re = new RegExp('\\b' + m.split('').map(function (ch) { return ch === ' ' ? '\\s*' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('') + '\\b', 'gi');
      t = t.replace(re, ' ');
    });
    t = t.replace(/\s+/g, ' ').trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
  }

  function productoPorId(cat, id) {
    for (var i = 0; i < cat.productos.length; i++) if (cat.productos[i].id === id) return cat.productos[i];
    return null;
  }
  function colorPorId(p, id) {
    for (var i = 0; i < (p.colores || []).length; i++) if (p.colores[i].id === id) return p.colores[i];
    return null;
  }
  function productoPorNombre(cat, nombre) {
    var n = normal(nombre);
    for (var i = 0; i < cat.productos.length; i++) if (normal(cat.productos[i].nombre) === n) return cat.productos[i];
    return null;
  }
  function tienePrecio(v) { return v !== undefined && v !== null && v !== ''; }

  // Lo que vale para un color (sus datos o los del modelo).
  function efectivo(p, c) {
    var precio = Number(tienePrecio(c.precio) ? c.precio : p.precio);
    var tallas = (Array.isArray(c.tallas) && c.tallas.length) ? c.tallas : (Array.isArray(p.tallas) && p.tallas.length ? p.tallas : null);
    return {
      precio: precio > 0 ? precio : null,
      tallas: tallas ? tallas.map(Number).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; }) : null,
      tallasAgotadas: Array.isArray(c.tallasAgotadas) ? c.tallasAgotadas.map(Number) : [],
      agotado: !!(p.agotado || c.agotado),
      ultimoPar: !!c.ultimoPar
    };
  }

  // Pasa precio, tallas y agotado del modelo a cada color (mismo resultado en la tienda),
  // para poder cambiar un color sin afectar a los demás.
  function bajarAlColor(p) {
    (p.colores || []).forEach(function (c) {
      if (tienePrecio(p.precio) && !tienePrecio(c.precio)) c.precio = p.precio;
      if (Array.isArray(p.tallas) && p.tallas.length && !(Array.isArray(c.tallas) && c.tallas.length)) c.tallas = p.tallas.slice();
      if (p.agotado) c.agotado = true;
    });
    delete p.precio; delete p.tallas; delete p.agotado;
  }

  // Ordena las claves del color como en el resto del archivo.
  function colorOrdenado(c) {
    var orden = ['id', 'nombre', 'fotos', 'precio', 'tallas', 'tallasAgotadas', 'ultimoPar', 'agotado'];
    var out = {};
    orden.forEach(function (k) { if (c[k] !== undefined) out[k] = c[k]; });
    Object.keys(c).forEach(function (k) { if (out[k] === undefined && c[k] !== undefined) out[k] = c[k]; });
    return out;
  }

  // Nombres de páginas p/ que ya existen (para que no choquen dos productos).
  function paginasUsadas(cat, salvo) {
    var s = {};
    cat.productos.forEach(function (p) {
      (p.colores || []).forEach(function (c) { if (c !== salvo) s[p.id + '-' + c.id] = true; });
    });
    return s;
  }
  function idColorNuevo(cat, p, nombreColor, salvo) {
    var paginas = paginasUsadas(cat, salvo);
    return unico(slug(nombreColor), function (id) {
      return (p.colores || []).some(function (c) { return c !== salvo && c.id === id; }) || paginas[p.id + '-' + id];
    });
  }
  function idProductoNuevo(cat, nombre) {
    return unico(slug(nombre), function (id) { return !!productoPorId(cat, id); });
  }
  function insertarProducto(cat, p) {
    var ultimo = -1;
    cat.productos.forEach(function (q, i) { if (q.seccion === p.seccion) ultimo = i; });
    if (ultimo === -1) cat.productos.push(p);
    else cat.productos.splice(ultimo + 1, 0, p);
  }

  function aplicarDatosColor(c, d) {
    c.nombre = d.color;
    c.fotos = d.fotos.slice();
    if (d.precio > 0) c.precio = d.precio; else delete c.precio;
    var tallas = (d.tallas || []).map(Number).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
    if (tallas.length) c.tallas = tallas; else delete c.tallas;
    var agot = (d.tallasAgotadas || []).map(Number).filter(function (t) { return tallas.indexOf(t) !== -1; }).sort(function (a, b) { return a - b; });
    if (agot.length) c.tallasAgotadas = agot; else delete c.tallasAgotadas;
    if (d.ultimoPar) c.ultimoPar = true; else delete c.ultimoPar;
    if (d.agotado) c.agotado = true; else delete c.agotado;
    return colorOrdenado(c);
  }

  function validarDatos(d) {
    if (!d.fotos || !d.fotos.length) throw ErrorCatalogo('datos', 'Falta al menos una foto.');
    if (!String(d.nombre || '').trim()) throw ErrorCatalogo('datos', 'Falta el nombre del modelo.');
    if (!String(d.color || '').trim()) throw ErrorCatalogo('datos', 'Falta el color.');
    if (!d.seccion) throw ErrorCatalogo('datos', 'Falta elegir la sección.');
  }

  function guardar(cat, op) {
    var d = op.datos;
    validarDatos(d);
    d.nombre = String(d.nombre).trim().replace(/\s+/g, ' ');
    d.color = String(d.color).trim().replace(/\s+/g, ' ');
    var p0 = null, c0 = null;
    if (op.original) {
      p0 = productoPorId(cat, op.original.pid);
      c0 = p0 && colorPorId(p0, op.original.cid);
      if (!c0) throw ErrorCatalogo('yaNoExiste', 'Esa zapatilla ya no está en la tienda.');
    }
    var mismo = productoPorNombre(cat, d.nombre);
    var destino;
    if (p0 && (!mismo || mismo === p0)) {
      destino = p0;                                   // mismo modelo (o se le cambió el nombre)
      if (destino.nombre !== d.nombre) { destino.nombre = d.nombre; delete destino.nombreEnMensaje; }
    } else if (mismo) {
      destino = mismo;                                // se agrega (o se mueve) a un modelo que ya existe
    } else {
      destino = { id: idProductoNuevo(cat, d.nombre), nombre: d.nombre, seccion: d.seccion, descripcion: '', colores: [] };
      insertarProducto(cat, destino);
    }
    destino.seccion = d.seccion;
    var desc = String(d.descripcion || '').trim();
    if (desc) destino.descripcion = desc; else if (destino.descripcion !== undefined) destino.descripcion = '';
    bajarAlColor(destino);

    var c, cid;
    if (c0 && destino === p0) {
      var i = p0.colores.indexOf(c0);
      c = aplicarDatosColor(c0, d);
      p0.colores[i] = c;
      cid = c.id;
    } else {
      if (c0) {                                       // sale del modelo anterior
        bajarAlColor(p0);
        p0.colores.splice(p0.colores.indexOf(c0), 1);
        if (!p0.colores.length) cat.productos.splice(cat.productos.indexOf(p0), 1);
      }
      cid = idColorNuevo(cat, destino, d.color, null);
      c = aplicarDatosColor({ id: cid }, d);
      destino.colores.push(c);
    }
    return { catalogo: cat, pid: destino.id, cid: cid, titulo: destino.nombre + ' ' + c.nombre };
  }

  function agotado(cat, op) {
    var p = productoPorId(cat, op.pid);
    var c = p && colorPorId(p, op.cid);
    if (!c) throw ErrorCatalogo('yaNoExiste', 'Esa zapatilla ya no está en la tienda.');
    if (p.agotado) bajarAlColor(p);
    if (op.valor) c.agotado = true; else delete c.agotado;
    p.colores[p.colores.indexOf(c)] = colorOrdenado(c);
    return { catalogo: cat, pid: p.id, cid: c.id, titulo: p.nombre + ' ' + c.nombre };
  }

  function eliminar(cat, op) {
    var p = productoPorId(cat, op.pid);
    var c = p && colorPorId(p, op.cid);
    if (!c) throw ErrorCatalogo('yaNoExiste', 'Esa zapatilla ya no está en la tienda.');
    var titulo = p.nombre + ' ' + c.nombre;
    p.colores.splice(p.colores.indexOf(c), 1);
    if (!p.colores.length) cat.productos.splice(cat.productos.indexOf(p), 1);
    return { catalogo: cat, pid: null, cid: null, titulo: titulo };
  }

  // Aplica la operación sobre una COPIA del catálogo.
  function aplicar(catalogo, op) {
    var cat = clonar(catalogo);
    if (!Array.isArray(cat.productos)) throw ErrorCatalogo('datos', 'productos.json no tiene productos.');
    if (op.tipo === 'guardar') return guardar(cat, clonar(op));
    if (op.tipo === 'agotado') return agotado(cat, op);
    if (op.tipo === 'eliminar') return eliminar(cat, op);
    throw ErrorCatalogo('datos', 'Operación desconocida.');
  }

  function textoJson(cat) { return JSON.stringify(cat, null, 2) + '\n'; }

  // Fotos que usa el catálogo: { todas: {id:true}, principales: {id:true} }
  function fotosUsadas(cat) {
    var todas = {}, principales = {};
    cat.productos.forEach(function (p) {
      (p.colores || []).forEach(function (c) {
        (c.fotos || []).forEach(function (f, i) { todas[f] = true; if (i === 0) principales[f] = true; });
      });
    });
    return { todas: todas, principales: principales };
  }

  // Precio escrito por Thalia: "39,90", "S/ 45", "45." → número o null. NaN si no se entiende.
  function leerPrecio(texto) {
    var t = String(texto || '').replace(/s\/\.?/i, '').replace(/soles?/i, '').replace(/\s/g, '').replace(',', '.');
    if (!t) return null;
    if (!/^\d{1,5}(\.\d{0,2})?$/.test(t)) return NaN;
    var v = Math.round(parseFloat(t) * 100) / 100;
    return v > 0 ? v : NaN;
  }

  return {
    aplicar: aplicar, efectivo: efectivo, textoJson: textoJson, fotosUsadas: fotosUsadas,
    marcasEn: marcasEn, quitarMarcas: quitarMarcas, slug: slug, normal: normal, leerPrecio: leerPrecio,
    productoPorId: productoPorId, colorPorId: colorPorId, productoPorNombre: productoPorNombre, MARCAS: MARCAS
  };
});
