// De las piezas 2D del árbol a mallas cerradas: triángulos para el visor, STL y ZIP para el taller.
import { ShapeUtils, Vector2 } from "three";
import { zipSync, strToU8 } from "fflate";
import { ESCALA, aPoligonos, restar } from "./geometria.js";

const aVec = (camino) => camino.map(({ X, Y }) => new Vector2(X, Y));

// Triángulos de un polígono con huecos, en el plano z. Devuelve [[x,y,z] x 3] en enteros de micra.
function tapa(caminos, z, haciaArriba, salida) {
  for (const { exterior, huecos } of aPoligonos(caminos)) {
    const puntos = [exterior, ...huecos].flat();
    for (const [a, b, c] of ShapeUtils.triangulateShape(aVec(exterior), huecos.map(aVec))) {
      const [p, q, r] = [puntos[a], puntos[b], puntos[c]];
      const giro = (q.X - p.X) * (r.Y - p.Y) - (q.Y - p.Y) * (r.X - p.X);
      if (giro === 0) continue;
      const t = (giro > 0) === haciaArriba ? [p, q, r] : [p, r, q];
      salida.push(t.map(({ X, Y }) => [X, Y, z]));
    }
  }
}

function paredes(caminos, z0, z1, salida) {
  // Con el exterior en sentido antihorario y los huecos al revés, la cara mira siempre hacia afuera.
  for (const { exterior, huecos } of aPoligonos(caminos)) {
    for (const anillo of [exterior, ...huecos]) {
      for (let i = 0; i < anillo.length; i++) {
        const a = anillo[i], b = anillo[(i + 1) % anillo.length];
        if (a.X === b.X && a.Y === b.Y) continue;
        salida.push([[a.X, a.Y, z0], [b.X, b.Y, z0], [b.X, b.Y, z1]], [[a.X, a.Y, z0], [b.X, b.Y, z1], [a.X, a.Y, z1]]);
      }
    }
  }
}

// Parte los triángulos que tienen, en mitad de una arista horizontal, un vértice de otro triángulo
// (pasa donde se juntan dos capas distintas), para que cada arista de la malla la compartan
// exactamente dos caras.
function coser(triangulos) {
  const porPlano = new Map();
  for (const t of triangulos) for (const [x, y, z] of t) {
    if (!porPlano.has(z)) porPlano.set(z, new Map());
    porPlano.get(z).set(`${x},${y}`, [x, y]);
  }
  // Puntos de cada plano ordenados por x: así cada arista solo mira los que caen en su tramo.
  const planos = new Map([...porPlano].map(([z, m]) => [z, [...m.values()].sort((a, b) => a[0] - b[0])]));
  const desde = (lista, x) => {
    let lo = 0, hi = lista.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (lista[mid][0] < x) lo = mid + 1; else hi = mid; }
    return lo;
  };
  const salida = [];
  for (const t of triangulos) {
    const pila = [t];
    while (pila.length) {
      const [a, b, c] = pila.pop();
      let partido = false;
      for (const [p, q, r] of [[a, b, c], [b, c, a], [c, a, b]]) {
        if (p[2] !== q[2]) continue;
        const dx = q[0] - p[0], dy = q[1] - p[1];
        const x0 = Math.min(p[0], q[0]), x1 = Math.max(p[0], q[0]), y0 = Math.min(p[1], q[1]), y1 = Math.max(p[1], q[1]);
        const lista = planos.get(p[2]);
        let m = null;
        for (let k = desde(lista, x0); k < lista.length && lista[k][0] <= x1; k++) {
          const [x, y] = lista[k];
          if (y >= y0 && y <= y1 && (x - p[0]) * dy === (y - p[1]) * dx && !(x === p[0] && y === p[1]) && !(x === q[0] && y === q[1])) { m = lista[k]; break; }
        }
        if (m) {
          const medio = [m[0], m[1], p[2]];
          pila.push([p, medio, r], [medio, q, r]);
          partido = true;
          break;
        }
      }
      if (!partido) salida.push([a, b, c]);
    }
  }
  return salida;
}

// Malla cerrada de una pieza hecha de capas apiladas: [{ z0, z1, caminos }], de abajo hacia arriba.
// Devuelve las posiciones de los triángulos en milímetros (nueve números por triángulo).
export function mallaDePieza(capas) {
  const t = [];
  const z = (v) => Math.round(v * ESCALA);
  capas.forEach((capa, i) => {
    paredes(capa.caminos, z(capa.z0), z(capa.z1), t);
    if (i === 0) tapa(capa.caminos, z(capa.z0), false, t);
    const siguiente = capas[i + 1];
    if (!siguiente) tapa(capa.caminos, z(capa.z1), true, t);
    else {
      // Si la capa ya trae calculado lo que le sobra y lo que le falta frente a la de encima, se usa.
      tapa(capa.sobraArriba || restar(capa.caminos, siguiente.caminos), z(capa.z1), true, t);
      tapa(capa.faltaArriba || restar(siguiente.caminos, capa.caminos), z(capa.z1), false, t);
    }
  });
  const cosidos = coser(t);
  const pos = new Float32Array(cosidos.length * 9);
  cosidos.forEach((tri, i) => tri.forEach((p, j) => p.forEach((v, k) => { pos[i * 9 + j * 3 + k] = v / ESCALA; })));
  return pos;
}

// La pieza tal como va en la cama: con el frente (la cara que se ve) contra la placa, que es la que
// mejor acabado deja. Es un giro de media vuelta de la pieza armada, no un espejo. La base ancha ya
// viene acostada sobre su cara de abajo.
export function mallaDeImpresion(pieza) {
  if (pieza.capasImpresion) return mallaDePieza(pieza.capasImpresion);
  const pos = mallaDePieza(pieza.capas);
  const fondo = pieza.capas.at(-1).z1;
  for (let i = 0; i < pos.length; i += 3) { pos[i + 1] = -pos[i + 1]; pos[i + 2] = fondo - pos[i + 2]; }
  return pos;
}

// Cuenta las aristas que no comparten exactamente dos caras en sentidos opuestos. Cero = malla cerrada.
export function aristasAbiertas(pos) {
  const cuenta = new Map();
  const clave = (i) => `${Math.round(pos[i] * ESCALA)},${Math.round(pos[i + 1] * ESCALA)},${Math.round(pos[i + 2] * ESCALA)}`;
  for (let i = 0; i < pos.length; i += 9) {
    const v = [clave(i), clave(i + 3), clave(i + 6)];
    for (let j = 0; j < 3; j++) {
      const k = `${v[j]}>${v[(j + 1) % 3]}`;
      cuenta.set(k, (cuenta.get(k) || 0) + 1);
    }
  }
  let abiertas = 0;
  for (const [k, n] of cuenta) {
    const [a, b] = k.split(">");
    if (n !== 1 || cuenta.get(`${b}>${a}`) !== 1) abiertas++;
  }
  return abiertas;
}

export function volumen(pos) {
  let v = 0;
  for (let i = 0; i < pos.length; i += 9) {
    v += pos[i] * (pos[i + 4] * pos[i + 8] - pos[i + 5] * pos[i + 7])
      - pos[i + 1] * (pos[i + 3] * pos[i + 8] - pos[i + 5] * pos[i + 6])
      + pos[i + 2] * (pos[i + 3] * pos[i + 7] - pos[i + 4] * pos[i + 6]);
  }
  return v / 6;
}

// STL binario, en milímetros.
export function aStl(pos, titulo = "arbol") {
  const n = pos.length / 9;
  const datos = new DataView(new ArrayBuffer(84 + n * 50));
  Array.from(titulo.slice(0, 79)).forEach((ch, i) => datos.setUint8(i, ch.charCodeAt(0) & 127));
  datos.setUint32(80, n, true);
  for (let i = 0; i < n; i++) {
    const p = pos.subarray(i * 9, i * 9 + 9);
    const u = [p[3] - p[0], p[4] - p[1], p[5] - p[2]], w = [p[6] - p[0], p[7] - p[1], p[8] - p[2]];
    const nx = u[1] * w[2] - u[2] * w[1], ny = u[2] * w[0] - u[0] * w[2], nz = u[0] * w[1] - u[1] * w[0];
    const largo = Math.hypot(nx, ny, nz) || 1;
    const o = 84 + i * 50;
    [nx / largo, ny / largo, nz / largo, ...p].forEach((v, j) => datos.setFloat32(o + j * 4, v, true));
  }
  return new Uint8Array(datos.buffer);
}

const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Nombre de archivo de cada pieza: orden de arriba hacia abajo, qué es y su color.
export function nombreDeArchivo(pieza, orden, nombreColor) {
  const que = pieza.tipo === "fila" ? `fila${pieza.fila}-${sinTildes(pieza.texto)}` : pieza.tipo === "ano" ? `ano-${sinTildes(pieza.texto)}` : pieza.tipo === "base" ? "base" : "estrella";
  return `${String(orden).padStart(2, "0")}-${que}-${sinTildes(nombreColor).toLowerCase()}.stl`;
}

// ZIP para el taller: un STL por pieza y una hoja de texto con medidas, colores y cómo se imprime.
export function zipDeTaller(arbol, { nombreColor, titulo, notas = [] }) {
  const archivos = {};
  const lineas = [titulo, "", `Alto ${arbol.alto.toFixed(1)} mm, ancho ${arbol.ancho.toFixed(1)} mm, fondo ${arbol.fondo} mm${arbol.fondoBase > arbol.fondo ? ` (la base, ${arbol.fondoBase} mm, centrada)` : ""}.`, "", "Piezas, de arriba hacia abajo:"];
  const porColor = new Map();
  arbol.piezas.forEach((p, i) => {
    const color = nombreColor(p.color);
    const nombre = nombreDeArchivo(p, i + 1, color);
    archivos[nombre] = aStl(mallaDeImpresion(p), nombre);
    const ancho = p.caja.x1 - p.caja.x0, alto = p.caja.y1 - p.caja.y0;
    let linea = `- ${nombre}: ${ancho.toFixed(1)} x ${alto.toFixed(1)} mm`;
    if (p.tipo === "base") linea = `- ${nombre}: tabla de ${ancho.toFixed(1)} x ${p.fondo} mm y ${alto.toFixed(1)} de alto; se imprime acostada y se pega debajo, centrada (sobresale ${-p.atras} mm por delante y por detrás)`;
    if (p.altoLetra) linea += `, letra de ${p.altoLetra.toFixed(1)} mm`;
    if (p.contacto != null) linea += `, apoya ${p.contacto.toFixed(1)} mm sobre la de abajo`;
    if (p.acoples) linea += `, ${p.acoples.n === 1 ? "1 pestaña" : p.acoples.n + " pestañas"} de ${p.acoples.ancho.toFixed(1)} x ${p.acoples.alto.toFixed(1)} mm que entran en la pieza de abajo`;
    lineas.push(linea);
    if (!porColor.has(color)) porColor.set(color, []);
    porColor.get(color).push(nombre);
  });
  lineas.push("", "Los STL ya vienen con el frente contra la placa: no hay que girarlos.", "Las pestañas y muescas son la guía para pegar derecho; de frente no se ven.");
  if (arbol.piezas.some((p) => p.aPresion)) lineas.push("El año NO se pega al último nombre: entra en cola de milano, a presión (0,10 mm de holgura). Se pone delante del árbol y se desliza hacia atrás hasta el tope; para cambiarlo la próxima Navidad se empuja hacia el frente. Sí se pega a su base.");
  lineas.push("", "Placas (una por color):");
  for (const [color, lista] of porColor) lineas.push(`- ${color}: ${lista.join(", ")}`);
  lineas.push("", ...notas);
  archivos["LEEME.txt"] = strToU8(lineas.join("\n") + "\n");
  return zipSync(archivos, { level: 6 });
}
