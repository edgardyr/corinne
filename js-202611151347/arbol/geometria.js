// Geometría 2D del árbol de Navidad con nombres. Todo en milímetros, con el árbol de pie en el
// plano XY (x al centro, y = 0 en la mesa) y la profundidad en Z (z = 0 es la cara de atrás, la que
// va en la cama al imprimir; el frente es z = fondo).
// Los polígonos se guardan como caminos de Clipper en enteros de micra: contorno exterior en sentido
// antihorario (área positiva) y huecos al revés.
import ClipperLib from "clipper-lib";

export const ESCALA = 1000;          // enteros por milímetro
const NORMA = 100000;                // enteros por altura de mayúscula, al trabajar una letra suelta

// Medidas de diseño. Las que van en "veces la altura de letra" no llevan unidad.
export const MEDIDAS = {
  separacionLetras: 0.045,   // hueco entre letras vecinas: se leen sueltas y las une la barra
  espacio: 0.32,             // ancho de un espacio dentro de un nombre
  barra: 0.05,               // alto del piso y del techo de cada fila, en veces el alto de letra
  barraMinima: 1.2,          // mm (tres pasadas de boquilla)
  barraMaxima: 2.4,          // mm: más gruesa solo gasta material
  bandaRas: 0.1,             // franja de la letra, arriba y abajo, que decide hasta dónde llegan techo y piso
  conTecho: true,            // cada fila lleva techo además de piso
  meteLetra: 0.03,           // cuánto entra la letra en el piso y en el techo, para fundirse bien
  estrellaHueco: 0.52,       // tamaño del hueco de la estrella sobre la estrella entera
  huecoTilde: 0.04,          // hueco que queda entre la tilde y su letra
  cuelloTilde: 0.14,         // ancho del cuello que une la tilde a su letra
  estrellaRadio: 0.68,       // radio de la estrella, en veces el paso de ancho entre filas
  estrellaInterior: 0.48,    // radio interior de la estrella sobre el exterior
  estrellaRedondeo: 0.05,    // radio con que se redondean las puntas, en veces el radio
  estrellaMargen: 0.8,       // mm de pared alrededor de la muesca de la estrella (pesa poco: bastan dos pasadas)
  estrellaCorre: 3,          // mm que puede correrse la estrella para que su pestaña caiga sobre letra maciza
  estrellaPie: 0.05,         // cuánto se aplana cada punta de abajo para que pise y se pueda pegar
  anoAncho: 0.5,             // ancho del año sobre el de la última fila
  anoBarra: 0.12,            // alto de cada barra del año sobre el alto del dígito
  anoBarraMinima: 2,         // mm
  baseAlto: 3,               // mm de alto de la base ancha (pieza aparte, se imprime acostada)
  // Acoples: pestañas que bajan del piso de cada pieza y entran en muescas de la pieza de abajo.
  // Son la guía para armar y pegar derecho; no se ven de frente.
  acopleAltos: [3, 2],       // mm que baja la pestaña: se prueba primero el mayor
  acopleAnchos: [8, 6, 4, 2.5, 2], // mm de ancho, del mayor al menor según dónde haya material
  acopleHolgura: 0.25,       // mm entre pestaña y muesca, por lado (entra suave y deja sitio al pegamento)
  acopleHolguraAno: 0.10,    // mm por lado donde el último nombre entra en el año: a presión y sin pegamento, para cambiarlo cada Navidad. Con 0,05 la cola de milano salió tan dura que hubo que limar (árbol de 25 cm, 15/11/2026)
  acopleCola: 0.8,           // mm que se abre a cada lado la pestaña del año al bajar (cola de milano): si levantan el árbol, el año no se cae
  acopleMargen: 1.2,         // mm de pared maciza que debe quedar alrededor de la muesca
  acoplePaso: 0.3,           // mm de cada escalón del chaflán de la pestaña (se imprime sin soportes)
  acopleAltoBase: 2,         // mm que entra la pestaña en la base ancha
  frenteCiego: 6,            // mm de frente que tapan la muesca y la pestaña
  cuelloNeto: 0.25,          // mm: una pieza tiene que seguir entera al comerle esto por cada lado
  letraMinima: 6,            // mm de alto de letra; por debajo, el pedido sube de tamaño
  contactoMinimo: 8,         // mm de apoyo entre dos piezas para pegarlas
  camaMaxima: 250,           // mm; la cama de la A1 mide 256
};

const { ClipType, PolyType, PolyFillType, JoinType, EndType } = ClipperLib;

function operar(tipo, a, b = []) {
  const c = new ClipperLib.Clipper();
  c.StrictlySimple = true;   // sin esto, dos trozos que se tocan por una línea salen como un solo camino
  if (a.length) c.AddPaths(a, PolyType.ptSubject, true);
  if (b.length) c.AddPaths(b, PolyType.ptClip, true);
  const sol = new ClipperLib.Paths();
  c.Execute(tipo, sol, PolyFillType.pftNonZero, PolyFillType.pftNonZero);
  return sol;
}
export const unir = (a) => operar(ClipType.ctUnion, a);
export const restar = (a, b) => operar(ClipType.ctDifference, a, b);
export const cortar = (a, b) => operar(ClipType.ctIntersection, a, b);

const areaDe = (camino) => ClipperLib.Clipper.Area(camino);
export const areaTotal = (caminos) => caminos.reduce((s, p) => s + areaDe(p), 0) / (ESCALA * ESCALA);
export const exteriores = (caminos) => caminos.filter((p) => areaDe(p) > 0);

function rect(x0, y0, x1, y1) {
  return [{ X: x0, Y: y0 }, { X: x1, Y: y0 }, { X: x1, Y: y1 }, { X: x0, Y: y1 }];
}
const mm = (v) => Math.round(v * ESCALA);
export const rectMm = (x0, y0, x1, y1) => rect(mm(x0), mm(y0), mm(x1), mm(y1));

function cajaEnteros(caminos) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of caminos) for (const { X, Y } of p) {
    if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
  }
  return { x0, y0, x1, y1 };
}
export function caja(caminos) {
  const c = cajaEnteros(caminos);
  return { x0: c.x0 / ESCALA, y0: c.y0 / ESCALA, x1: c.x1 / ESCALA, y1: c.y1 / ESCALA };
}
const mover = (caminos, dx, dy) => caminos.map((p) => p.map(({ X, Y }) => ({ X: X + dx, Y: Y + dy })));

// Encoge (delta negativo) o engorda una forma, en milímetros.
export function desplazar(caminos, delta) {
  const co = new ClipperLib.ClipperOffset(2, 20);
  co.AddPaths(caminos, JoinType.jtRound, EndType.etClosedPolygon);
  const sol = new ClipperLib.Paths();
  co.Execute(sol, delta * ESCALA);
  return sol;
}

// Cierto si la forma es una sola pieza y lo sigue siendo al comerle "cuello" mm por cada lado:
// así ninguna unión queda más fina que una pasada de la boquilla (0,5 mm).
export function esUnaPieza(caminos, cuello = MEDIDAS.cuelloNeto) {
  if (exteriores(caminos).length !== 1) return false;
  return exteriores(desplazar(caminos, -cuello)).length === 1;
}

// Agrupa los caminos en polígonos con sus huecos: [{ exterior, huecos }].
export function aPoligonos(caminos) {
  const c = new ClipperLib.Clipper();
  if (caminos.length) c.AddPaths(caminos, PolyType.ptSubject, true);
  const arbol = new ClipperLib.PolyTree();
  c.Execute(ClipType.ctUnion, arbol, PolyFillType.pftNonZero, PolyFillType.pftNonZero);
  return ClipperLib.JS.PolyTreeToExPolygons(arbol).map((e) => ({ exterior: e.outer, huecos: e.holes }));
}

// ---------- Letras ----------

const letras = new WeakMap();

// Contorno de una letra con la mayúscula de alto 1 (en enteros de NORMA), ya lista para la fila:
// la tilde o la virgulilla se unen a la letra con un cuello corto, el conjunto se achica en vertical si pasa de
// la altura de mayúscula y se recorta lo que sobresale por arriba y por abajo, para que la fila
// tenga los dos bordes rectos.
export function formaLetra(fuente, ch) {
  if (!letras.has(fuente)) letras.set(fuente, new Map());
  const cache = letras.get(fuente);
  if (cache.has(ch)) return cache.get(ch);
  const g = fuente.glifo(ch);
  const crudo = g.anillos.map((a) => a.map(([x, y]) => ({ X: Math.round(x * NORMA), Y: Math.round(y * NORMA) })));
  const partes = aPoligonos(crudo).map((p) => [p.exterior, ...p.huecos]);
  const cuerpo = [], flotantes = [];
  for (const p of partes) (cajaEnteros(p).y0 > 0.5 * NORMA ? flotantes : cuerpo).push(p);
  let todo = cuerpo.flat();
  const G = 100 * NORMA;
  const ancho = Math.round(MEDIDAS.cuelloTilde * NORMA);
  // Perfil de una forma dentro de una tira vertical: hasta dónde la cubre entera por arriba y por abajo.
  const perfil = (forma, x) => {
    let techo = Infinity, piso = -Infinity;
    for (let i = 0; i < 5; i++) {
      const parte = cortar(forma, [rect(x + Math.round((ancho * i) / 5), -G, x + Math.round((ancho * (i + 1)) / 5), G)]);
      if (!parte.length) return null;
      const c = cajaEnteros(parte);
      techo = Math.min(techo, c.y1); piso = Math.max(piso, c.y0);
    }
    return { techo, piso };
  };
  for (const suelto of flotantes) {
    // La tilde se acerca a la letra, sin tocarla, y un cuello corto la une a la parte de la letra que
    // le queda debajo. Si debajo de su centro no hay letra (la U), el cuello va sobre el trazo más
    // cercano y la tilde se corre lo justo para quedar encima.
    const c0 = cajaEnteros(suelto);
    const debajo = cortar(todo, [rect(c0.x0, -G, c0.x1, G)]);
    const tope = debajo.length ? cajaEnteros(debajo).y1 : cajaEnteros(todo).y1;
    let f = mover(suelto, 0, -Math.max(0, c0.y0 - tope - Math.round(MEDIDAS.huecoTilde * NORMA)));
    const c = cajaEnteros(f);
    const medio = (c.x0 + c.x1) / 2;
    let mejor = null;
    for (let x = c.x0 - ancho; x <= c.x1; x += Math.round(0.01 * NORMA)) {
      const letra = perfil(todo, x);
      if (!letra) continue;
      const corre = x < c.x0 ? x - c.x0 : x + ancho > c.x1 ? x + ancho - c.x1 : 0;
      const nota = Math.max(0, c.y0 - letra.techo) + Math.abs(x + ancho / 2 - medio) + 2 * Math.abs(corre);
      if (!mejor || nota < mejor.nota) mejor = { nota, x, corre, y0: letra.techo - Math.round(0.03 * NORMA) };
    }
    if (mejor) {
      f = mover(f, mejor.corre, 0);
      const tilde = perfil(f, mejor.x);
      if (tilde) todo.push(rect(mejor.x, mejor.y0, mejor.x + ancho, Math.min(tilde.piso + Math.round(0.03 * NORMA), tilde.techo)));
    }
    todo = todo.concat(f);
  }
  todo = unir(todo);
  if (todo.length) {
    const alto = cajaEnteros(todo).y1;
    if (alto > NORMA * 1.02) {
      const k = NORMA / alto;
      todo = todo.map((p) => p.map(({ X, Y }) => ({ X, Y: Math.round(Y * k) })));
    }
    todo = cortar(todo, [rect(-G, 0, G, NORMA)]);
  }
  const c = todo.length ? cajaEnteros(todo) : { x0: 0, x1: 0 };
  const r = { caminos: todo, x0: c.x0 / NORMA, x1: c.x1 / NORMA };
  cache.set(ch, r);
  return r;
}

// Dónde va cada letra de un texto y cuánto mide de ancho, con la mayúscula de alto 1.
export function medirTexto(fuente, texto) {
  const puestas = [];
  let cursor = 0, primera = true;
  for (const ch of Array.from(texto)) {
    if (ch === " ") { cursor += MEDIDAS.espacio; continue; }
    const l = formaLetra(fuente, ch);
    if (!l.caminos.length) continue;
    const dx = cursor + (primera ? 0 : MEDIDAS.separacionLetras) - l.x0;
    puestas.push({ ch, dx, letra: l });
    cursor = dx + l.x1;
    primera = false;
  }
  return { ancho: cursor, letras: puestas };
}

// Las letras de un texto escaladas para que midan "ancho" mm, con la base en y = 0 y x desde 0.
function letrasEnMm(medida, ancho) {
  const s = ancho / medida.ancho;
  const k = (s * ESCALA) / NORMA;
  const caminos = [];
  for (const { dx, letra } of medida.letras) {
    const ox = dx * s * ESCALA;
    for (const p of letra.caminos) caminos.push(p.map(({ X, Y }) => ({ X: Math.round(X * k + ox), Y: Math.round(Y * k) })));
  }
  return { caminos, altoLetra: s };
}

// Medidas de una fila: la letra entre un piso y un techo finos. "proporcion" es el ancho del nombre
// con la letra de alto 1; "pisoMinimo" sube el piso cuando tiene que alojar las muescas de la pieza de arriba.
export function medidasFila(ancho, proporcion, pisoMinimo = MEDIDAS.barraMinima) {
  const letra = ancho / proporcion;
  const barra = Math.min(Math.max(MEDIDAS.barra * letra, MEDIDAS.barraMinima), MEDIDAS.barraMaxima);
  const techo = MEDIDAS.conTecho ? barra : 0;
  const piso = Math.max(barra, pisoMinimo);
  // La letra entra en el piso y el techo sin atravesarlos (en letras muy grandes el 3 % ya es más que la barra).
  const mete = Math.min(MEDIDAS.meteLetra * letra, barra);
  return { letra, piso, techo, mete, alto: piso + techo + letra - (techo ? 2 : 1) * mete };
}

// Una fila del árbol: el nombre estirado a "ancho" mm entre un piso y un techo finos, que unen las
// letras y dan dos caras planas para pegar la fila de arriba y la de abajo.
export function construirFila(fuente, texto, ancho, pisoMinimo = MEDIDAS.barraMinima) {
  const medida = medirTexto(fuente, texto);
  const m = medidasFila(ancho, medida.ancho, pisoMinimo);
  const { caminos } = letrasEnMm(medida, ancho);
  const y = m.piso - m.mete;
  const puestas = mover(caminos, 0, mm(y));
  // El piso y el techo no sobresalen de las letras: llegan al ras de lo que la primera y la última
  // letra miden en ese borde (en una A, el techo acaba en la punta y no en el ancho de las patas).
  const alRas = (y0, y1) => {
    const tira = cortar(puestas, [rectMm(-10, y0, ancho + 10, y1)]);
    if (!tira.length) return [0, ancho];
    const c = cajaEnteros(tira);
    return [c.x0 / ESCALA, c.x1 / ESCALA];
  };
  const banda = MEDIDAS.bandaRas * m.letra;
  const [p0, p1] = alRas(y, y + banda);
  const [t0, t1] = alRas(y + m.letra - banda, y + m.letra);
  return {
    caminos: unir([...puestas, rectMm(p0, 0, p1, m.piso), ...(m.techo ? [rectMm(t0, m.alto - m.techo, t1, m.alto)] : [])]),
    alto: m.alto, altoLetra: m.letra, ancho, barra: m.piso, techo: m.techo,
  };
}

// Estrella de cinco puntas, hueca y con las puntas un poco redondeadas. Se apoya en sus dos puntas
// de abajo, que llevan un pie plano corto para pegarla. Centro en x = 0 y pies en y = 0.
export function construirEstrella(radio) {
  const puntos = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radio : radio * MEDIDAS.estrellaInterior;
    const t = Math.PI / 2 + (i * Math.PI) / 5;
    puntos.push({ X: mm(r * Math.cos(t)), Y: mm(r * Math.sin(t)) });
  }
  const redondeo = MEDIDAS.estrellaRedondeo * radio;
  const llena = desplazar(desplazar([puntos], -redondeo), redondeo);
  const hueco = puntos.map(({ X, Y }) => ({ X: Math.round(X * MEDIDAS.estrellaHueco), Y: Math.round(Y * MEDIDAS.estrellaHueco) }));
  const c = cajaEnteros(llena);
  const suelo = c.y0 + mm(MEDIDAS.estrellaPie * radio);
  const G = mm(10 * radio);
  const caminos = mover(cortar(restar(llena, [hueco]), [rect(-G, suelo, G, G)]), 0, -suelo);
  // Dónde pisa: los tramos del borde de abajo.
  const pies = exteriores(cortar(caminos, [rect(-G, 0, G, mm(0.05))])).map((p) => { const k = cajaEnteros([p]); return [k.x0 / ESCALA, k.x1 / ESCALA]; });
  const cj = caja(caminos);
  return { caminos, alto: cj.y1, ancho: cj.x1 - cj.x0, pies, cuello: pies.reduce((t, [a, b]) => t + b - a, 0) };
}

function medidasAno(anchoDigitos, proporcion, pisoMinimo = 0) {
  const digito = anchoDigitos / proporcion;
  const barra = Math.max(MEDIDAS.anoBarra * digito, MEDIDAS.anoBarraMinima);
  const piso = Math.max(barra, pisoMinimo);   // con base ancha, el piso da para la base y su propia barra
  const mete = 0.03 * digito;
  return { digito, barra, piso, mete, alto: piso + barra + digito - 2 * mete };
}

// El año entre dos barras: la de abajo hace de pie y la de arriba da asiento plano a la última fila.
export function construirAno(fuente, texto, ancho, pisoMinimo = 0) {
  const medida = medirTexto(fuente, texto);
  const m = medidasAno(ancho, medida.ancho, pisoMinimo);
  const { caminos } = letrasEnMm(medida, ancho);
  const digitos = mover(caminos, 0, mm(m.piso - m.mete));
  const arriba = m.piso + m.digito - 2 * m.mete;
  return {
    caminos: unir([...digitos, rectMm(0, 0, ancho, m.piso), rectMm(0, arriba, ancho, arriba + m.barra)]),
    alto: m.alto, altoLetra: m.digito, ancho, barra: m.piso,
  };
}

// Largo de apoyo (mm) que la forma "abajo" ofrece en su borde superior "y", entre x0 y x1.
export function largoDeApoyo(abajo, y, x0, x1) {
  const tira = cortar(abajo, [rectMm(x0, y - 0.3, x1, y + 1)]);
  return exteriores(tira).reduce((s, p) => { const c = cajaEnteros([p]); return s + (c.x1 - c.x0) / ESCALA; }, 0);
}

let _proporcionEstrella = 0;
function proporcionEstrella() {
  if (!_proporcionEstrella) _proporcionEstrella = construirEstrella(100).alto / 100;
  return _proporcionEstrella;
}

// ---------- Acoples entre piezas ----------

// Busca dónde poner las pestañas de la pieza de arriba: dos, lo más separadas posible, donde arriba hay
// piso del que colgar y abajo hay material macizo para la muesca y sus paredes. Si no caben dos, una.
// Devuelve [{ a, b, alto }] en mm. "tabla" = la de abajo es la base ancha (maciza, sin letras).
export function buscarAcoples(arriba, abajo, y, altos, tabla = false, m = MEDIDAS.acopleMargen) {
  const M = MEDIDAS, h = M.acopleHolgura, L = M.camaMaxima;
  const pie = cortar(arriba, [rectMm(-L, y, L, y + 0.5)]);
  const hondo = Math.max(...altos) + h + m;
  const lecho = cortar(abajo, [rectMm(-L, y - hondo, L, y)]);
  if (!pie.length || !lecho.length) return [];
  const cp = cajaEnteros(pie), cl = cajaEnteros(lecho);
  const x0 = Math.max(cp.x0, cl.x0) / ESCALA, x1 = Math.min(cp.x1, cl.x1) / ESCALA;
  const lleno = (forma, xa, ya, xb, yb, falta) => areaTotal(cortar(forma, [rectMm(xa, ya, xb, yb)])) > (xb - xa) * (yb - ya) - falta;
  // Arriba el apoyo tiene que ser plano de verdad (ni el chaflán de una punta de la estrella).
  const cabe = (a, b, alto) => lleno(pie, a - 0.15, y, b + 0.15, y + 0.5, 0.002)
    && (tabla ? a - h - m >= x0 && b + h + m <= x1 : lleno(lecho, a - h - m, y - alto - h - m, b + h + m, y, 0.02));
  const paso = 0.25, medio = (x0 + x1) / 2;
  let una = null;
  for (const alto of altos) {
    for (const w of M.acopleAnchos) {
      let izq = null, der = null;
      for (let a = x0; a + w <= medio - 1; a += paso) if (cabe(a, a + w, alto)) { izq = { a, b: a + w, alto }; break; }
      for (let b = x1; b - w >= medio + 1; b -= paso) if (cabe(b - w, b, alto)) { der = { a: b - w, b, alto }; break; }
      if (izq && der) return [izq, der];
      una = una || izq || der;
      if (!una) for (let a = medio - w / 2 - 1; a <= medio - w / 2 + 1; a += paso) if (cabe(a, a + w, alto)) { una = { a, b: a + w, alto }; break; }
    }
  }
  return una ? [una] : [];
}

// La muesca que recibe a una pestaña: la misma forma con la holgura a cada lado y al fondo.
export function muescaDe(t, h = MEDIDAS.acopleHolgura) {
  if (!t.cola) return rectMm(t.a - h, t.y - t.alto - h, t.b + h, t.y + 1);
  const yb = t.y - t.alto - h, c = t.cola * (t.alto + h) / t.alto + h;
  return [[t.a - c, yb], [t.b + c, yb], [t.b + h, t.y], [t.b + h, t.y + 1], [t.a - h, t.y + 1], [t.a - h, t.y]].map(([x, y]) => ({ X: mm(x), Y: mm(y) }));
}

// La pestaña hasta "alto" mm por debajo de su pieza. Con "cola" se abre al bajar (cola de milano):
// entra deslizando desde atrás y no sale tirando hacia abajo.
function dienteDe(t, alto) {
  if (!t.cola) return rectMm(t.a, t.y - alto, t.b, t.y + 0.5);
  const c = t.cola * alto / t.alto;
  return [[t.a - c, t.y - alto], [t.b + c, t.y - alto], [t.b, t.y], [t.b, t.y + 0.5], [t.a, t.y + 0.5], [t.a, t.y]].map(([x, y]) => ({ X: mm(x), Y: mm(y) }));
}

// Capas de una pieza con sus pestañas (bajan de ella) y sus muescas (reciben a la de arriba).
// z = 0 es la espalda y z = fondo el frente, que va contra la cama al imprimir. Pestañas y muescas
// nacen en la espalda y paran antes del frente, así de frente no se ven y hacen tope al armar.
// La pestaña acaba en chaflán de 45 grados hacia el frente para imprimirse sin soportes.
export function capasConAcoples(caminos, fondo, pestanas = [], muescas = []) {
  if (!pestanas.length && !muescas.length) return [{ z0: 0, z1: fondo, caminos }];
  const M = MEDIDAS, h = M.acopleHolgura, zc = fondo - M.frenteCiego;
  const r = (v) => Math.round(v * 1000) / 1000;
  const cortes = new Set([0, fondo]);
  if (muescas.length) cortes.add(r(zc + h));
  if (pestanas.length) {
    const altoMax = Math.max(...pestanas.map((t) => t.alto));
    for (let d = 0; d < altoMax - 1e-9; d += M.acoplePaso) cortes.add(r(zc - d));
    for (const t of pestanas) cortes.add(r(zc - t.alto));
  }
  const zs = [...cortes].filter((z) => z >= 0 && z <= fondo).sort((a, b) => a - b);
  const capas = [];
  for (let i = 0; i < zs.length - 1; i++) {
    const z0 = zs[i], z1 = zs[i + 1];
    const conMuescas = muescas.length > 0 && z1 <= zc + h + 1e-6;
    let forma = conMuescas ? restar(caminos, muescas) : caminos;
    const dientes = z1 <= zc + 1e-6
      ? pestanas.map((t) => ({ t, alto: Math.min(t.alto, zc - z1) })).filter((d) => d.alto > 0.05).map(({ t, alto }) => dienteDe(t, alto))
      : [];
    if (dientes.length) forma = unir([...forma, ...dientes]);
    capas.push({ z0, z1, caminos: forma, conMuescas, dientes });
  }
  // Lo que cambia de una capa a la siguiente son solo pestañas y muescas: se deja calculado aquí, en
  // pequeño, para que la malla no tenga que restar dos formas enteras casi iguales (es lentísimo).
  const zona = [...pestanas.map((t) => rectMm(t.a - 1 - (t.cola || 0), t.y - t.alto - 1, t.b + 1 + (t.cola || 0), t.y + 1.5)), ...desplazar(muescas, 1)];
  for (let i = 0; i < capas.length - 1; i++) {
    const c = capas[i], sig = capas[i + 1];
    const aqui = cortar(c.caminos, zona), encima = cortar(sig.caminos, zona);
    c.sobraArriba = restar(aqui, encima);
    c.faltaArriba = restar(encima, aqui);
  }
  return capas;
}

// ---------- El árbol entero ----------

// diseno: { nombres: [{ texto, color }], estrella: color, ano: { texto, color } | null }
// tamano: { alto, fondo, fondoBase } en mm. fondoBase (opcional) es la profundidad de la base: la parte
// de abajo del piso del año (o de la última fila si no hay año) sale como una pieza aparte, más honda que
// el resto y centrada, para que el árbol pare mejor. El año y los nombres quedan todos con `fondo`.
export function componerArbol(fuente, diseno, tamano) {
  const M = MEDIDAS;
  const avisos = [], errores = [];
  const fondoBase = Math.max(tamano.fondoBase || 0, tamano.fondo);
  const nombres = diseno.nombres.filter((n) => medirTexto(fuente, n.texto).letras.length > 0);
  const n = nombres.length;
  if (!n) return { piezas: [], alto: 0, ancho: 0, fondo: tamano.fondo, avisos, errores: ["Escribe al menos un nombre."] };
  const prop = nombres.map((x) => medirTexto(fuente, x.texto).ancho);
  const propAno = diseno.ano ? medirTexto(fuente, diseno.ano.texto).ancho : 0;
  // Con año, el piso de la última fila tiene que dar para las muescas y su techo.
  const conBase = fondoBase > tamano.fondo;
  const pisoDe = (i) => M.barraMinima + (i === n - 1 && !propAno && conBase ? M.baseAlto : 0);
  const pisoAno = conBase ? M.barraMinima + M.baseAlto : 0;
  const altoEstrella = (k) => M.estrellaRadio * k * proporcionEstrella();
  const altoTotal = (k) => {
    let s = altoEstrella(k);
    prop.forEach((p, i) => { s += medidasFila(k * (i + 2), p, pisoDe(i)).alto; });
    if (propAno) s += medidasAno(M.anoAncho * k * (n + 1), propAno, pisoAno).alto;
    return s;
  };
  let k = tamano.alto / altoTotal(1);
  for (let i = 0; i < 12; i++) k *= tamano.alto / altoTotal(k);
  // La fila de abajo es la más ancha y tiene que caber en la cama: si no cabe, el árbol sale más bajo.
  if (k * (n + 1) > M.camaMaxima) {
    k = M.camaMaxima / (n + 1);
    avisos.push(`Con estos nombres el árbol queda de ${(altoTotal(k) / 10).toFixed(1)} cm de alto y no de ${tamano.alto / 10}: la fila de abajo ya ocupa todo el ancho de la impresora (25 cm). Con un nombre más o con año llega más alto.`);
  }

  const piezas = [];
  let y = 0;
  // De abajo hacia arriba: año, filas de la última a la primera, estrella.
  let ano = null;
  if (propAno) {
    const ancho = M.anoAncho * k * (n + 1);
    const a = construirAno(fuente, diseno.ano.texto, ancho, pisoAno);
    ano = {
      clave: "ano", tipo: "ano", texto: diseno.ano.texto, color: diseno.ano.color,
      caminos: mover(a.caminos, -mm(ancho / 2), 0), alto: a.alto, ancho, altoLetra: a.altoLetra, y0: 0, barra: a.barra,
    };
    y = a.alto;
  }
  const filas = [];
  for (let i = n - 1; i >= 0; i--) {
    const ancho = k * (i + 2);
    const f = construirFila(fuente, nombres[i].texto, ancho, pisoDe(i));
    filas[i] = {
      barra: f.barra,
      clave: `fila${i + 1}`, tipo: "fila", fila: i + 1, texto: nombres[i].texto, color: nombres[i].color,
      caminos: mover(f.caminos, -mm(ancho / 2), mm(y)), alto: f.alto, ancho, altoLetra: f.altoLetra, y0: y,
    };
    y += f.alto;
  }
  // Base ancha: los milímetros de abajo del piso de la pieza inferior se separan en una tabla aparte.
  // Va aparte porque, centrada, sobresale por detrás: en una sola pieza no apoyaría plana en la cama.
  let base = null;
  if (conBase) {
    const abajo = ano || filas[n - 1];
    const altoBase = Math.min(M.baseAlto, abajo.barra - M.barraMinima);
    if (altoBase >= 1) {
      const franja = [rectMm(-M.camaMaxima, -1, M.camaMaxima, altoBase)];
      const c = cajaEnteros(cortar(abajo.caminos, franja));
      const tabla = [rect(c.x0, 0, c.x1, mm(altoBase))];
      abajo.caminos = restar(abajo.caminos, franja);
      abajo.yAbajo = altoBase;
      const saliente = (fondoBase - tamano.fondo) / 2;
      base = {
        clave: "base", tipo: "base", texto: "", color: abajo.color, caminos: tabla, y0: 0,
        alto: altoBase, ancho: (c.x1 - c.x0) / ESCALA, fondo: fondoBase, atras: -saliente,
        x0: c.x0 / ESCALA, x1: c.x1 / ESCALA,
      };
    }
  }

  // La estrella se corre hacia un lado si en el centro de la primera fila no hay dónde apoyar el cuello.
  const radio = M.estrellaRadio * k;
  const e = construirEstrella(radio);
  const tope = Math.max(0, (filas[0].ancho - e.ancho) / 2);
  let mejor = { dx: 0, apoyo: -1 };
  for (let paso = 0; paso <= tope + 1e-9; paso += 0.5) {
    for (const dx of paso === 0 ? [0] : [paso, -paso]) {
      const apoyo = e.pies.reduce((t, [a, b]) => t + largoDeApoyo(filas[0].caminos, y, dx + a, dx + b), 0);
      if (apoyo > mejor.apoyo + 1e-6) mejor = { dx, apoyo };
    }
    if (mejor.apoyo >= 0.9 * e.cuello) break;
  }
  // Y se afina hasta 2,5 mm más para que al menos una punta caiga sobre letra maciza y pueda llevar
  // su pestaña: no se nota a la vista y la estrella queda con guía para pegarla.
  let dxEstrella = mejor.dx;
  buscar: for (let paso = 0; paso <= M.estrellaCorre + 1e-9; paso += 0.25) {
    for (const d of paso === 0 ? [0] : [paso, -paso]) {
      const dx = mejor.dx + d;
      if (Math.abs(dx) > tope + 1e-9 && d !== 0) continue;
      if (buscarAcoples(mover(e.caminos, mm(dx), mm(y)), filas[0].caminos, y, M.acopleAltos, false, M.estrellaMargen).length) { dxEstrella = dx; break buscar; }
    }
  }
  const estrella = {
    clave: "estrella", tipo: "estrella", texto: "", color: diseno.estrella,
    caminos: mover(e.caminos, mm(dxEstrella), mm(y)), alto: e.alto, ancho: e.ancho, y0: y,
    contacto: e.pies.reduce((t, [a, b]) => t + largoDeApoyo(filas[0].caminos, y, dxEstrella + a, dxEstrella + b), 0),
  };
  y += e.alto;

  // Apoyo de cada fila sobre la de abajo.
  for (let i = 0; i < n - 1; i++) {
    filas[i].contacto = largoDeApoyo(filas[i + 1].caminos, filas[i].y0, -filas[i].ancho / 2, filas[i].ancho / 2);
  }

  const ultima = filas[n - 1];
  if (ano) ultima.contacto = ano.ancho;

  // Acoples: cada pieza baja pestañas que entran en muescas de la de abajo.
  const uniones = [[estrella, filas[0]]];
  for (let i = 0; i < n - 1; i++) uniones.push([filas[i], filas[i + 1]]);
  if (ano) uniones.push([ultima, ano]);
  for (const [arriba, abajo] of uniones) {
    const yU = arriba.yAbajo ?? arriba.y0;
    // El año no se pega: entra en cola de milano, deslizándolo desde el frente hacia atrás, y sus
    // muescas van apretadas para que agarre solo, no se caiga al levantar el árbol y se pueda sacar.
    const cola = abajo === ano ? M.acopleCola : 0;
    const margen = (arriba === estrella ? M.estrellaMargen : M.acopleMargen) + cola;
    arriba.pestanas = buscarAcoples(arriba.caminos, abajo.caminos, yU, M.acopleAltos, false, margen).map((t) => ({ ...t, y: yU, ...(cola ? { cola } : {}) }));
    abajo.muescas = arriba.pestanas.map((t) => muescaDe(t, abajo === ano ? M.acopleHolguraAno : M.acopleHolgura));
    if (abajo === ano) ano.aPresion = arriba.pestanas.length > 0;
  }
  if (base) {
    const arriba = ano || ultima, yU = arriba.yAbajo;
    const tabla = base.caminos;
    arriba.pestanas = buscarAcoples(arriba.caminos, tabla, yU, [Math.min(M.acopleAltoBase, base.alto - 0.6)], true).map((t) => ({ ...t, y: yU }));
    // En la base las muescas son cajones: abiertos hacia arriba, con suelo, y solo donde llega la pestaña.
    const h = M.acopleHolgura, s0 = -base.atras, zc = tamano.fondo - M.frenteCiego;
    const cajones = arriba.pestanas.map((t) => muescaDe(t));
    const z0 = s0 - h, z1 = s0 + zc + h;
    base.capas = cajones.length ? [
      { z0: 0, z1: z0, caminos: tabla },
      { z0, z1, caminos: restar(tabla, cajones) },
      { z0: z1, z1: fondoBase, caminos: tabla },
    ] : [{ z0: 0, z1: fondoBase, caminos: tabla }];
    // Para imprimir va acostada sobre su cara de abajo, al lado del año, donde la placa está libre
    // (así el árbol de 30 cm sigue cabiendo en la cama), o junto al último nombre si no hay año.
    // Ya está en coordenadas de cama: es un giro de la pieza armada, no un espejo.
    const [bx, by] = ano ? [base.x1 + 5, 5 - ano.alto] : [base.x0, 5];
    const enCama = (xa, xb, za, zb) => rectMm(bx + xa - base.x0, by + fondoBase - zb, bx + xb - base.x0, by + fondoBase - za);
    const entera = [enCama(base.x0, base.x1, 0, fondoBase)];
    const suelo = base.alto - (arriba.pestanas[0]?.alto ?? 0) - h;
    base.capasImpresion = arriba.pestanas.length ? [
      { z0: 0, z1: suelo, caminos: entera },
      { z0: suelo, z1: base.alto, caminos: restar(entera, arriba.pestanas.map((t) => enCama(t.a - h, t.b + h, z0, z1))) },
    ] : [{ z0: 0, z1: base.alto, caminos: entera }];
  }

  for (const p of [estrella, ...filas, ...(ano ? [ano] : []), ...(base ? [base] : [])]) {
    // `atras` dice cuánto se corre la pieza en profundidad al armar el árbol (solo la base, que es más honda).
    if (p !== base) {
      p.fondo = tamano.fondo; p.atras = 0;
      p.capas = capasConAcoples(p.caminos, p.fondo, p.pestanas, p.muescas);
      if (p.pestanas?.length) p.acoples = { n: p.pestanas.length, ancho: p.pestanas[0].b - p.pestanas[0].a, alto: p.pestanas[0].alto };
    }
    p.caja = caja(p.capas.flatMap((c) => c.caminos));
    const nombre = p.tipo === "fila" ? `La fila «${p.texto}»` : p.tipo === "ano" ? "El año" : p.tipo === "base" ? "La base" : "La estrella";
    if (!p.capas.every((c) => esUnaPieza(c.caminos))) errores.push(`${nombre} no sale en una sola pieza.`);
    if (Math.max(p.caja.x1 - p.caja.x0, p.caja.y1 - p.caja.y0) > M.camaMaxima) {
      errores.push(`${nombre} mide más de ${M.camaMaxima} mm y no cabe en la cama.`);
    }
    const minimo = p.tipo === "estrella" ? 0.5 * e.cuello : M.contactoMinimo;
    if (p.tipo !== "ano" && p.tipo !== "base" && p.contacto < minimo) {
      avisos.push(`${nombre} apoya solo ${p.contacto.toFixed(1)} mm sobre la pieza de abajo: poco para pegar.`);
    }
    piezas.push(p);
  }
  const letraMenor = Math.min(...filas.map((f) => f.altoLetra));
  if (letraMenor < M.letraMinima) {
    avisos.push(`La letra más pequeña queda de ${letraMenor.toFixed(1)} mm de alto. Conviene un tamaño más grande.`);
  }
  const todo = caja(piezas.flatMap((p) => p.caminos));
  return { piezas, alto: y, ancho: todo.x1 - todo.x0, fondo: tamano.fondo, fondoBase, letraMenor, avisos, errores };
}

// Los caminos de una pieza como dibujo SVG, para revisar a ojo (la y del SVG va hacia abajo).
export function aSvg(piezas, colorDe = () => "#444") {
  const c = caja(piezas.flatMap((p) => p.caminos));
  const m = 4;
  const d = (caminos) => caminos.map((p) => "M" + p.map(({ X, Y }) => `${(X / ESCALA - c.x0 + m).toFixed(2)} ${(c.y1 - Y / ESCALA + m).toFixed(2)}`).join("L") + "Z").join("");
  const cuerpo = piezas.map((p) => `<path d="${d(p.caminos)}" fill="${colorDe(p)}" fill-rule="evenodd"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${(c.x1 - c.x0 + 2 * m).toFixed(1)} ${(c.y1 - c.y0 + 2 * m).toFixed(1)}">${cuerpo}</svg>`;
}
