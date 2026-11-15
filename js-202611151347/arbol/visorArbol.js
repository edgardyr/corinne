// Escena 3D del árbol de Navidad. Medidas en milímetros; el árbol va de pie, con el frente hacia la cámara.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mallaDePieza } from "./mallas.js";

export class VisorArbol {
  constructor(lienzo) {
    this.lienzo = lienzo;
    this.renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.escena = new THREE.Scene();
    this.camara = new THREE.PerspectiveCamera(32, 1, 1, 6000);
    this.controles = new OrbitControls(this.camara, lienzo);
    this.controles.enableDamping = true;
    this.controles.enablePan = true;       // mover la vista: dos dedos, o clic derecho en la computadora
    this.controles.screenSpacePanning = true;
    this.controles.minDistance = 80;
    this.controles.maxDistance = 2500;

    this.escena.add(new THREE.HemisphereLight(0xffffff, 0xe8d9cc, 1.5));
    const sol = new THREE.DirectionalLight(0xffffff, 1.9);
    sol.position.set(-160, 260, 420);
    this.escena.add(sol);
    const relleno = new THREE.DirectionalLight(0xffffff, 0.7);
    relleno.position.set(300, 40, 60);
    this.escena.add(relleno);

    this.contenido = new THREE.Group();
    this.escena.add(this.contenido);
    // Medidas dibujadas sobre el árbol: alto, ancho, fondo y el ancho de cada pieza.
    this.cotas = new THREE.Group();
    this.escena.add(this.cotas);
    this._encuadrado = false;
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

  // Dibuja el árbol. "colorDe" recibe la clave de color de una pieza y devuelve { hex, brillo }.
  actualizar(arbol, colorDe, { reencuadrar = false } = {}) {
    for (const m of this.contenido.children) { m.geometry.dispose(); m.material.dispose(); }
    this.contenido.clear();
    for (const p of arbol.piezas) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(mallaDePieza(p.capas), 3));
      g.computeVertexNormals();
      const c = colorDe(p.color);
      const malla = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
        color: new THREE.Color(c.hex), roughness: c.brillo ? 0.3 : 0.6, metalness: c.brillo ? 0.25 : 0,
      }));
      malla.position.z = p.atras || 0;
      this.contenido.add(malla);
    }
    this.contenido.position.set(0, -arbol.alto / 2, -arbol.fondo / 2);
    this.cotas.position.copy(this.contenido.position);
    this._dibujarCotas(arbol);
    if (arbol.piezas.length && (reencuadrar || !this._encuadrado)) this.centrar();
  }

  mostrarCotas(si) { this.cotas.visible = si; }

  _etiqueta(texto, alto, ancla = 0.5) {
    const c = document.createElement("canvas");
    const x = c.getContext("2d");
    const fuente = "600 56px Montserrat, system-ui, sans-serif";
    x.font = fuente;
    const w = Math.ceil(x.measureText(texto).width) + 44;
    c.width = w; c.height = 84;
    x.fillStyle = "rgba(255,255,255,0.92)";
    x.beginPath(); x.roundRect(0, 0, w, 84, 26); x.fill();
    x.font = fuente; x.fillStyle = "#2C2F66"; x.textBaseline = "middle"; x.textAlign = "center";
    x.fillText(texto, w / 2, 45);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    sp.scale.set(alto * w / 84, alto, 1);
    sp.center.set(ancla, 0.5);
    sp.renderOrder = 10;
    return sp;
  }

  _dibujarCotas(arbol) {
    for (const o of this.cotas.children) { o.geometry?.dispose(); o.material.map?.dispose(); o.material.dispose(); }
    this.cotas.clear();
    if (!arbol.piezas.length) return;
    const cm = (mm) => (mm / 10).toFixed(1).replace(".", ",") + " cm";
    const h = arbol.alto * 0.058, g = arbol.alto * 0.04, z = arbol.fondo;
    const x0 = Math.min(...arbol.piezas.map((p) => p.caja.x0)), x1 = Math.max(...arbol.piezas.map((p) => p.caja.x1));
    const puntos = [];
    const linea = (a, b, t) => {            // línea de medida con sus dos topes
      puntos.push(...a, ...b);
      for (const p of [a, b]) puntos.push(p[0] - t[0], p[1] - t[1], p[2] - t[2], p[0] + t[0], p[1] + t[1], p[2] + t[2]);
    };
    const poner = (texto, x, y, zz, ancla) => { const e = this._etiqueta(texto, h, ancla); e.position.set(x, y, zz); this.cotas.add(e); };
    // Alto total, a la izquierda.
    linea([x0 - g, 0, z], [x0 - g, arbol.alto, z], [g / 3, 0, 0]);
    poner("↕ " + cm(arbol.alto), x0 - g * 1.5, arbol.alto / 2, z, 1);
    // Ancho de cada pieza, a su derecha.
    for (const p of arbol.piezas) {
      if (p.tipo === "estrella" || p.tipo === "base") continue;
      poner("↔ " + cm(p.caja.x1 - p.caja.x0), p.caja.x1 + g * 0.6, (p.caja.y0 + p.caja.y1) / 2, z, 0);
    }
    // Fondo, abajo a la derecha.
    const base = arbol.piezas[arbol.piezas.length - 1].caja;
    linea([base.x1 + g * 0.6, 0, 0], [base.x1 + g * 0.6, 0, z], [0, g / 3, 0]);
    poner("fondo " + cm(arbol.fondo) + (arbol.fondoBase > arbol.fondo ? " · base " + cm(arbol.fondoBase) : ""), base.x1 + g * 1.2, -g * 1.3, z / 2, 0);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(puntos, 3));
    const lin = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x2c2f66, depthTest: false }));
    lin.renderOrder = 9;
    this.cotas.add(lin);
  }

  // Encuadra el árbol visto un poco de lado, para que se note el grosor.
  centrar(margen = 1.08, direccion = new THREE.Vector3(0.3, 0.12, 1)) {
    const box = new THREE.Box3().setFromObject(this.contenido);
    if (box.isEmpty()) return;
    if (this.cotas.visible) margen *= 1.22;   // sitio para las etiquetas de los lados
    const centro = box.getCenter(new THREE.Vector3());
    const radio = (box.getSize(new THREE.Vector3()).length() / 2) * margen;
    const vfov = (this.camara.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camara.aspect);
    const dist = radio / Math.sin(Math.min(vfov, hfov) / 2);
    this.controles.target.copy(centro);
    this.camara.position.copy(centro).add(direccion.clone().normalize().multiplyScalar(dist));
    this.camara.near = dist / 50;
    this.camara.far = dist * 20;
    this.camara.updateProjectionMatrix();
    this.controles.update();
    this._encuadrado = true;
  }

  // Imagen del árbol, encuadrado, en PNG.
  foto(ancho = 1080, alto = 1080) {
    const w0 = this.lienzo.width, h0 = this.lienzo.height;
    const pos = this.camara.position.clone(), tgt = this.controles.target.clone();
    const ratio = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(ancho, alto, false);
    this.camara.aspect = ancho / alto;
    const conCotas = this.cotas.visible;
    this.cotas.visible = false;             // la foto del pedido va limpia
    this.centrar(1.02, new THREE.Vector3(0.26, 0.1, 1));
    this.renderer.render(this.escena, this.camara);
    const url = this.lienzo.toDataURL("image/png");
    this.cotas.visible = conCotas;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w0 / ratio, h0 / ratio, false);
    this._medir();
    this.camara.position.copy(pos);
    this.controles.target.copy(tgt);
    this.controles.update();
    return url;
  }
}
