// Precio de un clicker y del pedido, a partir del catálogo.
import { PRECIOS, COLGANTES, CHARMS, OBJETOS } from "./catalogo.js";

const buscar = (lista, id) => lista.find((x) => x.id === id);

// Devuelve las líneas del detalle y el total de un diseño.
export function desglose(d) {
  const lineas = [];
  const teclas = Array.from(d.w).length;
  if (teclas > 0) {
    lineas.push({ texto: `${teclas} tecla${teclas === 1 ? "" : "s"}`, monto: teclas * PRECIOS.tecla });
  }
  const colgante = buscar(COLGANTES, d.g.t);
  if (colgante && colgante.precio > 0) lineas.push({ texto: colgante.nombre, monto: colgante.precio });
  for (const c of d.ch) {
    const x = buscar(CHARMS, c.id);
    if (x) lineas.push({ texto: `Charm ${x.nombre.toLowerCase()}`, monto: x.precio });
  }
  for (const p of d.p) {
    lineas.push({ texto: `Charm personalizado: ${p}`, monto: PRECIOS.charmPersonalizado, porConfirmar: true });
  }
  d.o.forEach((o, i) => {
    const x = buscar(OBJETOS, o.id);
    if (!x) return;
    // Si no hay palabra, el primer objeto va solo con su cadena.
    const solo = teclas === 0 && i === 0;
    lineas.push({
      texto: `Clicker ${x.nombre.toLowerCase()}${solo ? " (con su cadena)" : ""}`,
      monto: solo ? PRECIOS.objetoSolo : PRECIOS.objetoConClicker,
    });
  });
  const total = redondear(lineas.reduce((s, l) => s + l.monto, 0));
  return { lineas, total };
}

export const total = (d) => desglose(d).total;
export const totalPedido = (disenos) => redondear(disenos.reduce((s, d) => s + total(d), 0));

function redondear(n) {
  return Math.round(n * 100) / 100;
}

export function dinero(n) {
  return "$" + n.toFixed(2).replace(".", ",");
}
