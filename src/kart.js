import * as THREE from 'three';
import { WALL_OFFSET } from './track.js';

const BASE_MAX = 48;
const box = (w, h, d, color) =>
  new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));

export function makeKartModel(color, helmet) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const chassis = box(2.4, 0.7, 3.6, color); chassis.position.y = 0.8; body.add(chassis);
  const nose = box(1.5, 0.5, 1.6, color); nose.position.set(0, 0.7, 2.4); body.add(nose);
  const fwing = box(3.2, 0.2, 0.7, 0x222222); fwing.position.set(0, 0.5, 3.3); body.add(fwing);
  const rwing = box(3, 0.2, 0.8, 0x222222); rwing.position.set(0, 2.1, -1.9); body.add(rwing);
  for (const s of [-1, 1]) { const p = box(0.2, 0.9, 0.6, 0x222222); p.position.set(s * 1.3, 1.6, -1.9); body.add(p); }
  const seat = box(1.4, 1.1, 0.4, 0x333333); seat.position.set(0, 1.6, -0.9); body.add(seat);
  const torso = box(1.1, 1.0, 0.8, 0xf2f2f2); torso.position.set(0, 1.75, -0.3); body.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 7, 5), new THREE.MeshLambertMaterial({ color: helmet }));
  head.position.set(0, 2.75, -0.3); body.add(head);
  const visor = box(0.9, 0.3, 0.3, 0x111111); visor.position.set(0, 2.72, 0.2); body.add(visor);
  const wheels = [];
  for (const [x, z] of [[-1.4, 1.9], [1.4, 1.9], [-1.5, -1.5], [1.5, -1.5]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.7, 8), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.65, z);
    body.add(w); wheels.push(w);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3, 6), new THREE.MeshBasicMaterial({ color: 0xffa500 }));
  flame.rotation.x = -Math.PI / 2; flame.position.set(0, 1, -3.6); flame.visible = false; body.add(flame);
  const sparks = [-1, 1].map(s => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    m.position.set(s * 1.5, 0.4, -2.2); m.visible = false; body.add(m); return m;
  });
  g.userData = { body, wheels, flame, sparks };
  return g;
}

export class Kart {
  constructor(track, { name, color, helmet, isPlayer = false, skill = 1 }) {
    this.track = track; this.name = name; this.color = color; this.isPlayer = isPlayer; this.skill = skill;
    this.mesh = makeKartModel(color, helmet);
    this.pos = new THREE.Vector3();
    this.v = new THREE.Vector3();
    this.reset(0, 0, 0);
  }

  reset(x, z, h, idx = 0) {
    this.pos.set(x, 0, z); this.v.set(0, 0, 0);
    this.h = h; this.visH = 0; this.roll = 0;
    this.idx = idx; this.lat = 0; this.lap = 0; this.progress = 0; this.lastIdx = idx;
    this.drifting = 0; this.driftT = 0; this.driftHop = 0;
    this.boost = 0; this.spin = 0; this.invuln = 0; this.offroad = false;
    this.item = null; this.roulette = 0; this.finished = false; this.finishTime = 0;
    this.speed = 0; this.wheelSpin = 0; this.aiLat = 0;
    this.place = 1; this.bumpT = 0;
  }

  get fwd() { return new THREE.Vector3(Math.sin(this.h), 0, Math.cos(this.h)); }

  hit() {
    if (this.spin > 0 || this.invuln > 0) return false;
    this.spin = 1.3; this.drifting = 0; this.boost = 0; this.driftT = 0;
    this.v.multiplyScalar(0.3);
    return true;
  }

  giveBoost(t) { this.boost = Math.max(this.boost, t); }

  update(dt, input, maxScale = 1) {
    const T = this.track;
    let sx = Math.sin(this.h), cz = Math.cos(this.h);
    const sx0 = sx, cz0 = cz;
    let vf = this.v.x * sx + this.v.z * cz;
    const vl0 = this.v.x * -cz + this.v.z * sx;
    this.invuln = Math.max(0, this.invuln - dt);

    if (this.spin > 0) {
      this.spin -= dt; input = { throttle: 0, brake: 0, steer: 0, drift: false };
      this.invuln = Math.max(this.invuln, 0.6);
    }

    const off = Math.abs(this.lat) > 13.2 + 2.5;
    this.offroad = off;
    let maxSp = BASE_MAX * maxScale * (off ? 0.5 : 1);
    if (this.boost > 0) { maxSp = 76; this.boost -= dt; }

    // drift
    if (this.drifting === 0 && input.drift && Math.abs(input.steer) > 0.3 && vf > 20 && this.spin <= 0) {
      this.drifting = Math.sign(input.steer); this.driftT = 0; this.driftHop = 0.28;
    }
    if (this.drifting !== 0) {
      this.driftT += dt;
      if (!input.drift || vf < 14 || this.spin > 0) {
        if (this.driftT > 1.7) this.giveBoost(1.3);
        else if (this.driftT > 0.8) this.giveBoost(0.65);
        this.endDriftBoostLevel = this.driftT;
        this.drifting = 0; this.driftT = 0;
      }
    }
    this.driftHop = Math.max(0, this.driftHop - dt);

    // accélération
    if (input.throttle > 0) {
      if (vf < maxSp) vf = Math.min(maxSp, vf + (this.boost > 0 ? 70 : 26) * input.throttle * dt);
      else vf = Math.max(maxSp, vf - 25 * dt);
    } else vf *= Math.exp(-0.7 * dt);
    if (input.brake > 0) vf = Math.max(-14, vf - (vf > 0 ? 65 : 25) * input.brake * dt);
    if (off && vf > maxSp) vf = Math.max(maxSp, vf - 40 * dt);

    this.v.set(sx0 * vf - cz0 * vl0, 0, cz0 * vf + sx0 * vl0);

    // direction (le cap tourne, la vitesse suit avec plus ou moins de grip)
    let steer = input.steer, rate = 2.0 * (1 - 0.35 * Math.min(1, Math.abs(vf) / 60));
    if (this.drifting) { steer = this.drifting * (0.75 + 0.5 * input.steer * this.drifting); rate = 2.3; }
    const turn = steer * rate * Math.min(1, Math.abs(vf) / 14) * Math.sign(vf || 1);
    this.h -= turn * dt;
    if (this.spin > 0) this.h += 11 * dt;
    if (this.spin > 0) {
      this.v.multiplyScalar(Math.exp(-2 * dt)); this.speed = 0;
    } else {
      sx = Math.sin(this.h); cz = Math.cos(this.h);
      const rx = -cz, rz = sx;
      // ré-exprime la vitesse dans le nouveau repère : vl est amortie (grip)
      let vl = this.v.x * rx + this.v.z * rz;
      vl *= Math.exp(-(this.drifting ? 1.4 : 8) * dt);
      vf = this.v.x * sx + this.v.z * cz;
      this.v.set(sx * vf + rx * vl, 0, cz * vf + rz * vl);
      this.speed = vf;
    }

    this.pos.addScaledVector(this.v, dt);

    // suivi de piste + mur
    const loc = T.locate(this.pos.x, this.pos.z, this.idx);
    this.idx = loc.idx; this.lat = loc.lat;
    const lim = WALL_OFFSET - 1.6;
    if (Math.abs(this.lat) > lim) {
      const s = Math.sign(this.lat), over = Math.abs(this.lat) - lim;
      const r = T.right[this.idx];
      this.pos.x -= r.x * s * over; this.pos.z -= r.z * s * over;
      // glisse le long du mur : supprime la composante qui pousse vers le mur
      const vn = (this.v.x * r.x + this.v.z * r.z) * s;
      if (vn > 0) { this.v.x -= r.x * s * vn * 1.4; this.v.z -= r.z * s * vn * 1.4; }
      this.v.multiplyScalar(1 - Math.min(0.5, 1.2 * dt));
      this.bumpT = 0.2;
      this.lat = s * lim;
    }
    this.bumpT = Math.max(0, this.bumpT - dt);

    // tours
    const N = T.N;
    if (this.lastIdx > N * 0.8 && this.idx < N * 0.2) this.lap++;
    else if (this.lastIdx < N * 0.2 && this.idx > N * 0.8) this.lap--;
    this.lastIdx = this.idx;
    this.progress = (this.lap - 1) * N + this.idx;

    this.syncMesh(dt, input);
  }

  syncMesh(dt, input) {
    const m = this.mesh, u = m.userData;
    m.position.copy(this.pos);
    const targetVis = this.drifting ? -this.drifting * 0.4 : 0;
    this.visH += (targetVis - this.visH) * Math.min(1, 10 * dt);
    m.rotation.y = this.h + this.visH;
    const tRoll = this.drifting ? this.drifting * 0.12 : -input.steer * 0.06 * Math.min(1, Math.abs(this.speed) / 30);
    this.roll += (tRoll - this.roll) * Math.min(1, 8 * dt);
    u.body.rotation.z = this.roll;
    u.body.position.y = (this.driftHop > 0 ? Math.sin(this.driftHop / 0.28 * Math.PI) * 0.8 : 0) + (this.offroad ? (Math.random() - 0.5) * 0.15 : 0);
    if (this.spin > 0) u.body.rotation.y = 0;
    this.wheelSpin += this.speed * dt * 1.4;
    for (const w of u.wheels) w.rotation.x = this.wheelSpin;
    u.flame.visible = this.boost > 0;
    if (u.flame.visible) u.flame.scale.setScalar(0.7 + Math.random() * 0.6);
    const col = this.driftT > 1.7 ? 0xff8a00 : this.driftT > 0.8 ? 0x33aaff : 0xffffff;
    for (const s of u.sparks) {
      s.visible = this.drifting !== 0 && this.driftT > 0.25;
      if (s.visible) { s.material.color.setHex(col); s.scale.setScalar(0.5 + Math.random()); s.position.y = 0.3 + Math.random() * 0.5; }
    }
    m.visible = !(this.invuln > 0 && this.spin <= 0 && Math.floor(this.invuln * 20) % 2);
  }
}
