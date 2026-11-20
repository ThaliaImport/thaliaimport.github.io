/* =====================================================================
   CATÁLOGO DE THALIA IMPORT  (fotos del 19/11/2026, carpeta fotos\hoy_19nov\)
   ---------------------------------------------------------------------
   Aquí están todos los productos. Puedes editar este archivo con el
   Bloc de notas o VS Code sin tocar el diseño de la web.
   El catálogo anterior quedó guardado en _trabajo\productos_viejo.js.

   Reglas rápidas (todo lo explica LEEME.md):
   - Cada producto va entre { } y termina con una coma.
   - Los textos van entre comillas "así".
   - Cada COLOR sale en su propia tarjeta.
   - fotos: el nombre de la foto sin .jpg ("h08" es fotos\hoy_19nov\h08.jpg).
     La PRIMERA foto es la de la tarjeta; las demás se ven en la ficha.
   - precio: número en soles (30 o 39.90). Si no hay precio, no lo pongas:
     la tarjeta dirá "Consultar precio".
   - tallas: las tallas que hay, por ejemplo [39] o [36, 37, 38].
     Si no se sabe, no lo pongas: dirá "Consulta tallas".
     Con una sola talla sale la etiqueta "Solo talla 39".
   - ultimoPar: true  -> etiqueta "Último par".
   - agotado: true    -> sale en gris como "Agotado".
   - tallasAgotadas: [37] -> esa talla sale tachada.
   - precio y tallas pueden ir en el producto (valen para todos sus colores)
     o en cada color (mandan sobre las del producto).

   Nunca escribas nombres de marcas ajenas (ni en nombre ni en descripción).
   ===================================================================== */

window.SECCIONES = [
  {
    id: "plataformas",
    titulo: "Plataformas",
    antetitulo: "Más altura, más estilo",
    descripcion: "Suela alta para subirte unos centímetros y lucir tus outfits de todos los días."
  },
  {
    id: "deportivas",
    titulo: "Deportivas",
    antetitulo: "Para todo el día",
    descripcion: "Running, malla y chunky para caminar, salir o entrenar."
  },
  {
    id: "urbanas",
    titulo: "Urbanas",
    antetitulo: "Clásicos",
    descripcion: "Básicos que combinan con todo: jean, falda o buzo."
  }
];

window.PRODUCTOS = [

  /* ------------------------------ PLATAFORMAS ----------------------------- */
  {
    id: "plataforma-alta",
    nombre: "Plataforma alta",
    seccion: "plataformas",
    descripcion: "Suela alta ondulada con detalles en rosa. Cómoda y fácil de combinar.",
    colores: [
      { id: "crema-rosa", nombre: "Crema con rosa", fotos: ["h08"], precio: 30, tallas: [39] }
    ]
  },
  {
    id: "plataforma-ola",
    nombre: "Plataforma ola",
    seccion: "plataformas",
    descripcion: "Suela gruesa ondulada con dos franjas al costado.",
    colores: [
      // h22 trae precio y talla en el chat. h04 parece el mismo color y va como segunda foto (confirmar con Thalia).
      { id: "crema-gris", nombre: "Crema con gris", fotos: ["h22", "h04"], precio: 30, tallas: [39] }
    ]
  },
  {
    id: "chunky-taco",
    nombre: "Chunky con taco incorporado",
    nombreEnMensaje: "Chunky con taco",
    seccion: "plataformas",
    descripcion: "Chunky negra con taco incorporado por dentro y cadena con florcitas.",
    colores: [
      { id: "negro", nombre: "Negro", fotos: ["h31"], precio: 49.90, tallas: [35, 37, 38, 39] }
    ]
  },
  /* Sin precio (no van hasta que Thalia los pase): Plataforma Sport h23/h24/h25,
     Plataforma con franjas h05, Plataforma con perrito h06, Plataforma gatita h07,
     Plataforma ola blanco con beige h03, Malla tornasol h01/h02. Ver _trabajo\productos_viejo.js */

  /* ------------------------------ DEPORTIVAS ------------------------------ */
  {
    id: "chunky-m",
    nombre: "Chunky M",
    seccion: "deportivas",
    descripcion: "Chunky con una M grande al costado y cámara de aire en el talón.",
    // El caption "Precio 39.90" iba debajo de una sola foto (h26). Se usa para los 3 colores: confirmar con Thalia.
    precio: 39.90,
    colores: [
      { id: "crema-rosa", nombre: "Crema con rosa", fotos: ["h27"] },
      { id: "blanco-negro-celeste", nombre: "Blanco, negro y celeste", fotos: ["h26"] },
      { id: "blanco-azul", nombre: "Blanco con azul marino", fotos: ["h28"] }
    ]
  },
  {
    id: "running-retro",
    nombre: "Running retro",
    seccion: "deportivas",
    descripcion: "Blanca con negro, estilo running retro.",
    colores: [
      { id: "blanco-negro", nombre: "Blanco con negro", fotos: ["51", "h16"], precio: 45, tallas: [35, 36] }
    ]
  },
  {
    id: "malla-tejida",
    nombre: "Malla tejida",
    seccion: "deportivas",
    descripcion: "Malla tejida en palo rosa con suela gruesa.",
    colores: [
      { id: "palo-rosa", nombre: "Palo rosa", fotos: ["h12"], precio: 50, tallas: [36] }
    ]
  },
  {
    id: "malla-aire",
    nombre: "Malla con aire",
    seccion: "deportivas",
    descripcion: "Malla tejida con suela alta y cámara de aire en el talón.",
    colores: [
      { id: "palo-rosa", nombre: "Palo rosa", fotos: ["49", "h21"], precio: 50, tallas: [37] }
    ]
  },
  {
    id: "deportiva-pastel",
    nombre: "Deportiva pastel",
    seccion: "deportivas",
    descripcion: "Blanca con ondas de colores pastel y suela rosada.",
    colores: [
      { id: "blanco-multicolor", nombre: "Blanco multicolor", fotos: ["46", "h13"], precio: 60, tallas: [35] }
    ]
  },
  {
    id: "trekking",
    nombre: "Trekking",
    seccion: "deportivas",
    descripcion: "Azul marino con detalles rosados y suela con buen agarre.",
    colores: [
      { id: "azul-rosa", nombre: "Azul marino con rosa", fotos: ["52", "h18"], precio: 60, tallas: [38], ultimoPar: true }
    ]
  },
  {
    id: "running",
    nombre: "Running",
    seccion: "deportivas",
    descripcion: "Rosa con detalles lila y suela blanca ondulada.",
    colores: [
      { id: "rosa-lila", nombre: "Rosa con lila", fotos: ["39", "h14"], precio: 65, tallas: [35] }
    ]
  },
  {
    id: "botin-trekking",
    nombre: "Botín trekking",
    seccion: "deportivas",
    descripcion: "Botín negro con detalles fucsia, pasador rápido y suela con agarre.",
    colores: [
      { id: "negro-fucsia", nombre: "Negro con fucsia", fotos: ["40", "h15"], precio: 65, tallas: [36, 37, 38] }
    ]
  },
  {
    id: "deportiva-ondas",
    nombre: "Deportiva ondas",
    seccion: "deportivas",
    descripcion: "Negra con ondas en rosa, lila y celeste.",
    colores: [
      { id: "negro-rosa-lila", nombre: "Negro con rosa y lila", fotos: ["41", "h17"], precio: 65, tallas: [35] }
    ]
  },
  {
    id: "chunky-curvas",
    nombre: "Chunky curvas",
    seccion: "deportivas",
    descripcion: "Blanca con curvas en palo rosa y suela gruesa.",
    colores: [
      { id: "blanco-palo-rosa", nombre: "Blanco con palo rosa", fotos: ["h19"], precio: 65, tallas: [37], ultimoPar: true }
    ]
  },
  {
    id: "chunky-nube",
    nombre: "Chunky nube",
    seccion: "deportivas",
    descripcion: "Crema con detalles verde menta y naranja, sobre suela ondulada.",
    colores: [
      { id: "crema-menta", nombre: "Crema con menta", fotos: ["48", "h20"], precio: 65, tallas: [37] }
    ]
  },

  /* ------------------------------- URBANAS -------------------------------- */
  {
    id: "lona-clasica",
    nombre: "Lona clásica",
    seccion: "urbanas",
    descripcion: "La clásica de lona negra con puntera blanca.",
    colores: [
      { id: "negro", nombre: "Negro", fotos: ["h10"], precio: 20, tallas: [35] }
    ]
  },
  {
    id: "urbana-cancha",
    nombre: "Urbana de cancha",
    seccion: "urbanas",
    descripcion: "Urbana blanca de suela gruesa, en blanco total o con franjas negras.",
    // El caption "Precio 29.90" iba debajo de una sola foto (h30). Se usa para los 2 colores: confirmar con Thalia.
    precio: 29.90,
    colores: [
      { id: "blanco", nombre: "Blanco", fotos: ["h30"] },
      { id: "blanco-negro", nombre: "Blanco con negro", fotos: ["h29"] }
    ]
  },
  {
    id: "urbana-raya",
    nombre: "Urbana con raya",
    seccion: "urbanas",
    descripcion: "Blanca con una raya negra al costado.",
    colores: [
      { id: "blanco-negro", nombre: "Blanco con negro", fotos: ["h09"], precio: 30, tallas: [40] }
    ]
  },
  {
    id: "cana-media",
    nombre: "Caña media",
    seccion: "urbanas",
    descripcion: "Caña media blanca con paneles en gris y rosa.",
    colores: [
      { id: "blanco-gris-rosa", nombre: "Blanco con gris y rosa", fotos: ["50", "h11"], precio: 30, tallas: [39] }
    ]
  }
];
