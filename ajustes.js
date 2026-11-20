/* =====================================================================
   AJUSTES DE THALIA IMPORT (se pueden cambiar sin tocar el diseño)
   Lee LEEME.md si tienes dudas.
   ===================================================================== */
window.AJUSTES = {

  // WhatsApp de la tienda: código de país (51 = Perú) + número, sin "+" ni espacios.
  whatsapp: "51900915638",
  // Cómo se muestra el número en la página.
  whatsappVisible: "+51 900 915 638",

  // Dirección definitiva de la web, terminada en "/". Por ejemplo: "https://thaliaimport.com/"
  // Mientras esté vacía, los enlaces se arman con la dirección desde donde se abre la página.
  // Cuando la cambies, corre en tienda\_trabajo:  node paginas.js   (para que WhatsApp muestre la foto).
  urlBase: "https://fisicapreuapp-arch.github.io/thalia-import/",

  // Dónde guarda el panel de Thalia (admin/): la cuenta de GitHub, el repositorio y la rama de la web.
  // Si la tienda se muda a otra cuenta o repositorio, cambia SOLO estas tres líneas (y urlBase arriba).
  //   Repo "usuario.github.io"  -> la web queda en https://usuario.github.io/
  //   Repo "thalia-import"      -> la web queda en https://usuario.github.io/thalia-import/
  github: {
    usuario: "fisicapreuapp-arch",
    repo: "thalia-import",
    rama: "main"
  },

  // TikTok (usuario sin @).
  tiktokTienda: "thaliimport0",
  tiktokLives: "lularoque4",

  // Instagram: déjalo vacío "" para que NO aparezca.
  // Cuando lo tengan, escribe el usuario sin @, por ejemplo: instagram: "thaliaimport",
  instagram: "",

  // Logo de la tienda: "a" (firma), "b" (corazón de pasador) o "c" (envíos con amor).
  logoPorDefecto: "a",

  // Vista previa de logos (mientras Thalia elige):
  //   true  -> se ve el selector de logos abajo a la izquierda y funciona ?logo=b en la dirección.
  //   false -> la web usa siempre logoPorDefecto.
  vistaPreviaDeLogos: true,

  // Si es true, cada mensaje de WhatsApp lleva el enlace a la foto del producto.
  incluirEnlaceDelProducto: true,

  // Mensajes que se escriben solos en WhatsApp.
  // {modelo}, {talla}, {precio}, {pares}, {enlace} y {enlaces} se reemplazan solos.
  mensajes: {
    general: "Hola Thalia Import 💕 Vi tu catálogo web y quiero hacerte una consulta, preciosa.",
    pedido: "Hola Thalia Import 💕 Quiero pedir el modelo *{modelo}*, talla *{talla}*, precio *{precio}*. ¿Está disponible, preciosa?",
    pedidoSinPrecio: "Hola Thalia Import 💕 Me interesa el modelo *{modelo}*, talla *{talla}*. ¿Lo tienes en mi talla y cuál es el precio, preciosa?",
    sinTalla: "Hola Thalia Import 💕 Me interesa el modelo *{modelo}* ({precio}), pero aún no sé mi talla. ¿Me ayudas a elegirla, preciosa?",
    sinTallaSinPrecio: "Hola Thalia Import 💕 Me interesa el modelo *{modelo}*, pero aún no sé mi talla. ¿Me ayudas a elegirla? ¿Y cuál es el precio, preciosa?",
    agotado: "Hola Thalia Import 💕 Vi que el modelo *{modelo}* está agotado. ¿Me avisas cuando vuelva a llegar, porfa?",
    enlace: "Foto: {enlace}",

    duo: "Hola Thalia Import 💕 Quiero armar un dúo:\n{pares}\n¿Hay precio especial por llevar 2, preciosa?",
    lineaDuo: "👟 *{modelo}*, talla *{talla}* · {precio}",
    enlacesDuo: "Fotos:\n{enlaces}",
    tallaPorConfirmar: "por confirmar",
    precioPorConfirmar: "precio por confirmar"
  }
};
