import * as THREE from 'three';

export const TRACK_W = 26;      // largeur totale de la piste
export const WALL_OFFSET = 21;  // distance du mur par rapport à l'axe

const CONTROL = [
  [0, 0], [110, -6], [210, 30], [270, 110], [250, 200], [170, 250],
  [90, 235], [40, 290], [-30, 350], [-120, 340], [-190, 270], [-170, 180],
  [-90, 140], [-110, 70], [-70, 20],
];

function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapNearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function noise(ctx, w, h, base, amp) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = (Math.random() - 0.5) * amp;
    ctx.fillStyle = `rgb(${base[0] + n | 0},${base[1] + n | 0},${base[2] + n | 0})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

export class Track {
  constructor(scene) {
    const pts = CONTROL.map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
    this.length = this.curve.getLength();
    this.N = Math.round(this.length / 2);
    this.pts = this.curve.getSpacedPoints(this.N).slice(0, this.N);
    const N = this.N;
    this.tan = []; this.right = [];
    for (let i = 0; i < N; i++) {
      const t = this.pts[(i + 1) % N].clone().sub(this.pts[(i - 1 + N) % N]).setY(0).normalize();
      this.tan.push(t);
      this.right.push(new THREE.Vector3(-t.z, 0, t.x));
    }
    this.build(scene);
  }

  wrap(i) { const N = this.N; return ((i % N) + N) % N; }

  // position à l'indice flottant f avec décalage latéral lat (positif = droite)
  at(f, lat = 0, out = new THREE.Vector3()) {
    const N = this.N, i = Math.floor(f), a = f - i;
    const p0 = this.pts[this.wrap(i)], p1 = this.pts[this.wrap(i + 1)];
    const r0 = this.right[this.wrap(i)], r1 = this.right[this.wrap(i + 1)];
    out.set(
      p0.x + (p1.x - p0.x) * a + (r0.x + (r1.x - r0.x) * a) * lat, 0,
      p0.z + (p1.z - p0.z) * a + (r0.z + (r1.z - r0.z) * a) * lat);
    return out;
  }

  heading(f) { const t = this.tan[this.wrap(Math.round(f))]; return Math.atan2(t.x, t.z); }

  // cherche l'échantillon le plus proche autour de hint
  locate(x, z, hint) {
    let best = hint, bd = Infinity;
    for (let k = -12; k <= 24; k++) {
      const i = this.wrap(hint + k), p = this.pts[i];
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    const p = this.pts[best], r = this.right[best];
    return { idx: best, lat: (x - p.x) * r.x + (z - p.z) * r.z };
  }

  // angle de virage cumulé entre deux indices (signé, positif = gauche)
  curvature(i, span) {
    const a = this.tan[this.wrap(i)], b = this.tan[this.wrap(i + span)];
    return Math.atan2(a.z * b.x - a.x * b.z, a.x * b.x + a.z * b.z) * -1;
  }

  ribbon(off0, off1, y, vScale, mat, extraY = 0, wall = false) {
    const N = this.N, pos = [], uv = [], idx = [];
    let d = 0;
    for (let i = 0; i <= N; i++) {
      const k = i % N, p = this.pts[k], r = this.right[k];
      if (i > 0) d += this.pts[k].distanceTo(this.pts[(k - 1 + N) % N]);
      const a = [p.x + r.x * off0, p.z + r.z * off0], b = [p.x + r.x * off1, p.z + r.z * off1];
      if (wall) {
        pos.push(a[0], y, a[1], a[0], y + extraY, a[1]);
        uv.push(0, d / vScale, 1, d / vScale);
      } else {
        pos.push(a[0], y, a[1], b[0], y, b[1]);
        uv.push(0, d / vScale, 1, d / vScale);
      }
      if (i < N) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    return m;
  }

  build(scene) {
    const half = TRACK_W / 2;
    // sol
    const grassTex = canvasTex(32, 32, (c, w, h) => {
      noise(c, w, h, [58, 148, 56], 30);
      c.fillStyle = 'rgba(30,110,40,.5)';
      for (let i = 0; i < 20; i++) c.fillRect(Math.random() * w, Math.random() * h, 2, 1);
    });
    grassTex.repeat.set(500, 500);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000),
      new THREE.MeshLambertMaterial({ map: grassTex }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05;
    scene.add(ground);

    // route
    const roadTex = canvasTex(64, 64, (c, w, h) => {
      noise(c, w, h, [86, 86, 94], 22);
      c.fillStyle = '#eee';
      c.fillRect(2, 0, 3, h); c.fillRect(w - 5, 0, 3, h);
      c.fillStyle = '#ffd400';
      c.fillRect(w / 2 - 1, 4, 3, h / 2 - 6);
    });
    const road = this.ribbon(-half, half, 0.02, 32, new THREE.MeshLambertMaterial({ map: roadTex }));
    scene.add(road);

    // vibreurs
    const kerbTex = canvasTex(8, 16, (c, w, h) => {
      c.fillStyle = '#e11d2a'; c.fillRect(0, 0, w, h / 2);
      c.fillStyle = '#fff'; c.fillRect(0, h / 2, w, h / 2);
    });
    const kerbMat = new THREE.MeshLambertMaterial({ map: kerbTex });
    scene.add(this.ribbon(half, half + 2.5, 0.03, 5, kerbMat));
    scene.add(this.ribbon(-half - 2.5, -half, 0.03, 5, kerbMat));

    // murs
    const wallTex = canvasTex(16, 16, (c, w, h) => {
      c.fillStyle = '#2b59d6'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, 3); c.fillRect(0, h - 3, w, 3);
      c.fillStyle = '#f4d03f'; c.fillRect(0, 6, w, 4);
    });
    const wallMat = new THREE.MeshLambertMaterial({ map: wallTex, side: THREE.DoubleSide });
    scene.add(this.ribbon(WALL_OFFSET, 0, 0, 6, wallMat, 1.8, true));
    scene.add(this.ribbon(-WALL_OFFSET, 0, 0, 6, wallMat, 1.8, true));

    // ligne de départ
    const chk = canvasTex(8, 2, (c, w, h) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        c.fillStyle = (x + y) % 2 ? '#fff' : '#111'; c.fillRect(x, y, 1, 1);
      }
    });
    const line = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_W, 4),
      new THREE.MeshBasicMaterial({ map: chk }));
    line.rotation.x = -Math.PI / 2;
    const p0 = this.pts[0];
    const lg = new THREE.Group();
    lg.position.set(p0.x, 0, p0.z);
    lg.rotation.y = this.heading(0);
    line.position.set(0, 0.05, 0);
    lg.add(line);
    // portique
    const mat = new THREE.MeshLambertMaterial({ color: 0xd62839 });
    for (const s of [-1, 1]) {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(1.6, 11, 1.6), mat);
      pil.position.set(s * (half + 2.5), 5.5, 0); lg.add(pil);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(TRACK_W + 8, 3, 1.6), mat);
    bar.position.set(0, 11, 0); lg.add(bar);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_W + 5, 2.2),
      new THREE.MeshBasicMaterial({ map: chk, side: THREE.DoubleSide }));
    flag.position.set(0, 11, 0.9); lg.add(flag);
    scene.add(lg);

    // arbres
    const trunkG = new THREE.CylinderGeometry(0.7, 1, 4, 5).translate(0, 2, 0);
    const leafG = new THREE.ConeGeometry(4.2, 11, 6).translate(0, 9, 0);
    const COUNT = 700;
    const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: 0x6b4423 }), COUNT);
    const leaves = new THREE.InstancedMesh(leafG, new THREE.MeshLambertMaterial({ color: 0xffffff }), COUNT);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    let n = 0, tries = 0;
    while (n < COUNT && tries++ < 20000) {
      const x = (Math.random() - 0.5) * 900 + 40, z = (Math.random() - 0.5) * 900 + 160;
      let ok = true;
      for (let i = 0; i < this.N; i += 2) {
        const p = this.pts[i];
        if ((p.x - x) ** 2 + (p.z - z) ** 2 < 32 * 32) { ok = false; break; }
      }
      if (!ok) continue;
      const s = 0.7 + Math.random() * 0.9;
      m4.makeScale(s, s, s).setPosition(x, 0, z);
      trunks.setMatrixAt(n, m4); leaves.setMatrixAt(n, m4);
      leaves.setColorAt(n, col.setHSL(0.30 + Math.random() * 0.06, 0.6, 0.22 + Math.random() * 0.1));
      n++;
    }
    trunks.count = leaves.count = n;
    scene.add(trunks, leaves);
  }
}
