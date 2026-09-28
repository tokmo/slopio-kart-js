import * as THREE from 'three';
import { TRACK_W, WALL_OFFSET } from './track.js';
import { cowModel, chompModel, duckModel, bigMushroomModel, ufoModel, signModel, rampModel } from './models.js';
import { fx } from './fx.js';
import { emit } from './events.js';

export const SIGNS = [
  'PLOMBERIE MAMAMIA 24h/24 (sauf quand on a besoin)', 'ATTENTION : VACHES EN LIBERTÉ', 'LE MUR EST TON AMI',
  'BANANES BIO ne pas glisser (trop tard)', 'ICI RIEN NE SE PASSE', 'MAMAN JE SUIS À LA TÉLÉ',
  'TU VAS TROP VITE (nan je rigole)', 'EAU FRAÎCHE 8€ LE VERRE', 'CETTE PISTE EST SPONSORISÉE PAR TA MÈRE',
  'NE PAS NOURRIR LES KARTS', 'VIRAGE SERRÉ DANS 1 SEMAINE', 'GO KIRBI GO (il a faim)', 'TOUT FIN DE COURSE : UN CARAMBAR',
  'MERCI DE NE PAS MANGER LES CHAMPIGNONS', 'ON NE FREINE PAS, ON NÉGOCIE', 'TON KART A DIT TOUT VA BIEN',
];

const rnd = (a, b) => a + Math.random() * (b - a);

export class Props {
  constructor(scene, track) {
    this.scene = scene; this.track = track;
    this.cows = []; this.chomps = []; this.ramps = []; this.crowd = null; this.ufo = null;
    this.buildStands(); this.buildSigns(); this.buildDecor(); this.buildObstacles();
  }

  place(obj, idx, lat, extraRot = 0, y = 0) {
    const p = this.track.at(idx, lat);
    obj.position.set(p.x, y, p.z); obj.rotation.y = this.track.heading(idx) + extraRot;
    this.scene.add(obj); return obj;
  }

  trackDist(x, z) {
    let best = 1e9;
    for (let i = 0; i < this.track.N; i += 3) { const p = this.track.pts[i]; best = Math.min(best, (p.x - x) ** 2 + (p.z - z) ** 2); }
    return Math.sqrt(best);
  }

  // ------------------------------------------------ tribunes avec public qui saute
  buildStands() {
    const T = this.track, half = WALL_OFFSET + 5;
    const stone = new THREE.MeshLambertMaterial({ color: 0x9a9aa8 });
    const bodies = [], heads = [];
    const colors = [0xe01a22, 0x2b59d6, 0xffd820, 0x22b04a, 0xff8ac0, 0xffffff, 0xff8a10, 0x9b59ff];
    for (const side of [-1, 1]) {
      for (let tier = 0; tier < 4; tier++) {
        const g = new THREE.Mesh(new THREE.BoxGeometry(6, 1.6 + tier * 1.6, 44), stone);
        const p = T.at(T.N - 14, side * (half + 3 + tier * 5.5)); g.position.set(p.x, (1.6 + tier * 1.6) / 2, p.z); g.rotation.y = T.heading(T.N - 14);
        this.scene.add(g);
        for (let i = 0; i < 12; i++) {
          const dz = (i - 5.5) * 3.5 + rnd(-0.6, 0.6);
          const local = new THREE.Vector3(0, 0, dz).applyAxisAngle(new THREE.Vector3(0, 1, 0), T.heading(T.N - 14));
          bodies.push({ x: p.x + local.x + rnd(-1, 1), z: p.z + local.z, y: 1.6 + tier * 1.6, c: colors[Math.random() * colors.length | 0], ph: Math.random() * 6, side });
        }
      }
    }
    const n = bodies.length;
    this.crowd = {
      data: bodies,
      body: new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 1.8, 1.0), new THREE.MeshLambertMaterial({ color: 0xffffff }), n),
      head: new THREE.InstancedMesh(new THREE.SphereGeometry(0.65, 6, 5), new THREE.MeshLambertMaterial({ color: 0xffc9a0 }), n),
      arm: new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 1.4, 0.3), new THREE.MeshLambertMaterial({ color: 0xffc9a0 }), n * 2),
    };
    bodies.forEach((b, i) => this.crowd.body.setColorAt(i, new THREE.Color(b.c)));
    this.scene.add(this.crowd.body, this.crowd.head, this.crowd.arm);
    this._m = new THREE.Matrix4();
    this.updateCrowd(0);

    // banderoles sur le portique
    const p0 = T.pts[0];
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 32;
    const x = cv.getContext('2d'); x.fillStyle = '#d62839'; x.fillRect(0, 0, 256, 32); x.fillStyle = '#ffe23a';
    x.font = 'bold 15px Arial'; x.textAlign = 'center'; x.fillText('SLOPIO GRAND PRIX — LES LARMES SONT EN OPTION', 128, 21);
    const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_W + 6, 3), new THREE.MeshBasicMaterial({ map: t }));
    m.position.set(p0.x, 11, p0.z); m.rotation.y = T.heading(0) + Math.PI; m.translateZ(0.95); this.scene.add(m);
  }
  updateCrowd(time) {
    const c = this.crowd, m = this._m, q = new THREE.Quaternion(), e = new THREE.Euler();
    c.data.forEach((b, i) => {
      const jump = Math.max(0, Math.sin(time * 6 + b.ph)) * 1.4;
      e.set(0, this.track.heading(this.track.N - 14) + (b.side > 0 ? 0.5 : -0.5), 0); q.setFromEuler(e);
      m.compose(new THREE.Vector3(b.x, b.y + 0.9 + jump, b.z), q, new THREE.Vector3(1, 1, 1)); c.body.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(b.x, b.y + 2.4 + jump, b.z), q, new THREE.Vector3(1, 1, 1)); c.head.setMatrixAt(i, m);
      for (const s of [-1, 1]) {
        const off = new THREE.Vector3(s * 0.85, 1.6 + jump + Math.sin(time * 9 + b.ph) * 0.3, 0).applyQuaternion(q);
        m.compose(new THREE.Vector3(b.x + off.x, b.y + off.y, b.z + off.z), q, new THREE.Vector3(1, 1, 1)); c.arm.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), m);
      }
    });
    c.body.instanceMatrix.needsUpdate = c.head.instanceMatrix.needsUpdate = c.arm.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------ panneaux à blagues
  buildSigns() {
    const T = this.track;
    SIGNS.forEach((txt, i) => {
      const idx = Math.floor((i + 0.5) / SIGNS.length * T.N + 6), side = i % 2 ? 1 : -1;
      const s = signModel(txt, i);
      this.place(s, idx, side * (WALL_OFFSET + 3), Math.PI - side * 0.45);
      this.scene.add(s);
    });
  }

  // ------------------------------------------------ décors géants
  buildDecor() {
    const T = this.track, list = [];
    const spots = (n, minD, maxD, mk, scale) => {
      let placed = 0, tries = 0;
      while (placed < n && tries++ < 400) {
        const idx = Math.random() * T.N, side = Math.random() < 0.5 ? -1 : 1;
        const p = T.at(idx, side * (WALL_OFFSET + rnd(minD, maxD)));
        if (this.trackDist(p.x, p.z) < minD + WALL_OFFSET - 4) continue;
        if (list.some(q => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 900)) continue;
        list.push(p);
        const o = mk(); o.scale.setScalar(scale); o.position.set(p.x, 0, p.z);
        o.rotation.y = T.heading(idx) + Math.PI + side * rnd(0.2, 1.2); this.scene.add(o); placed++;
      }
    };
    spots(6, 20, 45, duckModel, 1.2);
    spots(9, 16, 50, () => bigMushroomModel(Math.random() < 0.5 ? 0xe01a22 : 0x9b59ff), 1);
    // canard géant sur socle près du départ
    const d = duckModel(); d.scale.setScalar(2.2); this.place(d, 40, -(WALL_OFFSET + 34), Math.PI + 0.5);
    // soucoupe volante qui tourne
    this.ufo = ufoModel(); this.ufo.position.set(0, 70, 160); this.scene.add(this.ufo);
  }

  // ------------------------------------------------ obstacles : vaches, boulets, tremplins
  buildObstacles() {
    const T = this.track;
    for (const [f, ph] of [[0.14, 0], [0.34, 2], [0.58, 4], [0.82, 1]]) {
      const cow = cowModel(); this.scene.add(cow);
      this.cows.push({ mesh: cow, idx: Math.floor(T.N * f) + 12, ph, cool: 0 });
    }
    for (const [f, ph] of [[0.26, 0], [0.70, 2.5]]) {
      const c = chompModel(); this.scene.add(c);
      this.chomps.push({ mesh: c, idx: Math.floor(T.N * f) + 18, ph, cool: 0 });
      // piquet + chaîne
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 5, 6), new THREE.MeshLambertMaterial({ color: 0x555566 }));
      this.place(post, Math.floor(T.N * f) + 18, WALL_OFFSET + 1.5, 0, 2.5);
    }
    for (const [f, lat] of [[0.06, 0], [0.47, -3], [0.93, 3]]) {
      const idx = Math.floor(T.N * f) + 5, r = rampModel();
      this.place(r, idx, lat); r.scale.setScalar(0.9);
      this.ramps.push({ idx, lat });
    }
  }

  update(dt, karts, time, sound) {
    const T = this.track;
    this.updateCrowd(time);
    this.ufo.position.set(Math.cos(time * 0.15) * 190 + 20, 70 + Math.sin(time * 0.7) * 4, Math.sin(time * 0.15) * 190 + 170);
    this.ufo.rotation.y += dt * 1.2; this.ufo.rotation.z = Math.sin(time * 0.9) * 0.1;

    for (const c of this.cows) {
      const lat = Math.sin(time * 0.35 + c.ph) * 15, dir = Math.cos(time * 0.35 + c.ph) > 0 ? 1 : -1;
      const p = T.at(c.idx, lat); c.mesh.position.set(p.x, 0, p.z);
      const r = T.right[c.idx % T.N];
      c.mesh.rotation.y = Math.atan2(r.x * dir, r.z * dir);
      c.mesh.userData.legs.forEach((l, i) => { l.rotation.x = Math.sin(time * 6 + i * Math.PI * 0.5 * (i % 2 ? 1 : -1)) * 0.5; });
      c.mesh.position.y = Math.abs(Math.sin(time * 6)) * 0.12;
      c.cool = Math.max(0, c.cool - dt);
      for (const k of karts) {
        if (k.y > 1.5) continue;
        if (k.pos.distanceTo(p) < 2.8 && k.hit('cow', 1.3)) { sound.moo(); emit('cow', k); c.cool = 1; }
      }
      if (Math.random() < dt * 0.15) sound.moo(0.3);
    }
    for (const c of this.chomps) {
      const s = Math.sin(time * 0.9 + c.ph), lat = s * 11, dir = Math.cos(time * 0.9 + c.ph) > 0 ? 1 : -1;
      const p = T.at(c.idx, lat), r = T.right[c.idx % T.N];
      const bounce = Math.abs(Math.sin(time * 3.4 + c.ph));
      c.mesh.position.set(p.x, 3.3 + bounce * 2.2, p.z);
      c.mesh.userData.face.rotation.y = 0;
      c.mesh.rotation.y = Math.atan2(r.x * dir, r.z * dir);
      c.mesh.userData.ball.scale.set(1 + (1 - bounce) * 0.08, 1 - (1 - bounce) * 0.08, 1);
      for (const k of karts) {
        if (k.y > 3) continue;
        const d = Math.hypot(k.pos.x - p.x, k.pos.z - p.z);
        if (d < 5 && k.hit('chomp', 1.6)) { sound.boom(); emit('chomp', k); k.v.x += r.x * dir * 25; k.v.z += r.z * dir * 25; }
      }
    }
    for (const k of karts) for (const rp of this.ramps) {
      let d = k.idx - rp.idx; if (d > T.N / 2) d -= T.N; if (d < -T.N / 2) d += T.N;
      if (d > -3 && d < 5 && Math.abs(k.lat - rp.lat) < 5 && !k.air && k.speed > 18 && k.spin <= 0) {
        k.jump(11 + Math.min(10, k.speed * 0.17)); emit('jump', k);
        if (k.isPlayer) sound.jump();
      }
    }
  }
}
