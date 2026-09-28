import * as THREE from 'three';
import { WALL_OFFSET } from './track.js';
import { buildCharacter } from './characters.js';
import { itemModel } from './models.js';
import { fx } from './fx.js';
import { emit } from './events.js';

const BASE_MAX = 48;
const GRAVITY = 34;
const box = (w, h, d, color) =>
  new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));

const shadowGeo = new THREE.CircleGeometry(2.3, 12).rotateX(-Math.PI / 2);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, polygonOffset: true, polygonOffsetFactor: -2 });

export function makeKartModel(char) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const chassis = box(2.4, 0.7, 3.6, char.color); chassis.position.y = 0.8; body.add(chassis);
  const nose = box(1.5, 0.5, 1.6, char.color); nose.position.set(0, 0.7, 2.4); body.add(nose);
  const fwing = box(3.2, 0.2, 0.7, 0x222222); fwing.position.set(0, 0.5, 3.3); body.add(fwing);
  const rwing = box(3, 0.2, 0.8, 0x222222); rwing.position.set(0, 2.1, -1.9); body.add(rwing);
  for (const s of [-1, 1]) { const p = box(0.2, 0.9, 0.6, 0x222222); p.position.set(s * 1.3, 1.6, -1.9); body.add(p); }
  const seat = box(1.6, 0.9, 0.5, 0x333333); seat.position.set(0, 1.4, -1.0); body.add(seat);
  // volant
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.09, 5, 8), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  wheel.position.set(0, 1.95, 1.05); wheel.rotation.x = -0.9; body.add(wheel);
  // pot d'échappement
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.9, 6), new THREE.MeshLambertMaterial({ color: 0x999999 })); p.rotation.x = Math.PI / 2; p.position.set(s * 0.7, 0.95, -2.0); body.add(p); }
  const chr = buildCharacter(char.id); chr.position.set(0, 1.55, -0.55); body.add(chr);
  const wheels = [];
  for (const [x, z] of [[-1.4, 1.9], [1.4, 1.9], [-1.5, -1.5], [1.5, -1.5]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.7, 8), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.65, z);
    body.add(w); wheels.push(w);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3, 6), new THREE.MeshBasicMaterial({ color: 0xffa500 }));
  flame.rotation.x = -Math.PI / 2; flame.position.set(0, 1, -3.6); flame.visible = false; body.add(flame);
  const held = new THREE.Group(); held.position.set(0, 0.5, -3.4); g.add(held);
  const shadow = new THREE.Mesh(shadowGeo, shadowMat); shadow.position.y = 0.07;
  g.userData = { body, wheels, flame, chassis, nose, chr, held, shadow, chassisColor: new THREE.Color(char.color) };
  return g;
}

export class Kart {
  constructor(track, char, { isPlayer = false, skill = 1 } = {}) {
    this.track = track; this.char = char; this.name = char.name; this.color = char.color;
    this.isPlayer = isPlayer; this.skill = skill; this.stats = char.stats;
    this.mesh = makeKartModel(char);
    this.pos = new THREE.Vector3();
    this.v = new THREE.Vector3();
    this.reset(0, 0, 0);
  }

  reset(x, z, h, idx = 0) {
    this.pos.set(x, 0, z); this.v.set(0, 0, 0);
    this.h = h; this.visH = 0; this.roll = 0; this.y = 0; this.vy = 0; this.air = false; this.trick = false;
    this.idx = idx; this.lat = 0; this.lap = 0; this.progress = 0; this.lastIdx = idx;
    this.drifting = 0; this.driftT = 0; this.driftHop = 0; this.driftLevel = 0; this.prevDrift = false;
    this.boost = 0; this.spin = 0; this.invuln = 0; this.star = 0; this.offroad = false;
    this.item = null; this.roulette = 0; this.finished = false; this.finishTime = 0; this._held = null;
    this.speed = 0; this.wheelSpin = 0; this.aiLat = 0; this.spinAng = 0;
    this.place = 1; this.bumpT = 0; this.aiUse = 0; this.slip = 0; this.mesh.userData.held.clear();
    this.mesh.userData.chr.rotation.y = 0;
  }

  get fwd() { return new THREE.Vector3(Math.sin(this.h), 0, Math.cos(this.h)); }

  hit(kind = 'hit', force = 1) {
    if (this.spin > 0 || this.invuln > 0 || this.star > 0) return false;
    this.spin = 1.3; this.drifting = 0; this.boost = 0; this.driftT = 0; this.spinAng = 0;
    this.vy = Math.max(this.vy, 7); this.v.multiplyScalar(0.3 / force);
    fx.explode(this.pos, 0); emit('hit', this, kind);
    return true;
  }

  giveBoost(t) { this.boost = Math.max(this.boost, t); }
  jump(vy) { if (!this.air) { this.vy = vy; this.air = true; this.trick = false; } }

  update(dt, input, maxScale = 1) {
    const T = this.track, st = this.stats;
    let sx = Math.sin(this.h), cz = Math.cos(this.h);
    const sx0 = sx, cz0 = cz;
    let vf = this.v.x * sx + this.v.z * cz;
    const vl0 = this.v.x * -cz + this.v.z * sx;
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.star > 0) this.star -= dt;

    if (this.spin > 0) {
      this.spin -= dt; input = { throttle: 0, brake: 0, steer: 0, drift: false };
      this.invuln = Math.max(this.invuln, 0.6);
    }

    // vertical (sauts, rampes, petit hop du dérapage)
    if (this.air || this.vy > 0) {
      this.vy -= GRAVITY * dt; this.y += this.vy * dt;
      if (input.drift && this.y > 1.5) this.trick = true;
      if (this.y <= 0) {
        this.y = 0; this.vy = 0; this.air = false;
        fx.puff(this.pos.x, 0.3, this.pos.z, 2.6);
        if (this.trick) { this.trick = false; this.giveBoost(0.9); emit('trick', this); }
      }
    }
    const grounded = this.y <= 0.05;

    const off = Math.abs(this.lat) > 13.2 + 2.5 && grounded;
    this.offroad = off;
    let maxSp = BASE_MAX * maxScale * st.speed * (off ? 0.5 : 1);
    if (this.star > 0) maxSp = Math.max(maxSp, 60 * maxScale);
    if (this.boost > 0) { maxSp = Math.max(maxSp, 76 * st.speed * (off ? 0.8 : 1)); this.boost -= dt; }

    // ---- dérapage ----
    if (this.drifting === 0 && input.drift && !this.prevDrift && grounded && vf > 20 && this.spin <= 0 && Math.abs(input.steer) > 0.25) {
      this.drifting = Math.sign(input.steer); this.driftT = 0; this.driftLevel = 0;
      this.vy = 6; this.air = true; this.driftHop = 0.3; emit('driftstart', this);
    } else if (this.drifting === 0 && input.drift && grounded && vf > 20 && this.spin <= 0 && Math.abs(input.steer) > 0.55) {
      // touche déjà maintenue : on rentre en dérapage dès qu'on braque franchement
      this.drifting = Math.sign(input.steer); this.driftT = 0; this.driftLevel = 0; this.vy = 4.5; this.air = true; this.driftHop = 0.3;
    }
    this.prevDrift = input.drift;
    if (this.drifting !== 0) {
      // braquer vers l'intérieur charge plus vite
      this.driftT += dt * st.charge * (1 + 0.35 * input.steer * this.drifting);
      const lv = this.driftT > 2.1 ? 3 : this.driftT > 1.3 ? 2 : this.driftT > 0.7 ? 1 : 0;
      if (lv > this.driftLevel) { this.driftLevel = lv; emit('driftlevel', this, lv); }
      if (!input.drift || vf < 14 || this.spin > 0) {
        if (this.driftLevel > 0) { this.giveBoost([0, 0.6, 1.1, 1.7][this.driftLevel]); emit('turbo', this, this.driftLevel); }
        this.drifting = 0; this.driftT = 0; this.driftLevel = 0;
      }
    }
    this.driftHop = Math.max(0, this.driftHop - dt);

    // ---- accélération ----
    const acc = (this.boost > 0 ? 70 : 26) * st.accel;
    if (input.throttle > 0) {
      if (vf < maxSp) vf = Math.min(maxSp, vf + acc * input.throttle * dt);
      else vf = Math.max(maxSp, vf - 25 * dt);
    } else vf *= Math.exp(-0.7 * dt);
    if (input.brake > 0) vf = Math.max(-14, vf - (vf > 0 ? 65 : 25) * input.brake * dt);
    if (off && vf > maxSp) vf = Math.max(maxSp, vf - 40 * dt);
    this.v.set(sx0 * vf - cz0 * vl0, 0, cz0 * vf + sx0 * vl0);

    // ---- direction ----
    let steer = input.steer, rate = 2.0 * st.turn * (1 - 0.35 * Math.min(1, Math.abs(vf) / 60));
    if (this.air && this.drifting === 0) rate *= 0.35;
    if (this.drifting) { steer = this.drifting * (0.85 + 0.65 * input.steer * this.drifting); rate = 2.15 * st.turn; }
    const turn = steer * rate * Math.min(1, Math.abs(vf) / 14) * Math.sign(vf || 1);
    this.h -= turn * dt;
    if (this.spin > 0) { this.h += 11 * dt; this.spinAng += 11 * dt; }

    if (this.spin > 0) {
      this.v.multiplyScalar(Math.exp(-2 * dt)); this.speed = 0;
    } else {
      sx = Math.sin(this.h); cz = Math.cos(this.h);
      const rx = -cz, rz = sx;
      let vl = this.v.x * rx + this.v.z * rz;
      vf = this.v.x * sx + this.v.z * cz;
      if (this.drifting) {
        // dérapage contrôlé : la vitesse pointe ~20° à l'extérieur du cap, le kart "glisse" en arc de cercle
        const target = -this.drifting * vf * 0.36;
        vl += (target - vl) * (1 - Math.exp(-7 * dt));
        vf *= Math.exp(-0.08 * dt);
      } else vl *= Math.exp(-(this.air ? 0.6 : 8) * dt);
      this.v.set(sx * vf + rx * vl, 0, cz * vf + rz * vl);
      this.speed = vf; this.slip = vl;
    }

    this.pos.addScaledVector(this.v, dt);

    // ---- suivi de piste + mur ----
    const loc = T.locate(this.pos.x, this.pos.z, this.idx);
    this.idx = loc.idx; this.lat = loc.lat;
    const lim = WALL_OFFSET - 1.6;
    if (Math.abs(this.lat) > lim) {
      const s = Math.sign(this.lat), over = Math.abs(this.lat) - lim;
      const r = T.right[this.idx];
      this.pos.x -= r.x * s * over; this.pos.z -= r.z * s * over;
      const vn = (this.v.x * r.x + this.v.z * r.z) * s;
      if (vn > 0) { this.v.x -= r.x * s * vn * 1.4; this.v.z -= r.z * s * vn * 1.4; }
      this.v.multiplyScalar(1 - Math.min(0.5, 1.2 * dt));
      if (this.bumpT <= 0 && vn > 6) { emit('wall', this, vn); for (let i = 0; i < 6; i++) fx.spark(this.pos.x + r.x * s * 1.5, 1, this.pos.z + r.z * s * 1.5, 0xffe070); }
      this.bumpT = 0.2;
      this.lat = s * lim;
    }
    this.bumpT = Math.max(0, this.bumpT - dt);

    // ---- tours ----
    const N = T.N;
    if (this.lastIdx > N * 0.8 && this.idx < N * 0.2) this.lap++;
    else if (this.lastIdx < N * 0.2 && this.idx > N * 0.8) this.lap--;
    this.lastIdx = this.idx;
    this.progress = (this.lap - 1) * N + this.idx;

    this.emitFx(dt, input, sx, cz);
    this.syncMesh(dt, input);
  }

  emitFx(dt, input, sx, cz) {
    const rx = -cz, rz = sx, p = this.pos;
    const rear = s => [p.x - sx * 2.0 + rx * s * 1.5, p.z - cz * 2.0 + rz * s * 1.5];
    if (this.drifting && this.y < 0.6) {
      const lv = this.driftLevel, col = lv >= 3 ? 0xd050ff : lv === 2 ? 0xff8a00 : lv === 1 ? 0x33aaff : 0xffffff;
      for (const s of [-1, 1]) {
        const [x, z] = rear(s);
        if (Math.random() < 0.9) fx.spark(x, 0.4, z, this.driftT > 0.3 ? col : 0xdddddd, -sx * 4, -cz * 4);
        if (Math.random() < 0.5) fx.puff(x, 0.5, z, 1.6, 0.8, -sx * 3, -cz * 3);
        fx.skidMark(x, z, this.h + this.visH);
      }
    } else if (Math.abs(this.slip) > 6 && this.y < 0.2) {
      const [x, z] = rear(Math.random() < 0.5 ? -1 : 1); fx.puff(x, 0.4, z, 1.2, 0.85); fx.skidMark(x, z, this.h);
    }
    if (this.offroad && this.speed > 15 && Math.random() < 0.6) { const [x, z] = rear(Math.random() < 0.5 ? -1 : 1); fx.puff(x, 0.4, z, 1.4, 0.4); }
    if (this.boost > 0) for (const s of [-0.7, 0.7]) fx.boostFlame(p.x - sx * 2.6 + rx * s, 1.0, p.z - cz * 2.6 + rz * s, -sx, -cz);
    if (this.star > 0 && Math.random() < 0.8) fx.spark(p.x + (Math.random() - 0.5) * 3, 1 + Math.random() * 2, p.z + (Math.random() - 0.5) * 3, new THREE.Color().setHSL(Math.random(), 1, 0.6).getHex());
    if (this.spin > 0 && Math.random() < 0.5) fx.spark(p.x, 2.5, p.z, 0xffff40);
  }

  syncMesh(dt, input) {
    const m = this.mesh, u = m.userData;
    m.position.set(this.pos.x, this.y, this.pos.z);
    u.shadow.position.set(this.pos.x, 0.07, this.pos.z); u.shadow.rotation.y = this.h;
    const sh = Math.max(0.5, 1 - this.y * 0.1); u.shadow.scale.setScalar(sh);
    const targetVis = this.drifting ? -this.drifting * 0.42 : 0;
    this.visH += (targetVis - this.visH) * Math.min(1, 12 * dt);
    m.rotation.y = this.h + this.visH;
    // roulis : penche vers l'intérieur du virage, plus fort en dérapage
    const tRoll = this.drifting ? this.drifting * 0.2 : -input.steer * 0.07 * Math.min(1, Math.abs(this.speed) / 30);
    this.roll += (tRoll - this.roll) * Math.min(1, 9 * dt);
    u.body.rotation.z = this.roll;
    u.body.rotation.x = this.air ? Math.max(-0.4, Math.min(0.4, -this.vy * 0.02)) : (this.boost > 0 ? 0.05 : 0);
    u.body.position.y = (this.offroad ? (Math.random() - 0.5) * 0.2 : 0);
    // pilote qui regarde/penche dans le virage + tourne lors d'un spin ou d'un trick
    const lean = this.drifting ? this.drifting * -0.35 : input.steer * -0.25;
    u.chr.rotation.y += ((this.spin > 0 ? this.spinAng * 2 : lean) - u.chr.rotation.y) * Math.min(1, (this.spin > 0 ? 1 : 10) * dt);
    this.trickAng = this.trick && this.air ? (this.trickAng || 0) + dt * 18 : 0;
    u.chr.rotation.z = this.trickAng;
    if (u.chr.userData.update) u.chr.userData.update(performance.now() / 1000, this);
    this.wheelSpin += this.speed * dt * 1.4;
    for (const w of u.wheels) w.rotation.x = this.wheelSpin;
    u.flame.visible = this.boost > 0;
    if (u.flame.visible) u.flame.scale.setScalar(0.7 + Math.random() * 0.6);
    // étoile : caisse arc-en-ciel
    if (this.star > 0) {
      const c = new THREE.Color().setHSL((performance.now() / 300) % 1, 1, 0.55);
      u.chassis.material.color.copy(c); u.nose.material.color.copy(c);
    } else if (u.chassis.material.color.getHex() !== this.color) { u.chassis.material.color.setHex(this.color); u.nose.material.color.setHex(this.color); }
    // objet transporté derrière le kart
    if (this._held !== this.item) {
      u.held.clear(); this._held = this.item;
      if (this.item) { const h = itemModel(this.item); h.scale.setScalar(this.item === 'mushroom' ? 0.75 : 0.85); u.held.add(h); }
    }
    u.held.rotation.y += dt * 2.5; u.held.position.y = 0.6 + Math.sin(performance.now() / 200) * 0.15;
    m.visible = !(this.invuln > 0 && this.spin <= 0 && this.star <= 0 && Math.floor(this.invuln * 20) % 2);
  }
}
