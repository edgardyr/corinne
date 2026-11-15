// Lee la tipografía del árbol (Anton) y entrega el contorno de cada letra como polígonos.
// Unidades: la altura de mayúscula vale 1, la línea base es y = 0 y la y crece hacia arriba.
import opentype from "opentype.js";

const PASOS_CURVA = 10;

export function crearFuente(datos) {
  const f = opentype.parse(datos);
  const alturaMayuscula = f.tables.os2?.sCapHeight || f.charToGlyph("H").getBoundingBox().y2;
  const tam = f.unitsPerEm / alturaMayuscula;   // con este tamaño la mayúscula mide 1
  const cache = new Map();

  function glifo(ch) {
    if (cache.has(ch)) return cache.get(ch);
    const g = f.charToGlyph(ch);
    const existe = g && g.index !== 0;
    const anillos = [];
    let actual = null, x0 = 0, y0 = 0;
    const cerrar = () => { if (actual && actual.length > 2) anillos.push(actual); actual = null; };
    for (const c of existe ? g.getPath(0, 0, tam).commands : []) {
      if (c.type === "M") { cerrar(); actual = [[c.x, -c.y]]; }
      else if (c.type === "L") actual.push([c.x, -c.y]);
      else if (c.type === "Q") {
        for (let i = 1; i <= PASOS_CURVA; i++) {
          const t = i / PASOS_CURVA, u = 1 - t;
          actual.push([u * u * x0 + 2 * u * t * c.x1 + t * t * c.x, -(u * u * y0 + 2 * u * t * c.y1 + t * t * c.y)]);
        }
      } else if (c.type === "C") {
        for (let i = 1; i <= PASOS_CURVA; i++) {
          const t = i / PASOS_CURVA, u = 1 - t;
          actual.push([
            u * u * u * x0 + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
            -(u * u * u * y0 + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y),
          ]);
        }
      } else if (c.type === "Z") cerrar();
      if (c.type !== "Z") { x0 = c.x; y0 = c.y; }
    }
    cerrar();
    const r = { existe, anillos, avance: existe ? g.advanceWidth / alturaMayuscula : 0 };
    cache.set(ch, r);
    return r;
  }

  return { glifo, tiene: (ch) => glifo(ch).existe };
}

// En el navegador: descarga el archivo de la tipografía.
export async function cargarFuente(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("No se pudo cargar la tipografía");
  return crearFuente(await r.arrayBuffer());
}
