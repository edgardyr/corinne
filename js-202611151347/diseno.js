// Estado de un clicker y su paso a texto para el enlace (#d=...).
// No usa nada del navegador salvo TextEncoder/btoa, que también existen en Node:
// el generador del archivo 3D lee este mismo formato.
import {
  COLORES, TIPOGRAFIAS, BASES, COLGANTES, COLGANTES_RETIRADOS, AROS, CHARMS, OBJETOS,
  CARACTERES, MAX_TECLAS, colorPorId,
} from "./catalogo.js";

export const VERSION = 1;

export function nuevoDiseno() {
  return {
    v: VERSION,
    w: "",
    f: "redonda",
    b: { c: "morado", t: "lisa" },
    k: [],
    g: { t: "llavero", c: null },
    r: null,
    ch: [],
    p: [],
    o: [],
  };
}

// Convierte el texto escrito a la lista de caracteres válidos (mayúsculas, sin espacios).
export function limpiarPalabra(texto) {
  const salida = [];
  for (const ch of Array.from(String(texto || "").toUpperCase())) {
    if (CARACTERES.includes(ch)) salida.push(ch);
    if (salida.length >= MAX_TECLAS) break;
  }
  return salida.join("");
}

// Cambia la palabra conservando los colores de las teclas que ya existían.
export function ponerPalabra(d, texto, porDefecto = { c: "blanco", l: "negro" }) {
  const w = limpiarPalabra(texto);
  const n = Array.from(w).length;
  const ultima = d.k[d.k.length - 1] || porDefecto;
  const k = [];
  for (let i = 0; i < n; i++) k.push(d.k[i] ? { ...d.k[i] } : { ...ultima });
  return { ...d, w, k };
}

// Los charms, también los personalizados, van solo con el llavero metálico.
export const admiteCharms = (d) => d.g.t === "llavero";

const esColor = (id) => !!colorPorId(id);
const enLista = (lista, id) => lista.some((x) => x.id === id);

// Repara un diseño que llega de un enlace: lo que no reconoce lo cambia por el valor por defecto.
export function normalizar(entrada) {
  const d = nuevoDiseno();
  if (!entrada || typeof entrada !== "object") return d;
  const w = limpiarPalabra(entrada.w);
  d.w = w;
  if (enLista(TIPOGRAFIAS, entrada.f)) d.f = entrada.f;
  if (entrada.b) {
    if (esColor(entrada.b.c)) d.b.c = entrada.b.c;
    if (enLista(BASES, entrada.b.t)) d.b.t = entrada.b.t;
  }
  const kIn = Array.isArray(entrada.k) ? entrada.k : [];
  d.k = Array.from(w).map((_, i) => {
    const t = kIn[i] || {};
    return { c: esColor(t.c) ? t.c : "blanco", l: esColor(t.l) ? t.l : "negro" };
  });
  // Enlaces anteriores al 15/11/2026 traían cadenas, eslabones, mosquetones y aros sueltos. Se abren
  // con lo más parecido de hoy: lo impreso pasa a una cadenita con mosquetón (la de estrella si el
  // enlace traía una estrella) y lo metálico, al llavero.
  const gIn = entrada.g, rIn = entrada.r;
  const aroViejo = (Array.isArray(entrada.a) ? entrada.a : []).find((x) => x && enLista(AROS, x.id));
  if (gIn && enLista(COLGANTES, gIn.t) && !(gIn.t === "llavero" && (rIn || aroViejo))) {
    const col = COLGANTES.find((x) => x.id === gIn.t);
    d.g = { t: gIn.t, c: col.filamento ? (esColor(gIn.c) ? gIn.c : d.b.c) : null };
  } else {
    const ids = [gIn?.t, rIn?.t, aroViejo?.id].filter(Boolean);
    const impreso = ids.some((t) => t !== "bolitas" && t !== "cadenita" && t !== "llavero"
      && (COLGANTES_RETIRADOS.includes(t) || enLista(AROS, t)));
    if (impreso) {
      const estrella = ids.includes("aro-estre") || rIn?.m === "estrella" || gIn?.m === "estrella";
      const color = [rIn?.c, aroViejo?.c, gIn?.c].find(esColor) || d.b.c;
      d.g = { t: estrella ? "estrella" : "ovalado", c: color };
    }
  }
  d.r = null;
  const items = (lista, catalogo) =>
    (Array.isArray(lista) ? lista : [])
      .filter((x) => x && enLista(catalogo, x.id))
      .slice(0, 12)
      .map((x) => ({ id: x.id, c: esColor(x.c) ? x.c : null }));
  d.ch = items(entrada.ch, CHARMS).map((x) => ({
    ...x, c: x.c || CHARMS.find((c) => c.id === x.id).color,
  }));
  d.o = items(entrada.o, OBJETOS).map((x) => ({ id: x.id }));
  if (!admiteCharms(d)) d.ch = [];
  d.p = (Array.isArray(entrada.p) ? entrada.p : [])
    .map((t) => String(t).slice(0, 80).trim())
    .filter(Boolean)
    .slice(0, 6);
  if (!admiteCharms(d)) d.p = [];
  return d;
}

export function aBase64Url(texto) {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function deBase64Url(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function codificar(d) {
  return aBase64Url(JSON.stringify(normalizar(d)));
}

// Devuelve el diseño o null si el texto no se puede leer.
export function decodificar(s) {
  try {
    return normalizar(JSON.parse(deBase64Url(String(s).trim())));
  } catch {
    return null;
  }
}

// Saca el código de un enlace completo o de un hash.
export function codigoDeEnlace(enlace) {
  const m = String(enlace).match(/[#&]d=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

export function estaVacio(d) {
  return !d.w && d.o.length === 0;
}

// Todos los colores de filamento que usa un diseño (sirve para el aviso de las 4 ranuras del AMS).
export function coloresUsados(d) {
  const s = new Set();
  if (d.w) s.add(d.b.c);
  d.k.forEach((t) => { s.add(t.c); s.add(t.l); });
  if (COLGANTES.find((c) => c.id === d.g.t)?.filamento) s.add(d.g.c);
  d.ch.forEach((x) => s.add(x.c));
  return [...s].filter((id) => COLORES.some((c) => c.id === id));
}
