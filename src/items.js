import * as THREE from 'three';

const ICON = { mushroom: '🍄', banana: '🍌', shell: '🐢' };
export { ICON };

export class Items {
  constructor(scene, track, sound) {
    this.scene = scene; this.track = track; this.sound = sound;
    this.boxes = []; this.pads = []; this.bananas = []; this.shells = [];

    // cases à objets : rangées de 3 en travers de la piste
    const qTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 32;
      const x = c.getContext('2d');
      x.fillStyle = '#2ad4ff'; x.fillRect(0, 0, 32, 32);
      x.strokeStyle = '#fff'; x.lineWidth = 3; x.strokeRect(1, 1, 30, 30);
      x.fillStyle = '#fff'; x.font = 'bold 26px Arial'; x.textAlign = 'center'; x.fillText('?', 16, 26);
      const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const boxGeo = new THREE.BoxGeometry(2.6, 2.6, 2.6);
    const boxMat = new THREE.MeshBasicMaterial({ map: qTex });
    this.boxRows = [0.08, 0.30, 0.52, 0.75].map(f => Math.floor(track.N * f));
    for (const row of this.boxRows) for (const lat of [-7, 0, 7]) {
      const m = new THREE.Mesh(boxGeo, boxMat);
      const p = track.at(row, lat); m.position.set(p.x, 2, p.z);
      scene.add(m);
      this.boxes.push({ mesh: m, idx: row, lat, cool: 0 });
    }

    // plaques turbo
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
      m.rotation.y = track.heading(idx) + Math.PI; // texture "vers l'avant" = +z local après rotation
      scene.add(m);
      this.pads.push({ idx, lat });
    }

    this.bananaGeo = new THREE.SphereGeometry(1, 6, 4);
    this.bananaMat = new THREE.MeshLambertMaterial({ color: 0xffdd22 });
    this.shellGeo = new THREE.SphereGeometry(1.1, 8, 6);
    this.shellMat = new THREE.MeshLambertMaterial({ color: 0x22cc44 });
  }

  reset() {
    for (const b of this.bananas) this.scene.remove(b.mesh);
    for (const s of this.shells) this.scene.remove(s.mesh);
    this.bananas = []; this.shells = [];
    for (const b of this.boxes) { b.cool = 0; b.mesh.visible = true; }
  }

  give(kart) {
    if (kart.item || kart.roulette > 0) return;
    kart.roulette = 1.0;
  }

  use(kart, karts) {
    const it = kart.item; if (!it) return;
    kart.item = null;
    if (it === 'mushroom') { kart.giveBoost(1.2); if (kart.isPlayer) this.sound.boost(); }
    else if (it === 'banana') {
      const m = new THREE.Mesh(this.bananaGeo, this.bananaMat);
      m.scale.set(0.9, 0.9, 1.5);
      const f = kart.fwd; m.position.copy(kart.pos).addScaledVector(f, -3.5); m.position.y = 0.9;
      this.scene.add(m); this.bananas.push({ mesh: m });
    } else if (it === 'shell') {
      const m = new THREE.Mesh(this.shellGeo, this.shellMat);
      this.scene.add(m);
      this.shells.push({ mesh: m, idx: kart.idx + 3, lat: kart.lat, owner: kart, life: 9, t: 0 });
    }
  }

  update(dt, karts, time) {
    const N = this.track.N;
    // cases
    for (const b of this.boxes) {
      b.mesh.rotation.y += dt * 2; b.mesh.rotation.x += dt * 1.2;
      b.mesh.position.y = 2 + Math.sin(time * 3 + b.idx) * 0.3;
      if (b.cool > 0) { b.cool -= dt; b.mesh.visible = b.cool <= 0; }
      else for (const k of karts) {
        const dx = k.pos.x - b.mesh.position.x, dz = k.pos.z - b.mesh.position.z;
        if (dx * dx + dz * dz < 9) {
          b.cool = 3; b.mesh.visible = false;
          if (!k.item && k.roulette <= 0) { this.give(k); if (k.isPlayer) this.sound.pickup(); }
        }
      }
    }
    // plaques turbo
    for (const k of karts) for (const p of this.pads) {
      let d = k.idx - p.idx; if (d > N / 2) d -= N; if (d < -N / 2) d += N;
      if (Math.abs(d) < 3 && Math.abs(k.lat - p.lat) < 4.2 && k.boost < 0.8) { k.giveBoost(1.0); if (k.isPlayer) this.sound.boost(); }
    }
    // roulette
    for (const k of karts) if (k.roulette > 0) {
      k.roulette -= dt;
      if (k.roulette <= 0) {
        const behind = k.place > 3;
        const pool = behind ? ['mushroom', 'mushroom', 'shell', 'banana'] : ['banana', 'banana', 'mushroom', 'shell'];
        k.item = pool[Math.random() * pool.length | 0];
        if (k.isPlayer) this.sound.item();
      }
    }
    // bananes
    for (let i = this.bananas.length - 1; i >= 0; i--) {
      const b = this.bananas[i];
      for (const k of karts) {
        const dx = k.pos.x - b.mesh.position.x, dz = k.pos.z - b.mesh.position.z;
        if (dx * dx + dz * dz < 5 && k.hit()) {
          if (k.isPlayer) this.sound.hit();
          this.scene.remove(b.mesh); this.bananas.splice(i, 1); break;
        }
      }
    }
    // carapaces (suivent la piste, visent le kart devant elles)
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
      s.mesh.position.set(p.x, 1.1, p.z); s.mesh.rotation.y += dt * 12;
      let done = s.life <= 0;
      for (const k of karts) {
        if (k === s.owner && s.t < 0.6) continue;
        const dx = k.pos.x - p.x, dz = k.pos.z - p.z;
        if (dx * dx + dz * dz < 6) { if (k.hit() && k.isPlayer) this.sound.hit(); done = true; break; }
      }
      if (done) { this.scene.remove(s.mesh); this.shells.splice(i, 1); }
    }
  }
}
