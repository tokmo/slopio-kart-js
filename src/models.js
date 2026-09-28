import * as THREE from 'three';

const mats = new Map();
const mat = c => { if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c })); return mats.get(c); };
const basic = c => new THREE.MeshBasicMaterial({ color: c });
const mesh = (geo, c, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, typeof c === 'number' ? mat(c) : c); m.position.set(x, y, z); return m; };
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ------------------------------------------------------------------ objets
export function mushroomModel() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.1, 8), 0xfff0d0, 0, 0.55, 0));
  const cap = mesh(new THREE.SphereGeometry(1.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xe01a22, 0, 1.0, 0);
  cap.scale.y = 0.9; g.add(cap);
  g.add(mesh(new THREE.CylinderGeometry(1.25, 1.2, 0.15, 12), 0xfff0d0, 0, 1.0, 0));     // dessous du chapeau
  const spot = new THREE.SphereGeometry(0.34, 6, 5);
  for (const [x, y, z, s] of [[0, 2.15, 0, 1.2], [0.85, 1.75, 0.3, 1], [-0.8, 1.7, 0.4, 1], [0.2, 1.65, -0.95, 0.9], [-0.4, 1.85, -0.7, 0.8], [0.3, 1.7, 0.95, 0.8]]) {
    const m = mesh(spot, 0xffffff, x, y, z); m.scale.set(s, s * 0.5, s); g.add(m);
  }
  for (const s of [-1, 1]) { g.add(mesh(new THREE.BoxGeometry(0.16, 0.34, 0.1), basic(0x000000), s * 0.22, 0.65, 0.66)); }  // yeux mignons
  return g;
}

export function bananaModel() {
  const g = new THREE.Group();
  const pts = [[-1.1, 0.0, 0], [-0.8, 0.5, 0], [-0.2, 0.8, 0], [0.5, 0.7, 0], [1.0, 0.25, 0], [1.2, -0.3, 0]].map(p => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(mesh(new THREE.TubeGeometry(curve, 10, 0.34, 5, false), 0xffdf20));
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([pts[0], new THREE.Vector3(-1.25, -0.15, 0)]), 2, 0.2, 5), 0x6b4a10));
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), 0x3a2a08, 1.25, -0.42, 0));
  g.add(mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), 0x4a7a20, -1.05, -0.45, 0));         // queue verte
  return g;
}

export function bananaPeelModel() {           // banane posée au sol : peau ouverte
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.6, 6, 4), 0xffdf20, 0, 0.35, 0)).scale.set(1, 0.5, 1.6);
  for (let i = 0; i < 3; i++) {
    const p = mesh(new THREE.BoxGeometry(0.45, 0.06, 1.3), 0xffe640, 0, 0.3, 0);
    p.rotation.y = (i / 3) * Math.PI * 2 + 0.4; p.position.set(Math.sin(p.rotation.y) * 0.7, 0.28, Math.cos(p.rotation.y) * 0.7); p.rotation.x = 0.25; g.add(p);
  }
  g.add(mesh(new THREE.SphereGeometry(0.15, 5, 4), 0x6b4a10, 0, 0.6, 0));
  return g;
}

export function shellModel(color = 0x22b04a) {
  const g = new THREE.Group();
  const hexTex = tex(64, 32, (c, w, h) => {
    c.fillStyle = '#' + color.toString(16).padStart(6, '0'); c.fillRect(0, 0, w, h);
    c.strokeStyle = '#0c5a25'; c.lineWidth = 2;
    for (let x = 0; x < w; x += 16) for (let y = 0; y < h; y += 10) {
      c.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; c.lineTo(x + 8 + Math.cos(a) * 7, y + 5 + Math.sin(a) * 5); } c.closePath(); c.stroke();
    }
  });
  const dome = mesh(new THREE.SphereGeometry(1.3, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ map: hexTex }), 0, 0.3, 0);
  dome.scale.y = 0.85; g.add(dome);
  g.add(mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.35, 10), 0xf6efd0, 0, 0.3, 0));   // bord blanc
  g.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 10), 0xe0c890, 0, 0.1, 0));
  const head = mesh(new THREE.SphereGeometry(0.5, 6, 5), 0xf2c84a, 0, 0.3, 1.35); g.add(head);
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.12, 0.2, 0.08), basic(0x000000), s * 0.2, 0.42, 1.8));
  return g;
}

export function bombModel() {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(1.15, 10, 8), 0x1a1a22, 0, 1.3, 0); g.add(body);
  g.add(mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.35, 8), 0x888899, 0, 2.4, 0));           // bouchon
  const fuse = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 4), 0xc8b070, 0, 2.85, 0); g.add(fuse);
  const spark = mesh(new THREE.OctahedronGeometry(0.28), basic(0xffd020), 0, 3.25, 0); spark.name = 'spark'; g.add(spark);
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.SphereGeometry(0.3, 6, 5), basic(0xffffff), s * 0.42, 1.55, 0.95)).scale.set(1, 1.4, 0.5);
    g.add(mesh(new THREE.SphereGeometry(0.13, 5, 4), basic(0x000000), s * 0.42, 1.5, 1.08));
    g.add(mesh(new THREE.BoxGeometry(0.6, 0.35, 0.9), 0xe0301a, s * 0.55, 0.15, 0.3));       // petits pieds
  }
  g.add(mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), 0xd8b020, 0, 1.4, -1.15));               // clé à remontage
  g.add(mesh(new THREE.BoxGeometry(0.7, 0.15, 0.15), 0xd8b020, 0, 1.7, -1.15));
  g.userData.body = body;
  return g;
}

export function starModel() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 0.55 : 1.35;
    i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 1 });
  geo.translate(0, 0, -0.25);
  const m = mesh(geo, 0xffd820, 0, 1.4, 0); g.add(m);
  for (const s of [-1, 1]) { g.add(mesh(new THREE.BoxGeometry(0.12, 0.4, 0.08), basic(0x000000), s * 0.25, 1.5, 0.45)); }
  return g;
}

export function itemModel(type) {
  return ({ mushroom: mushroomModel, banana: bananaModel, shell: shellModel, bomb: bombModel, star: starModel })[type]();
}

// ------------------------------------------------------------------ icônes HUD (pixel art dessiné au canvas 32x32)
export function drawIcon(ctx, type) {
  ctx.clearRect(0, 0, 32, 32); ctx.imageSmoothingEnabled = false;
  const fill = (c, fn) => { ctx.fillStyle = c; ctx.beginPath(); fn(); ctx.fill(); };
  const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  if (type === 'mushroom') {
    R('#fff0d0', 11, 18, 10, 10); R('#000', 13, 21, 2, 3); R('#000', 17, 21, 2, 3);
    fill('#e01a22', () => ctx.arc(16, 19, 14, Math.PI, 0)); R('#e01a22', 2, 18, 28, 3);
    fill('#fff', () => ctx.arc(9, 15, 3, 0, 7)); fill('#fff', () => ctx.arc(21, 11, 3.5, 0, 7)); fill('#fff', () => ctx.arc(16, 16, 2.5, 0, 7));
  } else if (type === 'banana') {
    ctx.strokeStyle = '#000'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(12, 9, 14, 0.2, 1.5); ctx.stroke();
    ctx.strokeStyle = '#ffdf20'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(12, 9, 14, 0.2, 1.5); ctx.stroke();
    R('#5a3a08', 22, 20, 4, 4);
  } else if (type === 'shell') {
    fill('#000', () => ctx.arc(16, 20, 14, Math.PI, 0)); fill('#22b04a', () => ctx.arc(16, 20, 12, Math.PI, 0));
    R('#000', 1, 19, 30, 7); R('#f6efd0', 3, 20, 26, 4);
    R('#0c5a25', 15, 10, 2, 9); R('#0c5a25', 8, 14, 16, 2);
  } else if (type === 'bomb') {
    fill('#000', () => ctx.arc(16, 19, 12, 0, 7)); fill('#2a2a36', () => ctx.arc(15, 18, 9, 0, 7));
    R('#888', 12, 4, 8, 5); R('#c8b070', 15, 1, 2, 4); R('#ffd020', 14, 0, 4, 3);
    R('#fff', 10, 15, 4, 6); R('#fff', 17, 15, 4, 6); R('#000', 12, 17, 2, 3); R('#000', 19, 17, 2, 3);
  } else if (type === 'star') {
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.fillStyle = '#ffd820'; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * 6.283, r = i % 2 ? 6 : 14; ctx[i ? 'lineTo' : 'moveTo'](16 + Math.cos(a) * r, 17 + Math.sin(a) * r); }
    ctx.closePath(); ctx.stroke(); ctx.fill(); R('#000', 12, 15, 2, 4); R('#000', 18, 15, 2, 4);
  }
}

// ------------------------------------------------------------------ décors & obstacles rigolos
export function cowModel() {
  const g = new THREE.Group();
  const skin = tex(32, 16, (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#151515';
    for (let i = 0; i < 6; i++) c.fillRect(Math.random() * w, Math.random() * h, 5 + Math.random() * 6, 4 + Math.random() * 4);
  });
  const sm = new THREE.MeshLambertMaterial({ map: skin });
  g.add(mesh(new THREE.BoxGeometry(1.8, 1.6, 3.4), sm, 0, 2.0, 0));
  const head = new THREE.Group(); head.position.set(0, 2.5, 2.0); g.add(head);
  head.add(mesh(new THREE.BoxGeometry(1.1, 1.1, 1.2), sm, 0, 0, 0));
  head.add(mesh(new THREE.BoxGeometry(0.9, 0.6, 0.5), 0xf4b6b0, 0, -0.3, 0.75));
  for (const s of [-1, 1]) {
    head.add(mesh(new THREE.BoxGeometry(0.15, 0.15, 0.08), basic(0x000000), s * 0.35, 0.25, 0.62));
    head.add(mesh(new THREE.ConeGeometry(0.14, 0.5, 4), 0xf0e6c0, s * 0.5, 0.75, 0.0));
    head.add(mesh(new THREE.BoxGeometry(0.5, 0.15, 0.3), sm, s * 0.8, 0.35, 0));
    head.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), basic(0x000000), s * 0.2, -0.25, 1.02));
  }
  g.userData.legs = [];
  for (const [x, z] of [[-0.6, 1.3], [0.6, 1.3], [-0.6, -1.3], [0.6, -1.3]]) {
    const leg = mesh(new THREE.BoxGeometry(0.4, 1.3, 0.4), 0xf0f0f0, x, 0.65, z); g.add(leg); g.userData.legs.push(leg);
  }
  g.add(mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), 0x151515, 0, 2.1, -1.8, ));
  const u = mesh(new THREE.SphereGeometry(0.4, 6, 5), 0xf4b6b0, 0, 1.15, -0.8); g.add(u);   // pis
  return g;
}

export function chompModel() {
  const g = new THREE.Group();
  const ball = new THREE.Group(); g.add(ball);
  ball.add(mesh(new THREE.SphereGeometry(3.2, 12, 9), 0x15151c));
  ball.add(mesh(new THREE.SphereGeometry(3.3, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.12), 0x33334a, 0, 0, 0)).rotation.x = -0.5;
  const face = new THREE.Group(); ball.add(face);       // face vers +z
  for (const s of [-1, 1]) {
    face.add(mesh(new THREE.SphereGeometry(0.85, 8, 6), basic(0xffffff), s * 1.3, 1.1, 2.6)).scale.set(1, 1.2, 0.5);
    face.add(mesh(new THREE.SphereGeometry(0.34, 6, 5), basic(0x000000), s * 1.25, 1.0, 3.0));
    const brow = mesh(new THREE.BoxGeometry(1.6, 0.35, 0.3), 0x000000, s * 1.3, 2.25, 2.8); brow.rotation.z = s * 0.45; face.add(brow);
  }
  face.add(mesh(new THREE.BoxGeometry(3.8, 1.5, 1.0), 0xb01020, 0, -1.2, 2.7));            // gueule
  for (let i = -3; i <= 3; i++) {
    face.add(mesh(new THREE.ConeGeometry(0.28, 0.8, 4), 0xffffff, i * 0.5, -0.5, 3.15)).rotation.x = Math.PI;
    face.add(mesh(new THREE.ConeGeometry(0.28, 0.8, 4), 0xffffff, i * 0.5, -1.9, 3.15));
  }
  g.userData.ball = ball; g.userData.face = face;
  return g;
}

export function duckModel() {
  const g = new THREE.Group();
  const y = 0xffd820;
  g.add(mesh(new THREE.SphereGeometry(2.4, 10, 8), y, 0, 2.2, 0)).scale.set(1, 0.85, 1.25);
  g.add(mesh(new THREE.SphereGeometry(1.5, 10, 8), y, 0, 4.6, 1.6));
  g.add(mesh(new THREE.BoxGeometry(1.5, 0.45, 1.3), 0xff8a10, 0, 4.35, 2.9));
  g.add(mesh(new THREE.BoxGeometry(1.3, 0.25, 1.0), 0xe07008, 0, 4.0, 2.8));
  g.add(mesh(new THREE.ConeGeometry(0.9, 1.6, 5), y, 0, 2.9, -2.6)).rotation.x = -2.0;
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.SphereGeometry(0.28, 6, 5), basic(0x000000), s * 0.75, 5.0, 2.55));
    g.add(mesh(new THREE.SphereGeometry(0.75, 6, 5), 0xf0c010, s * 2.1, 2.5, 0)).scale.set(0.4, 0.8, 1.2);
  }
  return g;
}

export function bigMushroomModel(color = 0xe01a22) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(2.2, 3, 7, 8), 0xfff0d0, 0, 3.5, 0));
  const cap = mesh(new THREE.SphereGeometry(6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), color, 0, 6.5, 0); cap.scale.y = 0.75; g.add(cap);
  for (const [a, h, r] of [[0, 4.2, 0], [1.3, 3.6, 3], [2.6, 3.4, 3.4], [3.9, 3.8, 3.2], [5.2, 3.4, 3.6], [0.7, 2.4, 4.6]])
    g.add(mesh(new THREE.SphereGeometry(1.1, 6, 5), 0xffffff, Math.cos(a) * r, 6.5 + h * 0.85, Math.sin(a) * r)).scale.y = 0.5;
  return g;
}

export function ufoModel() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(9, 12, 8), 0xb0b8c8, 0, 0, 0)).scale.y = 0.28;
  g.add(mesh(new THREE.SphereGeometry(4.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x66e0ff, transparent: true, opacity: 0.8 }), 0, 1.4, 0));
  g.add(mesh(new THREE.SphereGeometry(1.2, 6, 5), 0x66ff66, 0, 2.2, 0));       // petit alien
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; g.add(mesh(new THREE.SphereGeometry(0.6, 5, 4), basic(i % 2 ? 0xff5050 : 0xffe040), Math.cos(a) * 8, -0.3, Math.sin(a) * 8)); }
  const beam = mesh(new THREE.CylinderGeometry(3, 10, 55, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xaaffcc, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }), 0, -28, 0);
  g.add(beam);
  return g;
}

export function signTexture(text, bg, fg) {
  return tex(128, 48, (c, w, h) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h); c.strokeStyle = fg; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4);
    c.fillStyle = fg; c.font = 'bold 14px Arial'; c.textAlign = 'center';
    const words = text.split(' '), lines = []; let cur = '';
    for (const wd of words) { if ((cur + ' ' + wd).length > 15) { lines.push(cur); cur = wd; } else cur = (cur ? cur + ' ' : '') + wd; }
    lines.push(cur);
    lines.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 15 + 5));
  });
}

export function signModel(text, i) {
  const g = new THREE.Group();
  const cols = [['#ffd820', '#111'], ['#e01a22', '#fff'], ['#2b59d6', '#fff'], ['#fff', '#d8232a'], ['#22b04a', '#fff'], ['#ff8a10', '#111']][i % 6];
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.4, 5, 0.4), 0x6b4a2a, s * 3.3, 2.5, 0));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), new THREE.MeshBasicMaterial({ map: signTexture(text, cols[0], cols[1]), side: THREE.DoubleSide }));
  board.position.set(0, 5.3, 0.25); g.add(board);
  return g;
}

export function rampModel() {
  const g = new THREE.Group();
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(9, 0); sh.lineTo(9, 2.2); sh.lineTo(0, 0.1);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 9, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); geo.translate(4.5, 0, -4.5);
  g.add(mesh(geo, 0xf29a1a));
  const stripe = tex(16, 16, (c) => { c.fillStyle = '#f29a1a'; c.fillRect(0, 0, 16, 16); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, 16); c.lineTo(8, 0); c.lineTo(16, 16); c.lineTo(12, 16); c.lineTo(8, 8); c.lineTo(4, 16); c.fill(); });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(9, 9.3), new THREE.MeshBasicMaterial({ map: stripe, side: THREE.DoubleSide }));
  top.rotation.x = -Math.PI / 2 - Math.atan2(2.1, 9); top.rotation.order = 'YXZ'; top.position.set(0, 1.12, 0.0); g.add(top);
  return g;
}
