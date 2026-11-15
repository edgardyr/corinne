// Interfaz de la pestaña «Árbol de Navidad».
import { TIENDA, ARBOL, colorPorId, disponibles } from "../catalogo.js";
import { dinero } from "../precio.js";
import { enlaceWhatsApp } from "../pedido.js";
import { cargarFuente } from "./fuente.js";
import { componerArbol } from "./geometria.js";
import { zipDeTaller, nombreDeArchivo } from "./mallas.js";
import {
  nuevoArbol, limpiarNombre, limpiarAno, tamanoDe, codificarArbol, decodificarArbol,
  paraGeometria, precioArbol, mensajeArbol,
} from "./disenoArbol.js";
import { VisorArbol } from "./visorArbol.js";

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...hijos) => {
  const e = Object.assign(document.createElement(tag), props);
  for (const h of hijos) e.append(h);
  return e;
};
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
const leer = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };

const esTaller = new URLSearchParams(location.search).has("taller");
const nombreColor = (id) => (colorPorId(id) || { nombre: id }).nombre;
const colorDe = (id) => ({ hex: (colorPorId(id) || { hex: "#888888" }).hex, brillo: id === "menta" });

let d = nuevoArbol();
let fuente = null;
let arbol = null;          // resultado de componerArbol
let tasas = { ...ARBOL.tasas, delDia: false };
let abierto = -1;          // fila con la paleta de colores abierta
let anoGuardado = { ...d.a };
const visor = new VisorArbol($("lienzo"));

function aviso(texto) {
  const a = $("aviso");
  a.textContent = texto;
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => { a.textContent = ""; }, 2600);
}

function muestras(contenedor, actual, alElegir, chicas = false) {
  contenedor.replaceChildren();
  contenedor.classList.toggle("chicas", chicas);
  for (const c of disponibles()) {
    const b = el("button", { type: "button", className: "muestra" + (c.id === "menta" ? " brillo" : ""), title: c.nombre, ariaLabel: c.nombre });
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(c.id === actual));
    b.style.background = c.hex;
    b.addEventListener("click", () => alElegir(c.id));
    contenedor.append(b);
  }
}

// ---------- Geometría y vista ----------
function recalcular({ reencuadrar = false } = {}) {
  if (!fuente) return;
  const t = tamanoDe(d);
  arbol = componerArbol(fuente, paraGeometria(d), { alto: t.alto, fondo: t.fondo, fondoBase: t.fondoBase });
  visor.actualizar(arbol, colorDe, { reencuadrar });
  $("vacio").hidden = arbol.piezas.length > 0;
  if (!arbol.piezas.length) $("vacio").textContent = "Escribe un nombre para ver tu árbol.";
  $("pista-3d").hidden = !arbol.piezas.length;
  pintarPedido();
  pintarTaller();
  try { history.replaceState(null, "", `${location.pathname}${location.search}#a=${codificarArbol(d)}`); } catch { /* sin historial */ }
}

// ---------- Controles ----------
function pintarTamanos() {
  const c = $("tamanos");
  c.replaceChildren();
  for (const t of ARBOL.tamanos) {
    const b = el("button", { type: "button" });
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(t.id === d.t));
    b.append(t.nombre, el("small", { textContent: dinero(precioArbol({ t: t.id }, tasas).bcv) }));
    b.addEventListener("click", () => { d.t = t.id; pintarTamanos(); recalcular({ reencuadrar: true }); });
    c.append(b);
  }
}

function pintarNombres() {
  const lista = $("nombres");
  lista.replaceChildren();
  d.n.forEach((f, i) => {
    const entrada = el("input", { value: f.x, maxLength: ARBOL.maxLetras + 2, autocomplete: "off", ariaLabel: `Nombre ${i + 1}`, placeholder: "NOMBRE" });
    entrada.setAttribute("autocapitalize", "characters");
    entrada.setAttribute("enterkeyhint", "done");
    entrada.addEventListener("input", () => {
      const limpio = limpiarNombre(entrada.value, true);
      if (limpio !== entrada.value) entrada.value = limpio;
      f.x = limpio;
      recalcular();
    });
    entrada.addEventListener("blur", () => { f.x = limpiarNombre(f.x); entrada.value = f.x; });
    const punto = el("button", { type: "button", className: "punto", ariaLabel: `Color de ${f.x || "la fila"}: ${nombreColor(f.c)}`, title: nombreColor(f.c) });
    punto.style.background = colorDe(f.c).hex;
    punto.setAttribute("aria-expanded", String(abierto === i));
    punto.addEventListener("click", () => { abierto = abierto === i ? -1 : i; pintarNombres(); });
    const sube = el("button", { type: "button", className: "mini", textContent: "↑", ariaLabel: "Subir", disabled: i === 0 });
    sube.addEventListener("click", () => mover(i, -1));
    const baja = el("button", { type: "button", className: "mini", textContent: "↓", ariaLabel: "Bajar", disabled: i === d.n.length - 1 });
    baja.addEventListener("click", () => mover(i, 1));
    const quita = el("button", { type: "button", className: "mini quita", textContent: "✕", ariaLabel: "Quitar", disabled: d.n.length === 1 });
    quita.addEventListener("click", () => { d.n.splice(i, 1); abierto = -1; pintarNombres(); recalcular({ reencuadrar: true }); });
    const caja = el("div", { className: "nombre" }, el("div", { className: "nombre-linea" },
      el("span", { className: "orden", textContent: String(i + 1) }), entrada, punto, sube, baja, quita));
    if (abierto === i) {
      const m = el("div", { className: "muestras" });
      m.setAttribute("role", "radiogroup");
      muestras(m, f.c, (id) => { f.c = id; abierto = -1; pintarNombres(); recalcular(); }, true);
      caja.append(m);
    }
    lista.append(caja);
  });
  $("btn-nombre").hidden = d.n.length >= ARBOL.maxNombres;
}

function mover(i, paso) {
  const j = i + paso;
  if (j < 0 || j >= d.n.length) return;
  [d.n[i], d.n[j]] = [d.n[j], d.n[i]];
  abierto = -1;
  pintarNombres();
  recalcular();
}

function pintarEstrellaYAno() {
  muestras($("color-estrella"), d.e, (id) => { d.e = id; pintarEstrellaYAno(); recalcular(); });
  for (const b of $("con-ano").children) b.setAttribute("aria-checked", String((b.dataset.ano === "si") === !!d.a));
  $("bloque-ano").hidden = !d.a;
  if (d.a) {
    if (document.activeElement !== $("ano")) $("ano").value = d.a.y;
    muestras($("color-ano"), d.a.c, (id) => { d.a.c = id; pintarEstrellaYAno(); recalcular(); });
  }
}

// ---------- Pedido ----------
function pintarPedido() {
  const t = tamanoDe(d);
  const p = precioArbol(d, tasas);
  const g = paraGeometria(d);
  const hay = arbol && arbol.piezas.length > 0;
  const cm = (mm) => (mm / 10).toFixed(1).replace(".", ",");
  let medidas = "";
  if (hay) {
    const filas = arbol.piezas.filter((x) => x.tipo === "fila");
    const ancha = filas.reduce((a, b) => (b.ancho > a.ancho ? b : a));
    const ano = arbol.piezas.find((x) => x.tipo === "ano");
    medidas = `Tu árbol mide ${cm(arbol.alto)} cm de alto${ano ? ", con la estrella y el año" : ", con la estrella"}; `
      + `${cm(arbol.ancho)} cm de ancho en la fila más ancha (${ancha.texto}) y ${String(t.fondo / 10).replace(".", ",")} cm de fondo${arbol.fondoBase > arbol.fondo ? ` (la base, ${String(arbol.fondoBase / 10).replace(".", ",")} cm, para que pare mejor)` : ""}.`
      + (ano ? ` El año mide ${cm(ano.caja.x1 - ano.caja.x0)} cm de ancho y ${cm(ano.alto)} de alto.` : "");
  }
  $("medidas").textContent = medidas;
  const det = $("detalle");
  det.replaceChildren();
  const linea = (texto, monto, clase = "") => det.append(el("div", { className: "linea " + clase },
    el("span", { textContent: texto }), el("span", { textContent: monto })));
  linea(`Árbol de ${t.nombre}, ${g.nombres.length} nombre${g.nombres.length === 1 ? "" : "s"}${g.ano ? " y año " + g.ano.texto : ""}`, "");
  linea("Total a tasa BCV", dinero(p.bcv), "total");
  linea("Si pagas en divisas", dinero(p.usd));
  const notas = $("notas");
  notas.replaceChildren();
  if (hay) {
    for (const e of arbol.errores) notas.append(el("li", { className: "error-nota", textContent: e }));
    for (const a of arbol.avisos) notas.append(el("li", { className: "aviso-nota", textContent: a }));
  }
  if (g.ano == null && d.a) notas.append(el("li", { className: "aviso-nota", textContent: "Escribe los cuatro números del año." }));
  $("total").textContent = dinero(p.bcv);
  $("total-divisas").textContent = `${dinero(p.usd)} en divisas`;
  $("btn-pedir").disabled = !hay || arbol.errores.length > 0;
  const bs = Math.round(p.bcv * tasas.bcv).toLocaleString("es-VE");
  $("texto-pagos").textContent = `A tasa BCV son unos Bs ${bs} (tasa ${tasas.delDia ? "de hoy" : "del " + tasas.fecha}). `
    + `Pagas por ${TIENDA.pagos[0].toLowerCase() + TIENDA.pagos.slice(1)}. El precio es el mismo con los colores que elijas.`;
}

// ---------- Taller ----------
function pintarTaller() {
  if (!esTaller) return;
  $("taller").hidden = false;
  const c = $("tabla-taller");
  c.replaceChildren();
  if (!arbol || !arbol.piezas.length) return;
  const tabla = el("table");
  tabla.append(el("tr", {}, el("th", { textContent: "Pieza" }), el("th", { textContent: "Medida (mm)" }), el("th", { textContent: "Apoyo" })));
  arbol.piezas.forEach((p, i) => {
    const punto = el("span", { className: "color-pieza" });
    punto.style.background = colorDe(p.color).hex;
    const medida = `${(p.caja.x1 - p.caja.x0).toFixed(1)} × ${(p.caja.y1 - p.caja.y0).toFixed(1)}` + (p.altoLetra ? ` · letra ${p.altoLetra.toFixed(1)}` : "");
    tabla.append(el("tr", {},
      el("td", {}, punto, nombreDeArchivo(p, i + 1, nombreColor(p.color)).replace(".stl", "")),
      el("td", { textContent: medida }),
      el("td", { textContent: [p.contacto != null ? `${p.contacto.toFixed(1)} mm` : "", p.acoples ? `${p.acoples.n} pestaña${p.acoples.n > 1 ? "s" : ""} de ${p.acoples.ancho} × ${p.acoples.alto}` : ""].filter(Boolean).join(" · ") })));
  });
  c.append(tabla);
  const mal = arbol.errores.length > 0;
  $("btn-zip").disabled = mal;
  $("estado-zip").textContent = mal ? "Hay una pieza que no sale bien (en rojo, arriba). Corrígela antes de descargar." : "";
  $("estado-zip").classList.toggle("error-nota", mal);
}

$("btn-zip").addEventListener("click", () => {
  if (!arbol || arbol.errores.length) return;
  const g = paraGeometria(d);
  const titulo = `Árbol de Navidad de ${tamanoDe(d).nombre}: ${g.nombres.map((n) => n.texto).join(", ")}${g.ano ? ", año " + g.ano.texto : ""}`;
  const zip = zipDeTaller(arbol, {
    nombreColor, titulo,
    notas: ["Cómo se lamina: " + ARBOL.laminado, ...arbol.avisos.map((a) => "Aviso: " + a), "Diseño: " + location.href],
  });
  const nombre = `arbol-${tamanoDe(d).id}cm-${g.nombres.map((n) => n.texto).join("-").normalize("NFD").replace(/[^A-Za-z0-9-]/g, "").toLowerCase().slice(0, 60)}.zip`;
  const a = el("a", { href: URL.createObjectURL(new Blob([zip], { type: "application/zip" })), download: nombre });
  document.body.append(a); a.click(); a.remove();
  $("estado-zip").textContent = `Descargado ${nombre} (${arbol.piezas.length} piezas).`;
});

// ---------- Eventos sueltos ----------
$("btn-nombre").addEventListener("click", () => {
  if (d.n.length >= ARBOL.maxNombres) return;
  const ultimo = d.n[d.n.length - 1];
  d.n.push({ x: "", c: ultimo && ultimo.c === "rojo" ? "verde" : "rojo" });
  pintarNombres();
  $("nombres").lastElementChild.querySelector("input").focus();
  recalcular({ reencuadrar: true });
});
for (const b of $("con-ano").children) {
  b.addEventListener("click", () => {
    if (b.dataset.ano === "si") d.a = d.a || { ...anoGuardado };
    else { if (d.a) anoGuardado = { ...d.a }; d.a = null; }
    pintarEstrellaYAno();
    recalcular({ reencuadrar: true });
  });
}
$("ano").addEventListener("input", () => {
  const y = limpiarAno($("ano").value);
  $("ano").value = y;
  if (d.a) d.a.y = y;
  recalcular();
});
$("btn-medidas").addEventListener("click", () => {
  const si = $("btn-medidas").getAttribute("aria-pressed") !== "true";
  $("btn-medidas").setAttribute("aria-pressed", String(si));
  visor.mostrarCotas(si);
  visor.centrar();
});
$("btn-centrar").addEventListener("click", () => visor.centrar());
$("btn-navidad").addEventListener("click", () => {
  // Se alterna desde abajo: el nombre que queda sobre el año siempre es verde.
  d.n.forEach((f, i) => { f.c = (d.n.length - 1 - i) % 2 ? "rojo" : "verde"; });
  d.e = "amarillo";
  if (d.a) d.a.c = "cafe";
  abierto = -1;
  pintarNombres(); pintarEstrellaYAno(); recalcular();
});

// ---------- Pedido por WhatsApp ----------
const dlg = $("dlg-pedido");
let textoPedido = "";
let fotoBlob = null;

function cargarImagen(src) {
  return new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
}

async function componerFoto() {
  const W = 1080, H = 1500;
  const c = el("canvas", { width: W, height: H });
  const x = c.getContext("2d");
  x.fillStyle = "#FBF4EE";
  x.fillRect(0, 0, W, H);
  try {
    const logo = await cargarImagen("recursos/corinne-logo-horizontal-color.svg");
    const lw = 380, lh = (logo.height / logo.width) * lw || 56;
    x.drawImage(logo, (W - lw) / 2, 50, lw, lh);
  } catch { /* sin logo, sigue */ }
  x.fillStyle = "#FFFFFF";
  x.beginPath(); x.roundRect(40, 160, W - 80, 1080, 32); x.fill();
  const img = await cargarImagen(visor.foto(1000, 1040));
  x.drawImage(img, 40, 180, 1000, 1040);
  const p = precioArbol(d, tasas);
  x.fillStyle = "#2C2F66";
  x.textAlign = "center";
  x.font = "800 44px Montserrat, sans-serif";
  x.fillText(`Árbol de Navidad de ${tamanoDe(d).nombre}`, W / 2, 1320);
  x.font = "700 38px Montserrat, sans-serif";
  x.fillText(`Total ${dinero(p.bcv)} a tasa BCV · ${dinero(p.usd)} en divisas`, W / 2, 1390);
  return new Promise((ok) => c.toBlob(ok, "image/png"));
}

$("btn-pedir").addEventListener("click", () => {
  const datos = leer("corinne-datos", {});
  $("dato-nombre").value = datos.nombre || "";
  $("dato-tel").value = datos.telefono || "";
  $("form-datos").hidden = false;
  $("paso-envio").hidden = true;
  $("pedido-titulo").textContent = "Tu pedido";
  dlg.showModal();
});
$("pedido-cerrar").addEventListener("click", () => dlg.close());

$("form-datos").addEventListener("submit", async (e) => {
  e.preventDefault();
  const datos = { nombre: $("dato-nombre").value.trim(), telefono: $("dato-tel").value.trim() };
  if (!datos.nombre || !datos.telefono) return;
  guardar("corinne-datos", datos);
  const enlace = `${location.origin}${location.pathname}#a=${codificarArbol(d)}`;
  textoPedido = mensajeArbol(d, datos, enlace, tasas);
  $("form-datos").hidden = true;
  $("paso-envio").hidden = false;
  $("pedido-titulo").textContent = "Tu pedido está listo";
  $("btn-whatsapp").href = enlaceWhatsApp(textoPedido);
  $("estado-envio").textContent = "Preparando la foto…";
  fotoBlob = await componerFoto();
  $("foto-pedido").src = URL.createObjectURL(fotoBlob);
  $("estado-envio").textContent = "";
});

$("btn-foto").addEventListener("click", async () => {
  if (!fotoBlob) return;
  const archivo = new File([fotoBlob], "mi-arbol-corinne.png", { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      await navigator.share({ files: [archivo], title: "Mi árbol de Navidad" });
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": fotoBlob })]);
    $("estado-envio").textContent = "Foto copiada. En el chat de WhatsApp, mantén presionado y toca Pegar.";
    return;
  } catch { /* sin portapapeles de imágenes */ }
  const a = el("a", { href: URL.createObjectURL(fotoBlob), download: archivo.name });
  document.body.append(a); a.click(); a.remove();
  $("estado-envio").textContent = "Foto descargada. Adjúntala en el chat de WhatsApp.";
});

$("btn-copiar").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(textoPedido);
    $("estado-envio").textContent = "Texto copiado.";
  } catch {
    $("estado-envio").textContent = "No se pudo copiar. Mantén presionado el botón de WhatsApp para abrirlo.";
  }
});

// ---------- Tasas del día (la misma fuente que usa Taller 3D) ----------
async function traerTasas() {
  try {
    const r = await fetch("https://ve.dolarapi.com/v1/dolares", { cache: "no-store" });
    if (!r.ok) return;
    const lista = await r.json();
    const de = (f) => Number((lista.find((x) => x.fuente === f) || {}).promedio);
    const bcv = de("oficial"), paralelo = de("paralelo");
    // Solo se aceptan tasas con sentido: las dos positivas y el paralelo no más del doble del BCV.
    if (!(bcv > 0) || !(paralelo >= bcv) || paralelo > bcv * 2) return;
    tasas = { bcv, paralelo, fecha: new Date().toLocaleDateString("es-VE"), delDia: true };
    pintarTamanos();
    pintarPedido();
  } catch { /* sin conexión: quedan las de respaldo */ }
}

// ---------- Arranque ----------
$("pista-3d").textContent = matchMedia("(pointer: coarse)").matches
  ? "Un dedo gira · dos dedos mueven y acercan"
  : "Arrastra para girar · Shift y arrastra para mover · rueda para acercar";
$("max-nombres").textContent = ARBOL.maxNombres;
$("max-letras").textContent = ARBOL.maxLetras;
const codigo = (location.hash.match(/a=([A-Za-z0-9_-]+)/) || [])[1];
const deEnlace = codigo ? decodificarArbol(codigo) : null;
if (deEnlace && deEnlace.n.length) {
  d = deEnlace;
  if (d.a) anoGuardado = { ...d.a };
  $("aviso-enlace").hidden = !document.referrer || esTaller;
}
pintarTamanos();
pintarNombres();
pintarEstrellaYAno();
pintarPedido();
traerTasas();
cargarFuente("recursos/fuentes/Anton-Regular.ttf")
  .then((f) => { fuente = f; recalcular({ reencuadrar: true }); })
  .catch(() => { $("vacio").hidden = false; $("vacio").textContent = "No se pudo cargar el árbol. Revisa tu conexión y recarga la página."; });
window.__arbol = { get diseno() { return d; }, get resultado() { return arbol; }, visor };
