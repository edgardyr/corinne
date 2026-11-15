// Estado de un árbol de Navidad y su paso a texto para el enlace (#a=...).
// Sin nada del navegador: lo usan también las pruebas y la herramienta de línea de comandos.
import { ARBOL, TIENDA, colorPorId } from "../catalogo.js";
import { aBase64Url, deBase64Url } from "../diseno.js";
import { dinero } from "../precio.js";

export const VERSION = 1;
const NAVIDAD = ["rojo", "verde"];

export function nuevoArbol(ano = new Date().getFullYear()) {
  return {
    v: VERSION,
    t: "25",
    n: ["MAMÁ", "PAPÁ", "SOFÍA", "MATEO"].map((x, i) => ({ x, c: NAVIDAD[i % 2] })),
    e: "amarillo",
    // Por defecto el año va en café, como un tronco, y el nombre que queda encima, en verde (15/11/2026).
    a: { y: String(ano), c: "cafe" },
  };
}

// Mayúsculas, solo los caracteres que la tipografía del árbol sabe unir, sin espacios dobles.
// "alEscribir" conserva un espacio final, para poder teclear nombres de dos palabras.
export function limpiarNombre(texto, alEscribir = false) {
  let s = "";
  for (const ch of Array.from(String(texto || "").toUpperCase().replace(/Ü/g, "U"))) {
    if (ARBOL.caracteres.includes(ch)) s += ch;
  }
  s = Array.from(s.replace(/ +/g, " ").replace(/^ /, "")).slice(0, ARBOL.maxLetras).join("");
  return alEscribir ? s : s.trim();
}

export const limpiarAno = (texto) => String(texto || "").replace(/\D/g, "").slice(0, 4);

const esColor = (id) => !!colorPorId(id);
export const tamanoDe = (d) => ARBOL.tamanos.find((t) => t.id === d.t) || ARBOL.tamanos[0];

// Repara un árbol que llega de un enlace: lo que no reconoce lo cambia por el valor por defecto.
export function normalizarArbol(entrada) {
  const base = nuevoArbol();
  if (!entrada || typeof entrada !== "object") return base;
  const d = { v: VERSION, t: base.t, n: [], e: base.e, a: null };
  if (ARBOL.tamanos.some((t) => t.id === entrada.t)) d.t = entrada.t;
  d.n = (Array.isArray(entrada.n) ? entrada.n : [])
    .slice(0, ARBOL.maxNombres)
    .map((f, i) => ({ x: limpiarNombre(f && f.x), c: f && esColor(f.c) ? f.c : NAVIDAD[i % 2] }));
  if (esColor(entrada.e)) d.e = entrada.e;
  if (entrada.a && typeof entrada.a === "object") {
    const y = limpiarAno(entrada.a.y);
    d.a = { y: y.length === 4 ? y : base.a.y, c: esColor(entrada.a.c) ? entrada.a.c : base.a.c };
  }
  return d;
}

export const codificarArbol = (d) => aBase64Url(JSON.stringify(normalizarArbol(d)));

export function decodificarArbol(s) {
  try {
    return normalizarArbol(JSON.parse(deBase64Url(String(s).trim())));
  } catch {
    return null;
  }
}

// Lo que necesita la geometría: nombres con texto, de arriba hacia abajo.
export function paraGeometria(d) {
  return {
    nombres: d.n.map((f) => ({ texto: limpiarNombre(f.x), color: f.c })).filter((f) => f.texto),
    estrella: d.e,
    ano: d.a && d.a.y.length === 4 ? { texto: d.a.y, color: d.a.c } : null,
  };
}

// Precio en dólares de verdad y su equivalente a tasa BCV con las tasas dadas.
// El de tasa BCV se redondea al dólar entero (pedido de Edgardy, 12/11/2026): se cobra 17, 24, 32, 43.
export function precioArbol(d, tasas = ARBOL.tasas) {
  const usd = tamanoDe(d).precio;
  const bcv = Math.round(usd * (tasas.paralelo / tasas.bcv) * ARBOL.colchon);
  return { usd, bcv };
}

const nombreColor = (id) => (colorPorId(id) || { nombre: id }).nombre;

export function mensajeArbol(d, datos, enlace, tasas = ARBOL.tasas) {
  const t = tamanoDe(d);
  const g = paraGeometria(d);
  const p = precioArbol(d, tasas);
  const l = [
    `🎄 ¡Hola ${TIENDA.nombre}! Quiero este árbol de Navidad con nombres 🎄`,
    "",
    `📏 Tamaño: *${t.nombre} de alto* (${String(t.fondo / 10).replace(".", ",")} cm de fondo)`,
    `⭐ Estrella: ${nombreColor(g.estrella)}`,
    "",
    "Nombres, de arriba hacia abajo:",
    ...g.nombres.map((f, i) => `${i + 1}. *${f.texto}* → ${nombreColor(f.color)}`),
    "",
    g.ano ? `📅 Año ${g.ano.texto} encajable → ${nombreColor(g.ano.color)}` : "📅 Sin año",
    "",
    `💰 *Total: ${dinero(p.bcv)} a tasa BCV* · ${dinero(p.usd)} en divisas`,
    `🔗 Mi árbol en 3D: ${enlace}`,
    "",
    `👤 ${datos.nombre} · ${datos.telefono}`,
    "📸 A continuación te envío la foto de mi árbol 💚",
  ];
  return l.join("\n");
}
