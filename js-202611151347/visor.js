// Escena 3D del clicker. Medidas en milímetros.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { colorPorId, TIPOGRAFIAS, COLGANTES, CHARMS, OBJETOS } from "./catalogo.js";
import { formaCharm, formaAro, formaAdorno } from "./formas.js";

const PASO = 16.5;      // distancia entre teclas
const TECLA = 14.6;     // ancho de la tecla abajo
const ALTO_TECLA = 8;
const ALTO_BASE = 7;
const FONDO_BASE = 19.5;
const PLATA = 0xc9ccd2;

const hex = (id) => new THREE.Color((colorPorId(id) || { hex: "#ffffff" }).hex);

function material(idColor) {
  const brillo = idColor === "menta";
  return new THREE.MeshStandardMaterial({
    color: hex(idColor),
    roughness: brillo ? 0.28 : idColor === "arcilla" ? 0.9 : 0.55,
    metalness: brillo ? 0.25 : 0,
  });
}

const metal = (c = PLATA) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.25, metalness: 0.85 });

// Tecla: cuadrado redondeado extruido, más angosto arriba, con el borde superior suave.
let geoTecla = null;
function geometriaTecla() {
  if (geoTecla) return geoTecla;
  const s = TECLA / 2 - 1.2, r = 2.6;
  const f = new THREE.Shape();
  f.moveTo(-s + r, -s);
  f.lineTo(s - r, -s); f.quadraticCurveTo(s, -s, s, -s + r);
  f.lineTo(s, s - r); f.quadraticCurveTo(s, s, s - r, s);
  f.lineTo(-s + r, s); f.quadraticCurveTo(-s, s, -s, s - r);
  f.lineTo(-s, -s + r); f.quadraticCurveTo(-s, -s, -s + r, -s);
  const g = new THREE.ExtrudeGeometry(f, {
    depth: ALTO_TECLA - 2.4, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 1.2, bevelSegments: 4, curveSegments: 8,
  });
  g.rotateX(-Math.PI / 2);
  g.computeBoundingBox();
  const { min, max } = g.boundingBox;
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - min.y) / (max.y - min.y);
    const k = 1 - 0.14 * t;
    pos.setX(i, pos.getX(i) * k);
    pos.setZ(i, pos.getZ(i) * k);
  }
  g.translate(0, -min.y, 0);
  g.computeVertexNormals();
  geoTecla = g;
  return g;
}

// Dibuja una letra o símbolo en un lienzo, del color indicado.
function texturaLetra(ch, colorHex, tipografia) {
  const n = 256;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const x = c.getContext("2d");
  x.fillStyle = colorHex;
  x.strokeStyle = colorHex;
  x.translate(n / 2, n / 2);
  if (ch === "☺") {
    x.lineWidth = 16;
    x.beginPath(); x.arc(0, 0, 86, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(-30, -24, 13, 0, Math.PI * 2); x.arc(30, -24, 13, 0, Math.PI * 2); x.fill();
    x.lineCap = "round";
    x.beginPath(); x.arc(0, 4, 48, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke();
  } else if (ch === "♥") {
    x.beginPath();
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      const px = 16 * Math.sin(t) ** 3;
      const py = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      x.lineTo(px * 5.4, -py * 5.4 + 8);
    }
    x.fill();
  } else if (ch === "★") {
    x.beginPath();
    for (let i = 0; i < 10; i++) {
      const t = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 96 : 40;
      x.lineTo(r * Math.cos(t), r * Math.sin(t) + 6);
    }
    x.fill();
  } else {
    const tipo = TIPOGRAFIAS.find((t) => t.id === tipografia) || TIPOGRAFIAS[0];
    const tam = tipografia === "cursiva" ? 180 : 235;
    x.font = tipo.css.replace("1px", `${tam}px`);
    x.textAlign = "center";
    x.textBaseline = "alphabetic";
    const m = x.measureText(ch);
    const escala = Math.min(1, 220 / Math.max(m.width, 1));
    x.scale(escala, escala);
    const sube = m.actualBoundingBoxAscent || tam * 0.7;
    const baja = m.actualBoundingBoxDescent || 0;
    x.fillText(ch, 0, (sube - baja) / 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function extruir(forma, grosor) {
  const s = new THREE.Shape(forma.contorno.map(([x, y]) => new THREE.Vector2(x, y)));
  s.holes = forma.huecos.map((h) => new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(s, {
    depth: grosor, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.45, bevelSegments: 2, curveSegments: 6,
  });
  g.translate(0, 0, -grosor / 2);
  g.computeBoundingBox();
  return g;
}

// Pone un aro de pie con su alambre metido en el agujero de la pestaña (el punto "desde") y lo
// deja caer hacia la izquierda. "radio" es la distancia del centro del aro a su alambre.
function colgarAro(aro, radio, desde) {
  const pivote = new THREE.Group();
  pivote.position.copy(desde);
  pivote.rotation.order = "YXZ";
  pivote.rotation.y = 0.45;   // un poco girado, para que se vea redondo y no de canto
  pivote.rotation.z = 0.75;   // cae hacia abajo y a la izquierda
  aro.position.set(-radio, 0, 0);
  pivote.add(aro);
  const grupo = new THREE.Group();
  grupo.add(pivote);
  pivote.updateMatrixWorld(true);
  const colgar = new THREE.Vector3(-2 * radio, 0, 0).applyMatrix4(pivote.matrixWorld);
  return { grupo, colgar };
}

// Llavero metálico como se compra: argollita por el agujero, cadenita corta y aro partido grande.
function crearLlaveroMetalico(desde) {
  const grupo = new THREE.Group();
  const mat = metal();
  const arg = colgarAro(new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.6, 10, 32), mat), 3.2, desde);
  grupo.add(arg.grupo);
  // Cadenita: eslabones ovalados, uno de frente y otro de canto.
  const dir = new THREE.Vector3(-0.55, -0.85, 0).normalize();
  const geo = new THREE.TorusGeometry(2.3, 0.55, 8, 20);
  geo.scale(1.6, 1, 1);
  const n = 5, paso = 5;
  let p = arg.colgar.clone();
  for (let i = 0; i < n; i++) {
    const c = p.clone().add(dir.clone().multiplyScalar(paso * (i + 0.5)));
    const e = new THREE.Mesh(geo, mat);
    e.position.copy(c);
    e.rotation.z = Math.atan2(dir.y, dir.x);
    if (i % 2) e.rotateX(Math.PI / 2);
    grupo.add(e);
  }
  const fin = p.add(dir.clone().multiplyScalar(paso * n));
  // Aro partido: dos vueltas de alambre plano, juntas.
  const R = 13;
  const pivote = new THREE.Group();
  pivote.position.copy(fin);
  pivote.rotation.y = 0.55;
  for (const z of [-0.55, 0.55]) {
    const v = new THREE.Mesh(new THREE.TorusGeometry(R, 0.55, 8, 64), mat);
    v.scale.z = 1.6;
    v.position.set(0, -R, z);
    pivote.add(v);
  }
  grupo.add(pivote);
  return { grupo, colgar: fin.clone().add(new THREE.Vector3(0, -2 * R + 1, 0)) };
}

// Cadenita impresa con mosquetón. Las piezas son las mallas reales del archivo de impresión
// (recursos/mosqueton-piezas.json: gancho, corazón, giratorio, conector y eslabón), armadas como en
// la foto del modelo: giratorio, conector, tres eslabones y conector, uno de frente y otro de canto.
const PIEZAS = await fetch(new URL("../recursos/mosqueton-piezas.json", import.meta.url))
  .then((r) => r.json())
  .then(({ unidad, piezas }) => Object.fromEntries(Object.entries(piezas).map(([nombre, { p, i }]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(p, (v) => v * unidad), 3));
    g.setIndex(i);
    return [nombre, toCreasedNormals(g, Math.PI / 5)];
  })));

// Radio del hueco y grosor de cada aro, para calcular a qué distancia queda enlazado con el siguiente.
const AROS_CADENA = {
  conector: { hueco: 4.74, grosor: 4 },
  eslabon: { hueco: 4.9, grosor: 4 },
  giratorio: { hueco: 3.3, grosor: 5 },
};
// Distancia entre los centros de dos aros enlazados y tensos, uno de frente y otro de canto.
const pasoEntre = (a, b) => {
  const A = AROS_CADENA[a], B = AROS_CADENA[b];
  return 0.94 * (Math.sqrt(A.hueco ** 2 - (B.grosor / 2) ** 2) + Math.sqrt(B.hueco ** 2 - (A.grosor / 2) ** 2));
};

const circulo = (radio, n = 40) =>
  Array.from({ length: n }, (_, k) => [radio * Math.cos((k / n) * 2 * Math.PI), radio * Math.sin((k / n) * 2 * Math.PI)]);

// Redondea las esquinas de un polígono cerrado (corte de esquinas de Chaikin).
function suavizar(pts, veces = 3) {
  for (let v = 0; v < veces; v++) {
    const q = [];
    pts.forEach((a, k) => {
      const b = pts[(k + 1) % pts.length];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    });
    pts = q;
  }
  return pts;
}

// Estrella de cinco puntas con una punta hacia arriba: el giratorio entra por el valle de abajo.
const estrella = (R, r) => suavizar(Array.from({ length: 10 }, (_, k) => {
  const a = Math.PI / 2 + (k * Math.PI) / 5, rad = k % 2 ? r : R;
  return [rad * Math.cos(a), rad * Math.sin(a)];
}), 2);

function rectRedondo(ancho, alto, radio) {
  const pts = [], x = ancho / 2 - radio, y = alto / 2 - radio;
  [[x, y, 0], [-x, y, 1], [-x, -y, 2], [x, -y, 3]].forEach(([cx, cy, c]) => {
    for (let k = 0; k <= 8; k++) {
      const a = (c + k / 8) * Math.PI / 2;
      pts.push([cx + radio * Math.cos(a), cy + radio * Math.sin(a)]);
    }
  });
  return pts;
}

// Mosquetón con su giratorio. El origen del grupo es el centro del aro del giratorio y el gancho
// sigue hacia +Y. Devuelve también el punto de la otra punta, de donde cuelgan los charms.
// En el gancho real, el marco donde entra la cabeza del giratorio tiene su centro en y = -16,28 y la
// cabeza del giratorio está a 6,5 mm del centro de su aro.
function crearMosqueton(modelo, mat) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(PIEZAS.giratorio, mat));
  const marco = 6.5;
  let punta;
  if (modelo === "estrella") {
    // La estrella no está en el archivo de impresión: se dibuja con el mismo grosor y el mismo marco.
    const R = 19.5, valle = Math.min(...estrella(R, 11.5).filter((q) => Math.abs(q[0]) < 1.5).map((q) => q[1]));
    const centro = marco + 2.4 - valle;
    const cuerpo = new THREE.Mesh(extruir({ contorno: estrella(R, 11.5), huecos: [estrella(13.3, 7.2).reverse()] }, 4), mat);
    cuerpo.position.y = centro;
    g.add(cuerpo);
    const m = new THREE.Mesh(extruir({ contorno: rectRedondo(9.4, 6.9, 1.6), huecos: [rectRedondo(7.2, 4.6, 0.8).reverse()] }, 4), mat);
    m.position.y = marco;
    g.add(m);
    punta = centro + R - 3;
  } else {
    const gancho = new THREE.Mesh(PIEZAS.gancho, mat);
    gancho.position.y = marco + 16.28;
    g.add(gancho);
    // El corazoncito cierra la esquina abierta del gancho.
    const cora = new THREE.Mesh(PIEZAS.corazon, mat);
    cora.position.set(8.4, marco + 16.28 + 13.6, 0);
    cora.rotation.z = 0.35;
    g.add(cora);
    punta = marco + 16.28 + 19.5 - 2;
  }
  return { grupo: g, colgar: new THREE.Vector3(0, punta, 0) };
}

// Base con la pestaña y el agujero de colgar a la izquierda.
function crearBase(d, largo) {
  const grupo = new THREE.Group();
  const mat = material(d.b.c);
  const cuerpo = new THREE.Mesh(new RoundedBoxGeometry(largo, ALTO_BASE, FONDO_BASE, 4, 3), mat);
  cuerpo.position.y = ALTO_BASE / 2;
  grupo.add(cuerpo);
  // Pestaña: aro aplanado pegado al extremo izquierdo.
  const pestana = new THREE.Mesh(new THREE.TorusGeometry(4.6, 2.2, 14, 32), mat);
  pestana.rotation.x = Math.PI / 2;
  pestana.scale.z = 1.3;
  pestana.position.set(-largo / 2 - 3.2, ALTO_BASE / 2, 0);
  grupo.add(pestana);
  if (d.b.t === "acanalada") {
    const n = Math.floor((largo - 6) / 2.2);
    const geo = new THREE.BoxGeometry(0.9, ALTO_BASE - 2.6, 0.7);
    const oscuro = mat.clone();
    oscuro.color = mat.color.clone().multiplyScalar(0.78);
    for (let i = 0; i < n; i++) {
      for (const z of [-FONDO_BASE / 2, FONDO_BASE / 2]) {
        const r = new THREE.Mesh(geo, oscuro);
        r.position.set(-largo / 2 + 4 + i * 2.2, ALTO_BASE / 2, z);
        grupo.add(r);
      }
    }
  }
  // El enganche es el centro del agujero de la pestaña: lo que cuelga pasa por ahí.
  return { grupo, enganche: new THREE.Vector3(-largo / 2 - 3.2, ALTO_BASE / 2, 0) };
}

// Cadena desde el enganche hacia arriba e izquierda; devuelve el punto donde cuelgan los extras.
function crearColgante(d, desde) {
  if (d.g.t === "llavero") return crearLlaveroMetalico(desde);
  const op = COLGANTES.find((c) => c.id === d.g.t) || COLGANTES[0];
  // Se arma en un plano (X, Y) y después se acuesta sobre la mesa, al lado del clicker, con el
  // mosquetón de cara hacia arriba: la cadena sale de la pestaña hacia la izquierda y gira al frente.
  const grupo = new THREE.Group();
  grupo.position.copy(desde);
  grupo.rotation.x = -Math.PI / 2;
  const mat = material(d.g.c);
  const curva = new THREE.CatmullRomCurve3(
    [[0, 0], [-12, -1], [-26, -7], [-37, -19], [-42, -34], [-43, -70]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  const largo = curva.getLength();
  // Desde el clicker: conector (de canto, metido en la pestaña), tres eslabones y conector.
  const orden = ["conector", "eslabon", "eslabon", "eslabon", "conector"];
  let s = 5.6;
  orden.forEach((nombre, i) => {
    if (i) s += pasoEntre(orden[i - 1], nombre);
    const u = s / largo, tg = curva.getTangentAt(u);
    const giro = new THREE.Group();
    giro.position.copy(curva.getPointAt(u));
    giro.rotation.z = Math.atan2(tg.y, tg.x);
    const e = new THREE.Mesh(PIEZAS[nombre], mat);
    e.rotation.z = Math.PI / 2;               // el corte del aro queda a un lado, no en el enlace
    if (i % 2 === 0) e.rotation.x = Math.PI / 2;
    giro.add(e);
    grupo.add(giro);
  });
  s += pasoEntre("conector", "giratorio");
  const u = s / largo, tg = curva.getTangentAt(u);
  const m = crearMosqueton(op.mosqueton, mat);
  m.grupo.position.copy(curva.getPointAt(u));
  m.grupo.rotation.z = Math.atan2(tg.y, tg.x) - Math.PI / 2;
  m.grupo.updateMatrix();
  grupo.add(m.grupo);
  grupo.updateMatrix();
  return { grupo, colgar: m.colgar.applyMatrix4(m.grupo.matrix).applyMatrix4(grupo.matrix) };
}

// Clickers de objeto, armados con piezas simples.
function crearObjeto(forma) {
  const g = new THREE.Group();
  const m = (c, r = 0.55) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  if (forma === "mantequilla") {
    const caja = new THREE.Mesh(new RoundedBoxGeometry(30, 12, 18, 4, 3), m(0x7fd9c0));
    caja.position.y = 6; g.add(caja);
    const pan = new THREE.Mesh(new RoundedBoxGeometry(24, 6, 13, 4, 2.5), m(0xf6e39a, 0.7));
    pan.position.y = 14.5; g.add(pan);
  } else if (forma === "emergencia") {
    const caja = new THREE.Mesh(new RoundedBoxGeometry(24, 13, 24, 4, 3), m(0xf2c81c));
    caja.position.y = 6.5; g.add(caja);
    const aro = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.6, 2, 32), m(0x9a9a9a, 0.4));
    aro.position.y = 14; g.add(aro);
    const boton = new THREE.Mesh(new THREE.SphereGeometry(7.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m(0xd62424, 0.35));
    boton.scale.y = 0.7; boton.position.y = 15; g.add(boton);
  } else if (forma === "creeper") {
    const cubo = new THREE.Mesh(new RoundedBoxGeometry(22, 22, 22, 2, 1.2), m(0x5bbf3a, 0.7));
    cubo.position.y = 11; g.add(cubo);
    const negro = m(0x1b1b1b, 0.8);
    const px = (x, y, w, h) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.6), negro);
      p.position.set(x, y, 11.05); g.add(p);
    };
    const u = 2.75;
    px(-1.5 * u, 15.5, 2 * u, 2 * u); px(1.5 * u, 15.5, 2 * u, 2 * u);
    px(0, 10.5, 2 * u, 1.5 * u); px(-1 * u, 7.3, u, 2 * u); px(1 * u, 7.3, u, 2 * u);
  }
  // Argolla arriba para colgar.
  const box = new THREE.Box3().setFromObject(g);
  const arg = new THREE.Mesh(new THREE.TorusGeometry(2.6, 1, 10, 24), metal());
  arg.position.set(0, box.max.y + 2.2, 0);
  g.add(arg);
  return g;
}

export class Visor {
  constructor(lienzo) {
    this.lienzo = lienzo;
    this.renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.escena = new THREE.Scene();
    this.camara = new THREE.PerspectiveCamera(32, 1, 1, 4000);
    this.controles = new OrbitControls(this.camara, lienzo);
    this.controles.enableDamping = true;
    this.controles.enablePan = true;       // mover la vista: dos dedos, o clic derecho en la computadora (igual que el árbol)
    this.controles.screenSpacePanning = true;
    this.controles.minDistance = 40;
    this.controles.maxDistance = 900;

    this.escena.add(new THREE.HemisphereLight(0xffffff, 0xe8d9cc, 1.6));
    const sol = new THREE.DirectionalLight(0xffffff, 1.8);
    sol.position.set(60, 140, 110);
    this.escena.add(sol);
    const relleno = new THREE.DirectionalLight(0xffffff, 0.6);
    relleno.position.set(-80, 40, -60);
    this.escena.add(relleno);

    this.contenido = new THREE.Group();
    this.escena.add(this.contenido);
    this.teclas = [];
    this.alTocarTecla = null;
    this.seleccion = -1;

    this._eventos();
    this._medir();
    new ResizeObserver(() => this._medir()).observe(lienzo);
    const animar = () => {
      requestAnimationFrame(animar);
      this.controles.update();
      this.renderer.render(this.escena, this.camara);
    };
    animar();
  }

  _medir() {
    const w = this.lienzo.clientWidth || 300, h = this.lienzo.clientHeight || 300;
    this.renderer.setSize(w, h, false);
    this.camara.aspect = w / h;
    this.camara.updateProjectionMatrix();
  }

  _eventos() {
    let inicio = null;
    this.lienzo.addEventListener("pointerdown", (e) => { inicio = [e.clientX, e.clientY]; });
    this.lienzo.addEventListener("pointerup", (e) => {
      if (!inicio) return;
      const mov = Math.hypot(e.clientX - inicio[0], e.clientY - inicio[1]);
      inicio = null;
      if (mov > 6 || !this.alTocarTecla) return;
      const r = this.lienzo.getBoundingClientRect();
      const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(p, this.camara);
      const hit = ray.intersectObjects(this.teclas, true)[0];
      if (hit) {
        let o = hit.object;
        while (o && o.userData.indice === undefined) o = o.parent;
        if (o) this.alTocarTecla(o.userData.indice);
      }
    });
  }

  marcar(indice) {
    this.seleccion = indice;
    this.teclas.forEach((t, i) => {
      t.position.y = t.userData.y0 + (i === indice ? 2.5 : 0);
    });
  }

  actualizar(d, { reencuadrar = false } = {}) {
    for (const o of [...this.contenido.children]) {
      this.contenido.remove(o);
      o.traverse((x) => {
        if (x.geometry && x.geometry !== geoTecla) x.geometry.dispose();
        if (x.material) {
          if (x.material.map) x.material.map.dispose();
          x.material.dispose();
        }
      });
    }
    this.teclas = [];
    const letras = Array.from(d.w);
    let colgar;
    if (letras.length) {
      const largo = Math.max(letras.length * PASO + 4, 24);
      const { grupo, enganche } = crearBase(d, largo);
      this.contenido.add(grupo);
      letras.forEach((ch, i) => {
        const t = new THREE.Group();
        const cuerpo = new THREE.Mesh(geometriaTecla(), material(d.k[i].c));
        t.add(cuerpo);
        const tapa = new THREE.Mesh(
          new THREE.PlaneGeometry(TECLA * 0.84, TECLA * 0.84),
          new THREE.MeshStandardMaterial({
            map: texturaLetra(ch, colorPorId(d.k[i].l).hex, d.f), transparent: true, roughness: 0.6,
            polygonOffset: true, polygonOffsetFactor: -2,
          })
        );
        tapa.rotation.x = -Math.PI / 2;
        tapa.position.y = ALTO_TECLA + 0.02;
        t.add(tapa);
        t.position.set(-largo / 2 + 2 + PASO / 2 + i * PASO, ALTO_BASE - 0.5, 0);
        t.userData = { indice: i, y0: ALTO_BASE - 0.5 };
        this.teclas.push(t);
        this.contenido.add(t);
      });
      const c = crearColgante(d, enganche);
      this.contenido.add(c.grupo);
      colgar = c.colgar;
    } else if (d.o.length) {
      // Solo objetos: la cadena sale del primero.
      colgar = new THREE.Vector3(0, 0, 0);
      const c = crearColgante(d, new THREE.Vector3(14, 30, 0));
      this.contenido.add(c.grupo);
      colgar = c.colgar;
    }
    if (colgar) this._colgarExtras(d, colgar, !letras.length);
    this.marcar(this.seleccion < letras.length ? this.seleccion : -1);
    if (reencuadrar || !this._encuadrado) this.centrar();
  }

  _colgarExtras(d, punto, soloObjetos) {
    const piezas = [];
    d.ch.forEach((c) => {
      const x = CHARMS.find((y) => y.id === c.id);
      const m = new THREE.Mesh(extruir(formaCharm(x.forma), 3), material(c.c));
      piezas.push(m);
    });
    d.o.forEach((o) => {
      const x = OBJETOS.find((y) => y.id === o.id);
      const g = crearObjeto(x.forma);
      g.userData.objeto = true;
      piezas.push(g);
    });
    // Abanico debajo del punto de colgar.
    const n = piezas.length;
    piezas.forEach((p, i) => {
      const box = new THREE.Box3().setFromObject(p);
      const alto = box.max.y - box.min.y;
      const ang = n === 1 ? 0 : (-0.75 + (1.5 * i) / (n - 1));
      const largoHilo = 6 + alto / 2;
      const giro = new THREE.Group();
      giro.position.copy(punto);
      giro.rotation.z = ang;
      p.position.set(0, -largoHilo - (p.userData.objeto ? alto / 2 : 0), i * 0.8 - n * 0.4);
      if (!p.userData.objeto) p.rotation.y = 0.25 * (i % 2 ? 1 : -1);
      giro.add(p);
      // Aro pequeño impreso que une la pieza a la cadena, del color de la pieza.
      const arg = new THREE.Mesh(extruir(formaAro("redondo", 0.75), 1.6), p.material || metal());
      arg.position.set(0, -4, 0);
      arg.rotation.y = Math.PI / 2;
      giro.add(arg);
      this.contenido.add(giro);
    });
    if (soloObjetos) return;
  }

  // Encuadra todo el contenido: la esfera que lo envuelve entra en el ángulo más estrecho.
  // margen < 1 acerca (la esfera es más grande que el objeto visto desde arriba).
  centrar(margen = 1.2) {
    const box = new THREE.Box3().setFromObject(this.contenido);
    if (box.isEmpty()) return;
    const centro = box.getCenter(new THREE.Vector3());
    const radio = box.getSize(new THREE.Vector3()).length() / 2 * margen;
    const vfov = (this.camara.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camara.aspect);
    const dist = radio / Math.sin(Math.min(vfov, hfov) / 2);
    this.controles.target.copy(centro);
    this.camara.position.copy(centro).add(new THREE.Vector3(0, 1.5, 1).normalize().multiplyScalar(dist));
    this.camara.near = dist / 50;
    this.camara.far = dist * 20;
    this.camara.updateProjectionMatrix();
    this.controles.update();
    this._encuadrado = true;
  }

  // Imagen del diseño actual, encuadrado de frente, en PNG.
  foto(ancho = 1080, alto = 810) {
    const w0 = this.lienzo.width, h0 = this.lienzo.height;
    const pos = this.camara.position.clone(), tgt = this.controles.target.clone();
    const ratio = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(ancho, alto, false);
    this.camara.aspect = ancho / alto;
    this.marcar(-1);
    this.centrar(0.95);
    this.renderer.render(this.escena, this.camara);
    const url = this.lienzo.toDataURL("image/png");
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w0 / ratio, h0 / ratio, false);
    this._medir();
    this.camara.position.copy(pos);
    this.controles.target.copy(tgt);
    this.controles.update();
    return url;
  }
}
