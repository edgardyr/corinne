// Catálogo del configurador de corinne.
// Es el único archivo que se edita para cambiar precios, colores u opciones.
// Los colores salen de las bobinas con existencias en Taller 3D (06/11/2026).
// Cada clave (id) se guarda en los enlaces de pedido: no se cambia una clave ya publicada,
// porque los pedidos viejos dejarían de abrirse bien. Para retirar un color, se marca agotado: true.

export const TIENDA = {
  nombre: "corinne",
  instagram: "corinne_mcy",
  // Número de WhatsApp en formato internacional, sin + ni espacios (ej. 584241234567).
  // Vacío: WhatsApp abre el selector de contactos con el mensaje ya escrito.
  whatsapp: "584121300456",
  pagos: "Pago móvil, Zelle o Binance",
  moneda: "Precios en dólares a tasa BCV del día.",
};

// Precios de las teclas y accesorios. El porqué de cada uno está en el README, no aquí:
// este archivo lo descarga el navegador de cualquier cliente.
export const PRECIOS = {
  tecla: 1.5,            // cada tecla con su pulsador; base y llavero metálico incluidos
  charmPersonalizado: 1.5,
  objetoConClicker: 3,   // clicker de objeto que va junto al de letras
  objetoSolo: 4,         // clicker de objeto solo, con su cadena
};

export const MAX_TECLAS = 10;

// Colores de filamento (PLA, para que todo vaya en la misma placa).
export const COLORES = [
  { id: "blanco",   nombre: "Blanco",          hex: "#F7F7F4", filamento: "Kingroon PLA Basic Blanco" },
  { id: "negro",    nombre: "Negro",           hex: "#1E1E22", filamento: "Kingroon PLA Basic Negro" },
  { id: "plata",    nombre: "Plateado",        hex: "#B9BCC2", filamento: "Kingroon PLA Basic Plata" },
  { id: "azul",     nombre: "Azul",            hex: "#5061DC", filamento: "Kingroon PLA Basic Azul" },
  { id: "morado",   nombre: "Morado",          hex: "#8A35D0", filamento: "Bambu PLA Basic Purple" },
  { id: "menta",    nombre: "Menta brillante", hex: "#A1F7DA", filamento: "Bambu PLA Silk+ Mint" },
  { id: "verde",    nombre: "Verde",           hex: "#2E7D32", filamento: "RebelThynk PLA Verde" },
  { id: "amarillo", nombre: "Amarillo",        hex: "#FFD100", filamento: "RebelThynk PLA Amarillo" },
  { id: "naranja",  nombre: "Naranja",         hex: "#E0643F", filamento: "RebelThynk PLA Naranja" },
  { id: "rojo",     nombre: "Rojo",            hex: "#C62828", filamento: "RebelThynk PLA Rojo" },
  { id: "beige",    nombre: "Beige",           hex: "#E0CFAE", filamento: "RebelThynk PLA Beige" },
  { id: "arcilla",  nombre: "Arcilla mate",    hex: "#B5785A", filamento: "RebelThynk PLA Matte Arcilla" },
  { id: "cafe",     nombre: "Café",            hex: "#5D4037", filamento: "RebelThynk PLA Café" },
];

export const TIPOGRAFIAS = [
  { id: "redonda",  nombre: "Redonda",  css: "600 1px 'Fredoka'" },
  { id: "moderna",  nombre: "Moderna",  css: "800 1px 'Montserrat'" },
  { id: "cursiva",  nombre: "Cursiva",  css: "400 1px 'Pacifico'" },
];

export const BASES = [
  { id: "lisa",      nombre: "Base lisa" },
  { id: "acanalada", nombre: "Base acanalada" },
];

// Aros impresos para el final de los eslabones. Van del color de filamento que se elija y son
// grandes, de unos 40 mm, como los mosquetones: hacen el mismo papel (Edgardy, 06/11/2026).
// El aro pequeño no va aquí: es el que une cada charm a la cadena, incluido en el precio del charm.
export const AROS = [
  { id: "aro-gde",   nombre: "Aro redondo",  precio: 1, forma: "redondo",  tam: 3.3 },
  { id: "aro-cora",  nombre: "Aro corazón",  precio: 1, forma: "corazon",  tam: 3.3 },
  { id: "aro-estre", nombre: "Aro estrella", precio: 1, forma: "estrella", tam: 1.9 },
];

// Lo que cuelga del clicker. Simplificado el 15/11/2026: el llavero metálico, que viene incluido, o
// una cadenita impresa con su mosquetón, toda de un solo color de filamento. "mosqueton" es el modelo
// que dibuja el visor. Los pedidos llevan una de las tres y nada más: ya no hay remates aparte.
export const COLGANTES = [
  { id: "llavero",  nombre: "Llavero metálico", nota: "incluido", precio: 0 },
  { id: "ovalado",  nombre: "Cadenita con mosquetón ovalado", nota: "con corazoncito", precio: 2, filamento: true, mosqueton: "ovalado" },
  { id: "estrella", nombre: "Cadenita con mosquetón estrella", precio: 2, filamento: true, mosqueton: "estrella" },
];

// Colgantes y remates que ya no se ofrecen. Solo sirven para que un enlace viejo se abra con lo más
// parecido de hoy (ver normalizar en diseno.js).
export const COLGANTES_RETIRADOS = ["bolitas", "cadenita", "eslabones", "mosqueton", "giratorio"];
export const REMATES = [];

// Charms impresos. Van solo con el llavero metálico: en las cadenitas con mosquetón no entran, porque
// haría falta un hueco más grande (15/11/2026). "forma" es la silueta que dibuja el visor (ver formas.js).
export const CHARMS = [
  { id: "corazon",  nombre: "Corazón",      precio: 1,   forma: "corazon",  color: "rojo" },
  { id: "estrella", nombre: "Estrella",     precio: 1,   forma: "estrella", color: "amarillo" },
  { id: "flor",     nombre: "Flor",         precio: 1,   forma: "flor",     color: "amarillo" },
  { id: "luna",     nombre: "Luna",         precio: 1,   forma: "luna",     color: "plata" },
  { id: "nube",     nombre: "Nube",         precio: 1,   forma: "nube",     color: "blanco" },
  { id: "mariposa", nombre: "Mariposa",     precio: 1,   forma: "mariposa", color: "morado" },
  { id: "carita",   nombre: "Carita feliz", precio: 1,   forma: "carita",   color: "amarillo" },
  { id: "lazo",     nombre: "Lazo",         precio: 1,   forma: "lazo",     color: "rojo" },
];

// Los clickers de objeto (mantequilla, botón de emergencia, creeper) se quitaron de esta página el
// 15/11/2026: son otro producto y no van en la cadenita de un clicker de letras. La lista queda
// vacía para que un enlace viejo que los traiga se abra sin ellos.
export const OBJETOS = [];

// Caracteres permitidos en las teclas. ☺ ♥ ★ se dibujan a mano en el visor.
export const SIMBOLOS = ["☺", "♥", "★", "&"];
export const CARACTERES = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789" + SIMBOLOS.join("");

export const colorPorId = (id) => COLORES.find((c) => c.id === id);
export const disponibles = () => COLORES.filter((c) => !c.agotado);

// Árbol de Navidad con los nombres de la familia (pestaña «Árbol de Navidad», arbol.html).
// Precios aprobados por Edgardy el 12/11/2026, en dólares de verdad (efectivo, Zelle, USDT): precio
// único por tamaño, en los colores que quiera el cliente. "fondo" es la profundidad de la pieza.
// Quien paga en bolívares paga a tasa BCV: precio x paralelo / BCV x colchón (regla del 09/10/2026).
// Las tasas de aquí son solo de respaldo: la página trae las del día.
export const ARBOL = {
  tamanos: [
    // Desde el 12/11/2026: fondo de medio centímetro por cada 5 cm de alto, base 1 cm más honda y
    // precios aprobados el 12/11/2026 (el cálculo está en el README).
    { id: "15", nombre: "15 cm", alto: 150, fondo: 20, fondoBase: 30, precio: 14 },
    { id: "20", nombre: "20 cm", alto: 200, fondo: 25, fondoBase: 35, precio: 19.6 },
    { id: "25", nombre: "25 cm", alto: 250, fondo: 30, fondoBase: 40, precio: 26.4 }, // 3 cm y base de 4 cm, centrada
    { id: "30", nombre: "30 cm", alto: 300, fondo: 35, fondoBase: 45, precio: 35.2 },
  ],
  maxNombres: 8,
  maxLetras: 12,
  caracteres: "ABCDEFGHIJKLMNÑOPQRSTUVWXYZÁÉÍÓÚ0123456789& ",
  colchon: 1.03,
  tasas: { bcv: 904.45, paralelo: 1073.18, fecha: "12/11/2026" },
  // Cómo se lamina (va en la hoja del ZIP de taller).
  laminado: "0.28mm Extra Draft @BBL A1, relleno Iluminación (lightning), 2 paredes. El frente va contra la cama.",
};
