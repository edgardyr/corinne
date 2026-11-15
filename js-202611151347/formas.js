// Siluetas 2D de los charms y aros, en milímetros, centradas en el origen y con el agujero
// para colgar arriba. Solo usa números: el visor las extruye con three.js y el generador
// del archivo 3D puede extruir las mismas.
// Cada forma devuelve { contorno: [[x,y],...], huecos: [[[x,y],...], ...] }.

const N = 96;

function circulo(cx, cy, r, n = 48, sentido = 1) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const t = (sentido * i * 2 * Math.PI) / n;
    p.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return p;
}

// Contorno de una unión de elipses vista desde el centro (sirve si la unión rodea al origen).
function unionDeElipses(elipses, n = N) {
  const dentro = (x, y) =>
    elipses.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
  const p = [];
  for (let i = 0; i < n; i++) {
    const t = (i * 2 * Math.PI) / n;
    const dx = Math.cos(t), dy = Math.sin(t);
    let r = 0;
    for (let s = 0; s < 40; s += 0.05) if (dentro(dx * s, dy * s)) r = s;
    p.push([dx * r, dy * r]);
  }
  return p;
}

function polar(fn, n = N) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const t = (i * 2 * Math.PI) / n;
    const r = fn(t);
    p.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return p;
}

function limites(puntos) {
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of puntos) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  return { minY, maxY };
}

// Agrega el agujero de colgar, 2,4 mm por debajo del borde superior.
function conAgujero(forma, r = 1.1, bajo = 2.4) {
  const { maxY } = limites(forma.contorno);
  return { ...forma, huecos: [...(forma.huecos || []), circulo(0, maxY - bajo, r, 24, -1)] };
}

const FORMAS = {
  corazon: () => {
    const p = [];
    for (let i = 0; i < N; i++) {
      const t = (i * 2 * Math.PI) / N;
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      p.push([x * 0.62, y * 0.62 + 1]);
    }
    return { contorno: p };
  },
  estrella: () => {
    const p = [];
    for (let i = 0; i < 10; i++) {
      const t = Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 11 : 4.8;
      p.push([r * Math.cos(t), r * Math.sin(t)]);
    }
    return { contorno: p };
  },
  flor: () => {
    const el = [[0, 0, 4.5, 4.5]];
    for (let i = 0; i < 5; i++) {
      const t = Math.PI / 2 + (i * 2 * Math.PI) / 5;
      el.push([5.6 * Math.cos(t), 5.6 * Math.sin(t), 4.4, 4.4]);
    }
    return { contorno: unionDeElipses(el) };
  },
  luna: () => {
    // Círculo grande (R) menos uno corrido a la derecha (r, a distancia d), girado un poco.
    const R = 10, r = 8.6, d = 5.2, giro = 0.35;
    const xi = (d * d + R * R - r * r) / (2 * d);
    const yi = Math.sqrt(R * R - xi * xi);
    const th = Math.atan2(yi, xi);
    const p = [];
    for (let i = 0; i <= 60; i++) {
      const t = th + (i * (2 * Math.PI - 2 * th)) / 60;
      p.push([R * Math.cos(t), R * Math.sin(t)]);
    }
    const a1 = Math.atan2(yi, xi - d), a2 = Math.atan2(-yi, xi - d) + 2 * Math.PI;
    for (let i = 59; i >= 1; i--) {
      const t = a1 + (i * (a2 - a1)) / 60;
      p.push([d + r * Math.cos(t), r * Math.sin(t)]);
    }
    const c = Math.cos(giro), s = Math.sin(giro);
    return { contorno: p.map(([x, y]) => [x * c - y * s + 2, x * s + y * c]) };
  },
  nube: () => ({
    contorno: unionDeElipses([
      [0, -1, 11, 5], [-5.5, 1.5, 5, 5], [1.5, 3.5, 6.2, 6.2], [7, 0.5, 4.4, 4.4],
    ]),
  }),
  mariposa: () => ({
    contorno: unionDeElipses([
      [-5.8, 3.2, 6, 6.2], [5.8, 3.2, 6, 6.2], [-4.6, -5, 4.2, 4.6], [4.6, -5, 4.2, 4.6], [0, 0, 1.8, 8.5],
    ]),
  }),
  carita: () => ({
    contorno: circulo(0, 0, 10.5, 64),
    huecos: [
      circulo(-3.6, 2.6, 1.5, 20, -1),
      circulo(3.6, 2.6, 1.5, 20, -1),
      sonrisa(),
    ],
  }),
  lazo: () => ({
    contorno: unionDeElipses([
      [-6, 0.5, 6.5, 5], [6, 0.5, 6.5, 5], [0, 0, 2.8, 3.2], [-3, -6, 2, 5], [3, -6, 2, 5],
    ]),
  }),
  // Aros: anillos planos. Los grandes (tam 2 o más, los del final de la cadena) llevan la banda
  // gruesa del mosquetón, 2,6 mm; los chicos, la fina.
  "aro-redondo": (tam = 1) => ({
    contorno: circulo(0, 0, 6 * tam, 64),
    huecos: [circulo(0, 0, 6 * tam - (tam >= 2 ? 2.6 : 1.6), 64, -1)],
  }),
  "aro-corazon": (tam = 1) => {
    const e = 0.62 * tam, i = e - (tam >= 2 ? 0.3 : 0.2);
    const ext = FORMAS.corazon().contorno.map(([x, y]) => [x * e, y * e]);
    const int = FORMAS.corazon().contorno.map(([x, y]) => [x * i, y * i + 0.4 * tam]);
    return { contorno: ext, huecos: [int.reverse()] };
  },
  // Estrella de puntas redondas, como la argolla del set de accesorios.
  "aro-estrella": (tam = 1) => {
    const r = (k) => (t) => k * (1 + 0.3 * Math.cos(5 * (t - Math.PI / 2)));
    return { contorno: polar(r(8.5 * tam)), huecos: [polar(r(8.5 * tam - (tam >= 2 ? 3.2 : 2.4)))] };
  },
};

// Envolvente convexa de dos círculos (cápsula o gota): el contorno de los mosquetones.
function envolvente(circulos) {
  const pts = circulos.flatMap(([cx, cy, r]) => circulo(cx, cy, r, 72));
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const abajo = [], arriba = [];
  for (const p of pts) {
    while (abajo.length > 1 && cruz(abajo[abajo.length - 2], abajo[abajo.length - 1], p) <= 0) abajo.pop();
    abajo.push(p);
  }
  for (const p of [...pts].reverse()) {
    while (arriba.length > 1 && cruz(arriba[arriba.length - 2], arriba[arriba.length - 1], p) <= 0) arriba.pop();
    arriba.push(p);
  }
  return [...abajo.slice(0, -1), ...arriba.slice(0, -1)];
}

// Anillo con el mismo dibujo por fuera y por dentro, más angosto por dentro.
function anilloDe(circulos, ancho) {
  return {
    contorno: envolvente(circulos),
    huecos: [envolvente(circulos.map(([x, y, r]) => [x, y, r - ancho]))],
  };
}

function sonrisa() {
  // Media luna de la boca: arco exterior abajo y arco interior de vuelta.
  const p = [];
  for (let i = 0; i <= 20; i++) {
    const t = Math.PI + 0.35 + (i * (Math.PI - 0.7)) / 20;
    p.push([6 * Math.cos(t), 6 * Math.sin(t) + 0.8]);
  }
  for (let i = 20; i >= 0; i--) {
    const t = Math.PI + 0.45 + (i * (Math.PI - 0.9)) / 20;
    p.push([4.3 * Math.cos(t), 4.3 * Math.sin(t) + 0.4]);
  }
  return p.reverse();
}

function area(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [x, y] = p[i], [a, b] = p[(i + 1) % p.length];
    s += x * b - a * y;
  }
  return s / 2;
}

// Contorno en sentido antihorario y huecos en sentido horario, como lo esperan los extrusores.
function orientar(f) {
  const contorno = area(f.contorno) < 0 ? [...f.contorno].reverse() : f.contorno;
  const huecos = (f.huecos || []).map((h) => (area(h) > 0 ? [...h].reverse() : h));
  return { contorno, huecos };
}

// Forma de un charm, con su agujero para colgar.
export function formaCharm(nombre) {
  const f = FORMAS[nombre];
  if (!f) throw new Error(`Forma desconocida: ${nombre}`);
  return orientar(conAgujero(f()));
}

// Forma de un aro (ya es un anillo, no lleva agujero aparte).
const AROS_POR_FORMA = { corazon: "aro-corazon", estrella: "aro-estrella" };
export function formaAro(forma, tam = 1) {
  return orientar(FORMAS[AROS_POR_FORMA[forma] || "aro-redondo"](tam));
}

// Mosquetón simple: cápsula de 23 x 52 mm, como el del set (centrado en el origen, a lo alto).
export function formaMosqueton() {
  return orientar(anilloDe([[0, -14.5, 11.5], [0, 14.5, 11.5]], 2.6));
}

// Mosquetón giratorio: gota de 23 x 32 mm con la punta arriba, donde va la cabeza que gira.
export function formaGota() {
  return orientar(anilloDe([[0, -4.5, 11.5], [0, 8.5, 3.6]], 2.4));
}

// Adorno macizo (corazón o estrella) a la escala pedida, sin agujero.
export function formaAdorno(nombre, escala = 1) {
  const f = FORMAS[nombre]();
  return orientar({ contorno: f.contorno.map(([x, y]) => [x * escala, y * escala]) });
}

export const NOMBRES_FORMAS = Object.keys(FORMAS);
