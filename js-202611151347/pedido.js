// Mensaje de WhatsApp y foto del pedido.
import { TIENDA, TIPOGRAFIAS, BASES, COLGANTES, CHARMS, OBJETOS, colorPorId } from "./catalogo.js";
import { codificar } from "./diseno.js";
import { desglose, totalPedido, dinero } from "./precio.js";

const nombreColor = (id) => (colorPorId(id) || { nombre: id }).nombre;
const nombre = (lista, id) => (lista.find((x) => x.id === id) || { nombre: id }).nombre;

export function enlaceDe(d, base = location.origin + location.pathname) {
  return `${base}#d=${codificar(d)}`;
}

function bloqueClicker(d, i, varios) {
  const l = [];
  if (varios) l.push(`*Clicker ${i + 1}*`);
  const letras = Array.from(d.w);
  if (letras.length) {
    l.push(`🔤 Palabra: *${d.w}*`);
    l.push(`🧱 Base: ${nombreColor(d.b.c)} · ${nombre(BASES, d.b.t).replace("Base ", "")}`);
    l.push(`✍️ Tipografía: ${nombre(TIPOGRAFIAS, d.f)}`);
    l.push("");
    l.push("⌨️ Teclas:");
    letras.forEach((ch, k) => {
      l.push(`${k + 1}. ${ch} → tecla ${nombreColor(d.k[k].c)} · letra ${nombreColor(d.k[k].l)}`);
    });
  }
  const colg = COLGANTES.find((c) => c.id === d.g.t);
  const extras = [];
  if (colg) {
    let col = colg.colores ? ` ${colg.colores.find((c) => c.id === d.g.c)?.nombre.toLowerCase()}` : "";
    if (colg.filamento) col += ` · ${nombreColor(d.g.c)}`;
    extras.push(`🔗 ${colg.nombre}${col}`);
  }
  d.ch.forEach((c) => extras.push(`🌼 Charm ${nombre(CHARMS, c.id).toLowerCase()} · ${nombreColor(c.c)}`));
  d.p.forEach((p) => extras.push(`✨ Charm personalizado: ${p} (precio por confirmar)`));
  d.o.forEach((o) => extras.push(`🎁 Clicker de objeto: ${nombre(OBJETOS, o.id)}`));
  if (extras.length) {
    l.push("");
    l.push("Extras:");
    l.push(...extras);
  }
  l.push("");
  if (varios) l.push(`Subtotal: ${dinero(desglose(d).total)}`);
  l.push(`🔗 Mi diseño en 3D: ${enlaceDe(d)}`);
  return l.join("\n");
}

export function mensaje(disenos, datos) {
  const varios = disenos.length > 1;
  const partes = [
    `✨ ¡Hola ${TIENDA.nombre}! Quiero ${varios ? `estos ${disenos.length} clickers` : "este clicker"} ✨`,
    "",
    disenos.map((d, i) => bloqueClicker(d, i, varios)).join("\n\n"),
    "",
    `💰 *Total: ${dinero(totalPedido(disenos))}* (tasa BCV)`,
  ];
  if (disenos.some((d) => d.p.length)) partes.push("Los charms personalizados se confirman aparte.");
  partes.push("");
  partes.push(`👤 ${datos.nombre} · ${datos.telefono}`);
  partes.push("📸 A continuación te envío la foto de mi diseño 💜");
  return partes.join("\n");
}

export function enlaceWhatsApp(texto) {
  const num = (TIENDA.whatsapp || "").replace(/\D/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

function cargarImagen(src) {
  return new Promise((ok, mal) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = mal;
    i.src = src;
  });
}

// Arma una sola imagen con la foto de cada clicker, el logo y el total.
export async function componerImagen(fotos, disenos) {
  const W = 1080;
  const fila = 620;
  const H = 190 + fotos.length * fila + 150;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#FBF4EE";
  x.fillRect(0, 0, W, H);
  try {
    const logo = await cargarImagen("recursos/corinne-logo-horizontal-color.svg");
    const lw = 420, lh = (logo.height / logo.width) * lw || 62;
    x.drawImage(logo, (W - lw) / 2, 60, lw, lh);
  } catch { /* sin logo, sigue */ }
  for (let i = 0; i < fotos.length; i++) {
    const y = 190 + i * fila;
    x.fillStyle = "#FFFFFF";
    roundRect(x, 40, y, W - 80, fila - 30, 32);
    x.fill();
    const img = await cargarImagen(fotos[i]);
    const ih = fila - 130, iw = (img.width / img.height) * ih;
    x.drawImage(img, (W - iw) / 2, y + 10, iw, ih);
    x.fillStyle = "#2C2F66";
    x.font = "800 44px Montserrat, sans-serif";
    x.textAlign = "center";
    const titulo = disenos[i].w || disenos[i].o.map((o) => nombre(OBJETOS, o.id)).join(" + ");
    x.fillText(titulo, W / 2, y + fila - 70);
  }
  x.fillStyle = "#2C2F66";
  x.font = "700 40px Montserrat, sans-serif";
  x.textAlign = "center";
  x.fillText(`Total ${dinero(totalPedido(disenos))} (tasa BCV)`, W / 2, H - 70);
  return new Promise((ok) => c.toBlob(ok, "image/png"));
}

function roundRect(x, l, t, w, h, r) {
  x.beginPath();
  x.moveTo(l + r, t);
  x.arcTo(l + w, t, l + w, t + h, r);
  x.arcTo(l + w, t + h, l, t + h, r);
  x.arcTo(l, t + h, l, t, r);
  x.arcTo(l, t, l + w, t, r);
  x.closePath();
}
