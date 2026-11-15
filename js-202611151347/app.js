// Interfaz del configurador.
import {
  TIENDA, PRECIOS, MAX_TECLAS, TIPOGRAFIAS, BASES, COLGANTES, CHARMS, OBJETOS,
  SIMBOLOS, colorPorId, disponibles,
} from "./catalogo.js";
import { nuevoDiseno, ponerPalabra, normalizar, decodificar, codificar, estaVacio, limpiarPalabra, admiteCharms } from "./diseno.js";
import { desglose, totalPedido, dinero } from "./precio.js";
import { formaCharm } from "./formas.js";
import { mensaje, enlaceWhatsApp, componerImagen } from "./pedido.js";
import { Visor } from "./visor.js";

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...hijos) => {
  const e = Object.assign(document.createElement(tag), props);
  for (const h of hijos) e.append(h);
  return e;
};

const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
const leer = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };

let d = nuevoDiseno();
let carrito = (leer("corinne-carrito", []) || []).map(normalizar).filter((x) => !estaVacio(x));
let modo = "iguales";
let teclaEditada = -1;

const visor = new Visor($("lienzo"));
visor.alTocarTecla = (i) => abrirEditor(i);

// ---------- Utilidades de color ----------
function luz(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  const [x, y] = [luz(colorPorId(a).hex), luz(colorPorId(b).hex)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

function muestras(contenedor, lista, actual, alElegir, { chicas = false } = {}) {
  contenedor.replaceChildren();
  contenedor.classList.toggle("chicas", chicas);
  for (const c of lista) {
    const b = el("button", {
      type: "button", className: "muestra" + (c.id === "menta" ? " brillo" : ""),
      title: c.nombre, ariaLabel: c.nombre,
    });
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(c.id === actual));
    b.style.background = c.hex;
    b.addEventListener("click", () => alElegir(c.id));
    contenedor.append(b);
  }
}

function segmento(contenedor, lista, actual, alElegir, etiqueta = (x) => x.nombre) {
  contenedor.replaceChildren();
  for (const x of lista) {
    const b = el("button", { type: "button" });
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(x.id === actual));
    const e = etiqueta(x);
    if (typeof e === "string") b.textContent = e; else b.append(e);
    b.addEventListener("click", () => alElegir(x.id));
    contenedor.append(b);
  }
}

function iconoForma(forma, color) {
  const f = formaCharm(forma);
  const todos = [f.contorno, ...f.huecos].flat();
  const xs = todos.map((p) => p[0]), ys = todos.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const camino = [f.contorno, ...f.huecos]
    .map((p) => "M" + p.map(([x, y]) => `${(x - x0).toFixed(2)} ${(y1 - y).toFixed(2)}`).join("L") + "Z")
    .join("");
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `-1 -1 ${x1 - x0 + 2} ${y1 - y0 + 2}`);
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", camino);
  p.setAttribute("fill", color);
  p.setAttribute("fill-rule", "evenodd");
  p.setAttribute("stroke", "rgba(44,47,102,.35)");
  p.setAttribute("stroke-width", ".5");
  svg.append(p);
  return svg;
}

const ICONOS_OBJETO = {
  mantequilla: `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="16" width="32" height="16" rx="4" fill="#7fd9c0"/><rect x="9" y="9" width="22" height="9" rx="3" fill="#f6e39a"/></svg>`,
  emergencia: `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="5" y="14" width="30" height="20" rx="4" fill="#f2c81c"/><ellipse cx="20" cy="14" rx="11" ry="3" fill="#9a9a9a"/><path d="M10 14a10 8 0 0 1 20 0z" fill="#d62424"/></svg>`,
  creeper: `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="6" y="6" width="28" height="28" rx="2" fill="#5bbf3a"/><rect x="11" y="11" width="7" height="7" fill="#1b1b1b"/><rect x="22" y="11" width="7" height="7" fill="#1b1b1b"/><rect x="17" y="18" width="6" height="5" fill="#1b1b1b"/><rect x="14" y="22" width="4" height="7" fill="#1b1b1b"/><rect x="22" y="22" width="4" height="7" fill="#1b1b1b"/></svg>`,
};

// ---------- Pintar la interfaz ----------
function pintar({ reencuadrar = false } = {}) {
  const cols = disponibles();
  if ($("palabra").value !== d.w && document.activeElement !== $("palabra")) $("palabra").value = d.w;
  $("vacio").hidden = !estaVacio(d);
  $("pista-3d").hidden = estaVacio(d);

  segmento($("tipo-base"), BASES, d.b.t, (id) => { d.b.t = id; cambio(); });
  muestras($("color-base"), cols, d.b.c, (id) => { d.b.c = id; cambio(); });

  for (const b of $("modo-teclas").children) b.setAttribute("aria-checked", String(b.dataset.modo === modo));
  $("bloque-iguales").hidden = modo !== "iguales";
  $("bloque-combinadas").hidden = modo !== "combinadas";
  const k0 = d.k[0] || { c: "blanco", l: "negro" };
  muestras($("color-teclas"), cols, k0.c, (id) => { d.k = d.k.map((t) => ({ ...t, c: id })); porDefecto.c = id; cambio(); });
  muestras($("color-letras"), cols, k0.l, (id) => { d.k = d.k.map((t) => ({ ...t, l: id })); porDefecto.l = id; cambio(); });

  const fila = $("fila-teclas");
  fila.replaceChildren();
  Array.from(d.w).forEach((ch, i) => {
    const b = el("button", { type: "button", textContent: ch, ariaLabel: `Tecla ${i + 1}: ${ch}` });
    b.style.background = colorPorId(d.k[i].c).hex;
    b.style.color = colorPorId(d.k[i].l).hex;
    b.addEventListener("click", () => abrirEditor(i));
    fila.append(b);
  });
  if (!d.w) fila.append(el("p", { className: "ayuda", textContent: "Primero escribe tu palabra." }));

  segmento($("tipografia"), TIPOGRAFIAS, d.f, (id) => { d.f = id; cambio(); }, (t) => {
    const s = el("span");
    const m = el("span", { className: "muestra-fuente", textContent: "Abc" });
    m.style.font = t.css.replace("1px", "18px");
    s.append(m, t.nombre);
    return s;
  });

  // Lo que cuelga del clicker: una de tres opciones.
  const cg = $("colgantes");
  cg.replaceChildren();
  for (const c of COLGANTES) {
    cg.append(opcion(c, d.g.t === c.id, () => {
      d.g = { t: c.id, c: c.filamento ? (colorPorId(d.g.c) ? d.g.c : d.b.c) : null };
      const tenia = d.ch.length + d.p.length;
      if (!admiteCharms(d)) { d.ch = []; d.p = []; }
      cambio();
      if (tenia && !admiteCharms(d)) avisar("Los charms van solo con el llavero metálico: los quitamos");
    }));
  }
  const impreso = COLGANTES.find((c) => c.id === d.g.t)?.filamento;
  $("bloque-impreso").hidden = !impreso;
  if (impreso) muestras($("color-colgante"), disponibles(), d.g.c, (id) => { d.g.c = id; cambio(); }, { chicas: true });

  $("bloque-charms").hidden = !admiteCharms(d);
  $("nota-charms").hidden = admiteCharms(d);
  pintarCatalogos();
  pintarAgregados();
  pintarPersonalizados();
  pintarPedido();
  visor.actualizar(d, { reencuadrar });
}

function pintarCatalogos() {
  const ch = $("cat-charms");
  ch.replaceChildren();
  for (const c of CHARMS) {
    const b = el("button", { type: "button", className: "item" });
    b.append(iconoForma(c.forma, colorPorId(c.color).hex), el("span", { textContent: c.nombre }),
      el("small", { textContent: `+${dinero(c.precio)}` }));
    marcarElegido(b, d.ch, c.id);
    b.addEventListener("click", () => alternar(d.ch, { id: c.id, c: c.color }, `Charm ${c.nombre.toLowerCase()}`));
    ch.append(b);
  }
}

// Un toque pone la pieza y otro la quita (con todas sus copias). Para llevar dos iguales está
// «+ Otro igual» en la lista de lo agregado: así tocar de más no va sumando piezas sin querer.
function opcion(c, elegida, alElegir) {
  const b = el("button", { type: "button", className: "opcion" },
    el("span", { textContent: c.nombre }),
    el("small", { textContent: c.precio ? `+${dinero(c.precio)}` : c.nota || "" }));
  b.setAttribute("role", "radio");
  b.setAttribute("aria-checked", String(elegida));
  b.addEventListener("click", alElegir);
  return b;
}

function alternar(lista, nuevo, nombre) {
  if (lista.some((x) => x.id === nuevo.id)) {
    for (let i = lista.length - 1; i >= 0; i--) if (lista[i].id === nuevo.id) lista.splice(i, 1);
    cambio();
    avisar(`${nombre} quitado`);
  } else {
    lista.push(nuevo);
    cambio();
    avisar(`${nombre} agregado`);
  }
}

function marcarElegido(boton, lista, id) {
  const n = lista.filter((x) => x.id === id).length;
  boton.setAttribute("aria-pressed", String(n > 0));
  if (n > 1) boton.append(el("span", { className: "cuenta", textContent: `×${n}` }));
}

function pintarAgregados() {
  const cont = $("agregados");
  cont.replaceChildren();
  const filas = [
    ...d.ch.map((x, i) => ({ lista: d.ch, i, nombre: "Charm " + CHARMS.find((y) => y.id === x.id).nombre.toLowerCase() })),
  ];
  if (filas.length) cont.append(el("p", { className: "etiqueta", textContent: "Lo que agregaste (toca un color para cambiarlo)" }));
  for (const f of filas) {
    const item = f.lista[f.i];
    const quitar = el("button", { type: "button", className: "quitar", textContent: "Quitar" });
    quitar.addEventListener("click", () => { f.lista.splice(f.i, 1); cambio(); });
    const otro = el("button", { type: "button", className: "otro", textContent: "+ Otro igual" });
    otro.addEventListener("click", () => { f.lista.splice(f.i + 1, 0, { ...item }); cambio(); avisar("Agregado otro igual"); });
    const tira = el("div", { className: "muestras" });
    muestras(tira, disponibles(), item.c, (id) => { item.c = id; cambio(); }, { chicas: true });
    cont.append(el("div", { className: "agregado" },
      el("div", { className: "agregado-cabeza" }, el("span", { textContent: f.nombre }),
        el("span", { className: "acciones" }, otro, quitar)), tira));
  }
  d.o.forEach((o, i) => {
    const quitar = el("button", { type: "button", className: "quitar", textContent: "Quitar" });
    quitar.addEventListener("click", () => { d.o.splice(i, 1); cambio({ reencuadrar: true }); });
    cont.append(el("div", { className: "agregado" },
      el("div", { className: "agregado-cabeza" },
        el("span", { textContent: "Clicker " + OBJETOS.find((y) => y.id === o.id).nombre.toLowerCase() }), quitar)));
  });
}

function pintarPersonalizados() {
  const cont = $("personalizados");
  if (cont.contains(document.activeElement)) return; // no interrumpir mientras escribe
  cont.replaceChildren();
  d.p.forEach((texto, i) => {
    const inp = el("input", { className: "campo", value: texto, placeholder: "Ej.: una mariquita roja", maxLength: 80 });
    inp.setAttribute("aria-label", `Charm personalizado ${i + 1}`);
    inp.addEventListener("input", () => { d.p[i] = inp.value; cambio({ sinPintar: true }); pintarPedido(); });
    inp.addEventListener("blur", () => { if (!inp.value.trim()) { d.p.splice(i, 1); cambio(); } });
    const q = el("button", { type: "button", className: "quitar", textContent: "Quitar" });
    q.addEventListener("click", () => { d.p.splice(i, 1); cambio(); });
    cont.append(el("div", { className: "personalizado" }, inp, q));
  });
}

function filaDetalle(texto, monto, clase = "") {
  return el("tr", { className: clase }, el("td", { textContent: texto }), el("td", { textContent: dinero(monto) }));
}

function pintarPedido() {
  const car = $("carrito");
  car.replaceChildren();
  carrito.forEach((x, i) => {
    const editar = el("button", { type: "button", textContent: "Editar" });
    editar.addEventListener("click", () => {
      if (!estaVacio(d)) carrito.push(normalizar(d));
      d = carrito.splice(i, 1)[0];
      modo = d.k.every((t) => t.c === d.k[0].c && t.l === d.k[0].l) ? "iguales" : "combinadas";
      cambio({ reencuadrar: true });
      $("lienzo").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const quitar = el("button", { type: "button", textContent: "Quitar" });
    quitar.addEventListener("click", () => { carrito.splice(i, 1); cambio(); });
    car.append(el("div", { className: "guardado" },
      el("span", {}, `Clicker ${i + 1}: `, el("strong", { textContent: x.w || x.o.map((o) => OBJETOS.find((y) => y.id === o.id).nombre).join(" + ") })),
      el("span", { className: "acciones" }, el("span", { textContent: dinero(desglose(x).total) }), editar, quitar)));
  });

  const det = $("detalle");
  det.replaceChildren();
  if (!estaVacio(d)) {
    const { lineas, total } = desglose(d);
    const t = el("table");
    if (carrito.length) t.append(el("tr", {}, el("td", { colSpan: 2, innerHTML: `<strong>Clicker ${carrito.length + 1} (el que estás armando)</strong>` })));
    lineas.forEach((l) => t.append(filaDetalle(l.texto + (l.porConfirmar ? " (por confirmar)" : ""), l.monto)));
    t.append(filaDetalle("Subtotal", total, "sub"));
    det.append(t);
  }
  const todos = pedidoCompleto();
  $("total").textContent = dinero(totalPedido(todos));
  $("btn-pedir").disabled = todos.length === 0;
  $("btn-otro").disabled = estaVacio(d);
}

const pedidoCompleto = () => [...carrito, ...(estaVacio(d) ? [] : [normalizar(d)])];

// ---------- Cambios ----------
let tEnlace = 0;
function cambio({ reencuadrar = false, sinPintar = false } = {}) {
  guardar("corinne-carrito", carrito);
  clearTimeout(tEnlace);
  tEnlace = setTimeout(() => {
    const h = estaVacio(d) ? " " : `#d=${codificar(d)}`;
    history.replaceState(null, "", h === " " ? location.pathname : h);
  }, 250);
  if (!sinPintar) pintar({ reencuadrar });
}

let avisoT = 0;
function avisar(texto) {
  const s = $("aviso");
  s.textContent = texto;
  clearTimeout(avisoT);
  avisoT = setTimeout(() => { s.textContent = ""; }, 2500);
}

// Colores que se usan para teclas nuevas en modo "todas iguales".
const porDefecto = { c: "blanco", l: "negro" };

$("palabra").addEventListener("input", (e) => {
  const limpia = limpiarPalabra(e.target.value);
  const antes = Array.from(d.w).length;
  const base = modo === "iguales" && d.k[0] ? { ...d.k[0] } : porDefecto;
  d = ponerPalabra(d, limpia, base);
  if (e.target.value.toUpperCase().replace(/\s/g, "") !== limpia) e.target.value = limpia;
  cambio({ reencuadrar: Math.abs(Array.from(d.w).length - antes) > 0 });
});

const simbolos = $("simbolos");
for (const s of SIMBOLOS) {
  const b = el("button", { type: "button", textContent: s, ariaLabel: `Agregar ${s}` });
  b.addEventListener("click", () => {
    const inp = $("palabra");
    inp.value = limpiarPalabra(inp.value + s);
    inp.dispatchEvent(new Event("input"));
  });
  simbolos.append(b);
}

for (const b of $("modo-teclas").children) {
  b.addEventListener("click", () => {
    modo = b.dataset.modo;
    if (modo === "iguales" && d.k.length) d.k = d.k.map(() => ({ ...d.k[0] }));
    cambio();
  });
}

$("btn-centrar").addEventListener("click", () => visor.centrar());

$("btn-azar").addEventListener("click", () => {
  const cols = disponibles();
  const azar = (l) => l[Math.floor(Math.random() * l.length)];
  const legible = (fondo) => {
    const ok = cols.filter((c) => c.id !== fondo && contraste(c.id, fondo) >= 2.6);
    return azar(ok.length ? ok : cols.filter((c) => c.id !== fondo)).id;
  };
  d.b.c = azar(cols).id;
  const paleta = [...cols].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2)).map((c) => c.id);
  if (modo === "iguales") {
    const c = azar(paleta);
    const l = legible(c);
    d.k = d.k.map(() => ({ c, l }));
  } else {
    d.k = d.k.map((_, i) => { const c = paleta[i % paleta.length]; return { c, l: legible(c) }; });
  }
  d.ch = d.ch.map((x) => ({ ...x, c: azar(cols).id }));
  if (COLGANTES.find((c) => c.id === d.g.t)?.filamento) d.g.c = azar(cols).id;
  cambio();
});

$("btn-personalizado").addEventListener("click", () => {
  d.p.push("");
  pintarPersonalizados();
  const ins = $("personalizados").querySelectorAll("input");
  ins[ins.length - 1]?.focus();
});

$("btn-otro").addEventListener("click", () => {
  if (estaVacio(d)) return;
  carrito.push(normalizar(d));
  const { g } = d;
  d = nuevoDiseno();
  d.g = { ...g };
  modo = "iguales";
  $("palabra").value = "";
  cambio({ reencuadrar: true });
  $("palabra").focus();
  avisar("Guardado. Arma el siguiente.");
});

// ---------- Editor de tecla ----------
const editor = $("editor");
function abrirEditor(i) {
  if (!d.w || i < 0 || i >= d.k.length) return;
  if (modo !== "combinadas") { modo = "combinadas"; pintar(); }
  teclaEditada = i;
  pintarEditor();
  visor.marcar(i);
  if (!editor.open) editor.showModal();
}
function pintarEditor() {
  const i = teclaEditada;
  const letras = Array.from(d.w);
  $("editor-titulo").textContent = `Tecla ${i + 1} de ${letras.length}`;
  $("editor-letra").value = letras[i];
  muestras($("editor-tecla"), disponibles(), d.k[i].c, (id) => { d.k[i].c = id; cambio(); pintarEditor(); visor.marcar(i); }, { chicas: true });
  muestras($("editor-color-letra"), disponibles(), d.k[i].l, (id) => { d.k[i].l = id; cambio(); pintarEditor(); visor.marcar(i); }, { chicas: true });
  $("editor-ant").disabled = i === 0;
  $("editor-sig").disabled = i === letras.length - 1;
}
$("editor-letra").addEventListener("input", (e) => {
  const v = limpiarPalabra(e.target.value);
  const ch = Array.from(v).pop();
  if (!ch) return;
  const letras = Array.from(d.w);
  letras[teclaEditada] = ch;
  d.w = letras.join("");
  e.target.value = ch;
  cambio();
  visor.marcar(teclaEditada);
});
$("editor-ant").addEventListener("click", () => abrirEditor(teclaEditada - 1));
$("editor-sig").addEventListener("click", () => abrirEditor(teclaEditada + 1));
$("editor-quitar").addEventListener("click", () => {
  const letras = Array.from(d.w);
  letras.splice(teclaEditada, 1);
  d.k.splice(teclaEditada, 1);
  d.w = letras.join("");
  cambio({ reencuadrar: true });
  if (!d.w) { editor.close(); return; }
  abrirEditor(Math.min(teclaEditada, letras.length - 1));
});
editor.addEventListener("close", () => { teclaEditada = -1; visor.marcar(-1); });

// ---------- Pedido ----------
const dlg = $("dlg-pedido");
let textoPedido = "";
let fotoBlob = null;

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
  const todos = pedidoCompleto();
  textoPedido = mensaje(todos, datos);
  $("form-datos").hidden = true;
  $("paso-envio").hidden = false;
  $("pedido-titulo").textContent = "Tu pedido está listo";
  $("btn-whatsapp").href = enlaceWhatsApp(textoPedido);
  $("estado-envio").textContent = "Preparando la foto…";
  // Una foto por clicker: se pinta cada diseño en el visor y se vuelve al actual.
  const actual = d;
  const fotos = [];
  for (const x of todos) {
    visor.actualizar(x);
    fotos.push(visor.foto());
  }
  d = actual;
  visor.actualizar(d);
  fotoBlob = await componerImagen(fotos, todos);
  $("foto-pedido").src = URL.createObjectURL(fotoBlob);
  $("estado-envio").textContent = "";
});

$("btn-foto").addEventListener("click", async () => {
  if (!fotoBlob) return;
  const archivo = new File([fotoBlob], "mi-clicker-corinne.png", { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      await navigator.share({ files: [archivo], title: "Mi clicker" });
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

// ---------- Arranque ----------
$("max-teclas").textContent = MAX_TECLAS;
$("precio-tecla").textContent = dinero(PRECIOS.tecla);
$("precio-personalizado").textContent = dinero(PRECIOS.charmPersonalizado);
$("texto-pagos").textContent = `${TIENDA.moneda} Pagas por ${TIENDA.pagos.toLowerCase()}.`;

const codigo = (location.hash.match(/d=([A-Za-z0-9_-]+)/) || [])[1];
const deEnlace = codigo ? decodificar(codigo) : null;
if (deEnlace) {
  d = deEnlace;
  $("aviso-enlace").hidden = false;
  modo = d.k.every((t) => t.c === d.k[0].c && t.l === d.k[0].l) ? "iguales" : "combinadas";
} else {
  d = ponerPalabra(nuevoDiseno(), "CORINNE", { c: "blanco", l: "morado" });
  d.b.c = "beige";
  d.k = d.k.map((_, i) => ({ c: ["blanco", "menta", "beige"][i % 3], l: "morado" }));
  modo = "combinadas";
}
$("palabra").value = d.w;
pintar({ reencuadrar: true });
// Las letras de las teclas se dibujan con las fuentes de la página: al cargar, se repintan.
document.fonts.ready.then(() => Promise.all(TIPOGRAFIAS.map((t) => document.fonts.load(t.css.replace("1px", "40px"), "A"))))
  .then(() => visor.actualizar(d));

