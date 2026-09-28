import * as THREE from 'three';
import { itemModel, bananaPeelModel, shellModel, bombModel } from './models.js';
import { fx } from './fx.js';
import { emit } from './events.js';

export const ITEM_NAMES = { mushroom: 'Champignon douteux', banana: 'Peau de banane', shell: 'Carapace teigneuse', bomb: 'Bombe pas contente', star: 'Étoile de la mort qui tue' };

export class Items {
  constructor(scene, track, sound) {
    this.scene = scene; this.track = track; this.sound = sound;
    this.boxes = []; this.pads = []; this.bananas = []; this.shells = []; this.bombs = [];

    // ---- cases à objets : cube-cadre translucide arc-en-ciel avec un "?" flottant
    const qTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 64, 64);
      g.addColorStop(0, '#ff3860'); g.addColorStop(0.35, '#ffd820'); g.addColorStop(0.7, '#30e070'); g.addColorStop(1, '#2ab8ff');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, 0, 64, 12);
      x.strokeStyle = '#fff'; x.lineWidth = 5; x.strokeRect(2, 2, 60, 60);
      x.fillStyle = '#fff'; x.strokeStyle = '#222'; x.lineWidth = 5; x.font = 'bold 50px Arial'; x.textAlign = 'center';
      x.strokeText('?', 32, 50); x.fillText('?', 32, 50);
      const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const boxGeo = new THREE.BoxGeometry(3, 3, 3);
    const boxMat = new THREE.MeshBasicMaterial({ map: qTex, transparent: true, opacity: 0.88 });
    const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(3.3, 3.3, 3.3));
    this.boxRows = [0.08, 0.30, 0.52, 0.75].map(f => Math.floor(track.N * f));
    for (const row of this.boxRows) for (const lat of [-7, 0, 7]) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(boxGeo, boxMat));
      g.add(new THREE.LineSegments(frameGeo, new THREE.LineBasicMaterial({ color: 0xffffff })));
      const p = track.at(row, lat); g.position.set(p.x, 2, p.z);
      scene.add(g);
      this.boxes.push({ mesh: g, idx: row, lat, cool: 0 });
    }

    // ---- plaques turbo
    const padTex = (() => {
      const c = document.createElement('canvas'); c.width = 16; c.height = 32;
      const x = c.getContext('2d');
      x.fillStyle = '#ff7a00'; x.fillRect(0, 0, 16, 32);
      x.fillStyle = '#ffe600';
      for (const y of [4, 16]) { x.beginPath(); x.moveTo(8, y); x.lineTo(15, y + 10); x.lineTo(1, y + 10); x.fill(); }
      const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const padGeo = new THREE.PlaneGeometry(6, 10);
    padGeo.rotateX(-Math.PI / 2);
    for (const f of [0.18, 0.42, 0.63, 0.88]) {
      const idx = Math.floor(track.N * f), lat = (f * 100 | 0) % 2 ? 5 : -5;
      const m = new THREE.Mesh(padGeo, new THREE.MeshBasicMaterial({ map: padTex }));
      const p = track.at(idx, lat); m.position.set(p.x, 0.08, p.z);
      m.rotation.y = track.heading(idx) + Math.PI;
      scene.add(m);
      this.pads.push({ idx, lat });
    }
  }

  reset() {
    for (const b of this.bananas) this.scene.remove(b.mesh);
    for (const s of this.shells) this.scene.remove(s.mesh);
    for (const b of this.bombs) this.scene.remove(b.mesh);
    this.bananas = []; this.shells = []; this.bombs = [];
    for (const b of this.boxes) { b.cool = 0; b.mesh.visible = true; }
  }

  give(kart) { if (!kart.item && kart.roulette <= 0) kart.roulette = 1.0; }

  use(kart) {
    const it = kart.item; if (!it) return;
    kart.item = null;
    emit('use', kart, it);
    if (it === 'mushroom') { kart.giveBoost(1.3); if (kart.isPlayer) this.sound.boost(); }
    else if (it === 'star') { kart.star = 7; if (kart.isPlayer) this.sound.star(); }
    else if (it === 'banana') {
      const m = bananaPeelModel(); m.scale.setScalar(1.3);
      const f = kart.fwd; m.position.copy(kart.pos).addScaledVector(f, -4); m.position.y = 0;
      this.scene.add(m); this.bananas.push({ mesh: m });
    } else if (it === 'bomb') {
      const m = bombModel(); m.scale.setScalar(0.75);
      m.position.copy(kart.pos).addScaledVector(kart.fwd, -4); m.position.y = 0;
      this.scene.add(m); this.bombs.push({ mesh: m, t: 0, owner: kart });
    } else if (it === 'shell') {
      const m = shellModel(); m.scale.setScalar(0.85);
      this.scene.add(m);
      this.shells.push({ mesh: m, idx: kart.idx + 3, lat: kart.lat, owner: kart, life: 9, t: 0 });
    }
  }

  detonate(b, karts) {
    const p = b.mesh.position; fx.explode(p, 9); this.sound.boom(); emit('boom', b.owner, p);
    for (const k of karts) if (k.pos.distanceTo(p) < 10) { if (k.hit('bomb', 1.5) && k.isPlayer) this.sound.hit(); }
    this.scene.remove(b.mesh);
  }

  update(dt, karts, time) {
    const N = this.track.N;
    for (const b of this.boxes) {
      b.mesh.rotation.y += dt * 2; b.mesh.rotation.x += dt * 1.2;
      b.mesh.position.y = 2.4 + Math.sin(time * 3 + b.idx) * 0.35;
      if (b.cool > 0) { b.cool -= dt; b.mesh.visible = b.cool <= 0; }
      else for (const k of karts) {
        const dx = k.pos.x - b.mesh.position.x, dz = k.pos.z - b.mesh.position.z;
        if (dx * dx + dz * dz < 9) {
          b.cool = 3; b.mesh.visible = false;
          for (let i = 0; i < 14; i++) fx.spark(b.mesh.position.x, 2, b.mesh.position.z, new THREE.Color().setHSL(Math.random(), 1, 0.6).getHex());
          if (!k.item && k.roulette <= 0) { this.give(k); if (k.isPlayer) this.sound.pickup(); }
        }
      }
    }
    for (const k of karts) for (const p of this.pads) {
      let d = k.idx - p.idx; if (d > N / 2) d -= N; if (d < -N / 2) d += N;
      if (Math.abs(d) < 3 && Math.abs(k.lat - p.lat) < 4.2 && k.boost < 0.8 && k.y < 0.5) { k.giveBoost(1.0); emit('pad', k); if (k.isPlayer) this.sound.boost(); }
    }
    for (const k of karts) if (k.roulette > 0) {
      k.roulette -= dt;
      if (k.roulette <= 0) {
        const behind = k.place > 4, front = k.place <= 2;
        const pool = front ? ['banana', 'banana', 'shell', 'bomb', 'mushroom']
          : behind ? ['mushroom', 'mushroom', 'star', 'bomb', 'shell', 'star'] : ['banana', 'mushroom', 'shell', 'bomb', 'mushroom', 'star'];
        k.item = pool[Math.random() * pool.length | 0];
        emit('got', k, k.item);
        if (k.isPlayer) this.sound.item();
      }
    }
    for (const b of this.bananas) b.mesh.rotation.y += dt;
    for (let i = this.bananas.length - 1; i >= 0; i--) {
      const b = this.bananas[i];
      for (const k of karts) {
        if (k.y > 1) continue;
        const dx = k.pos.x - b.mesh.position.x, dz = k.pos.z - b.mesh.position.z;
        if (dx * dx + dz * dz < 5.5 && (k.star > 0 || k.hit('banana'))) {
          if (k.isPlayer) this.sound.hit();
          this.scene.remove(b.mesh); this.bananas.splice(i, 1); break;
        }
      }
    }
    // bombes : mèche 3,2 s, explosent aussi au contact
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i]; b.t += dt;
      const flash = Math.floor(b.t * (4 + b.t * 4)) % 2;
      const body = b.mesh.userData.body;
      b.dark = b.dark || body.material; b.red = b.red || new THREE.MeshBasicMaterial({ color: 0xff2020 });
      body.material = flash ? b.red : b.dark;
      b.mesh.getObjectByName('spark').rotation.y += dt * 12;
      b.mesh.position.y = Math.abs(Math.sin(b.t * 6)) * 0.4;
      let boom = b.t > 3.2;
      if (b.t > 0.5) for (const k of karts) { if (k.pos.distanceTo(b.mesh.position) < 3) boom = true; }
      if (boom) { this.detonate(b, karts); this.bombs.splice(i, 1); }
    }
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.life -= dt; s.t += dt; s.idx += (95 * dt) / (this.track.length / N);
      let target = null, bd = 40;
      for (const k of karts) {
        if (k === s.owner && s.t < 1) continue;
        let d = k.idx - (s.idx % N); if (d < -N / 2) d += N; if (d > N / 2) d -= N;
        if (d > 0 && d < bd) { bd = d; target = k; }
      }
      if (target) s.lat += Math.max(-25 * dt, Math.min(25 * dt, target.lat - s.lat));
      const p = this.track.at(s.idx, s.lat);
      s.mesh.position.set(p.x, 0.4, p.z); s.mesh.rotation.y += dt * 14;
      fx.puff(p.x, 0.5, p.z, 0.8, 0.9);
      let done = s.life <= 0;
      for (const k of karts) {
        if (k === s.owner && s.t < 0.6) continue;
        if (k.y > 1) continue;
        const dx = k.pos.x - p.x, dz = k.pos.z - p.z;
        if (dx * dx + dz * dz < 6.5) { if (k.star > 0 || k.hit('shell')) { if (k.isPlayer) this.sound.hit(); } done = true; break; }
      }
      if (done) { fx.explode(s.mesh.position, 0); this.scene.remove(s.mesh); this.shells.splice(i, 1); }
    }
  }
}
