import * as THREE from 'three';

// Particules carrées façon sprites N64 : un seul Points, couleur + alpha + taille par particule.
class Particles {
  constructor(scene, count, additive = false, alpha = 1) {
    this.n = count; this.alpha = alpha; this.i = 0;
    this.pos = new Float32Array(count * 3); this.col = new Float32Array(count * 4); this.size = new Float32Array(count);
    this.vel = new Float32Array(count * 3); this.life = new Float32Array(count); this.max = new Float32Array(count);
    this.grav = new Float32Array(count); this.grow = new Float32Array(count); this.s0 = new Float32Array(count);
    this.base = new Float32Array(count * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 4));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { scale: { value: 300 } },
      vertexShader: `attribute vec4 color; attribute float size; uniform float scale; varying vec4 vC;
        void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*scale/-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec4 vC; void main(){ if(vC.a<0.02) discard; gl_FragColor=vC; }`,
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false;
    scene.add(this.pts);
  }
  emit(x, y, z, vx, vy, vz, life, r, g, b, size, grav = 0, grow = 0) {
    const i = this.i++ % this.n, p = i * 3;
    this.pos[p] = x; this.pos[p + 1] = y; this.pos[p + 2] = z;
    this.vel[p] = vx; this.vel[p + 1] = vy; this.vel[p + 2] = vz;
    this.life[i] = this.max[i] = life; this.grav[i] = grav; this.grow[i] = grow; this.s0[i] = size;
    this.base[p] = r; this.base[p + 1] = g; this.base[p + 2] = b;
    this.size[i] = size; this.col.set([r, g, b, 1], i * 4);
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.col[i * 4 + 3] = 0; continue; }
      this.life[i] -= dt;
      const p = i * 3, t = Math.max(0, this.life[i] / this.max[i]);
      this.vel[p + 1] -= this.grav[i] * dt;
      this.pos[p] += this.vel[p] * dt; this.pos[p + 1] += this.vel[p + 1] * dt; this.pos[p + 2] += this.vel[p + 2] * dt;
      if (this.pos[p + 1] < 0.1 && this.grav[i]) { this.pos[p + 1] = 0.1; this.vel[p + 1] *= -0.3; }
      this.size[i] = this.s0[i] + this.grow[i] * (1 - t);
      this.col[i * 4 + 3] = t * this.alpha;
    }
    this.geo.attributes.position.needsUpdate = this.geo.attributes.color.needsUpdate = this.geo.attributes.size.needsUpdate = true;
  }
}

class FX {
  init(scene) {
    this.scene = scene;
    this.sparks = new Particles(scene, 500, true);
    this.smoke = new Particles(scene, 500, false, 0.55);
    this.waves = [];
    // traces de dérapage (buffer circulaire d'instances)
    this.skidN = 500; this.skidI = 0;
    const g = new THREE.PlaneGeometry(0.45, 1.3).rotateX(-Math.PI / 2);
    this.skid = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -2 }), this.skidN);
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.skidN; i++) this.skid.setMatrixAt(i, hide);
    this.skid.frustumCulled = false; scene.add(this.skid);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler();
  }
  setScale(s) { this.sparks.mat.uniforms.scale.value = s; this.smoke.mat.uniforms.scale.value = s; }
  skidMark(x, z, h) {
    this._e.set(0, h, 0); this._q.setFromEuler(this._e);
    this._m.compose(new THREE.Vector3(x, 0.06, z), this._q, new THREE.Vector3(1, 1, 1));
    this.skid.setMatrixAt(this.skidI++ % this.skidN, this._m); this.skid.instanceMatrix.needsUpdate = true;
  }
  clearSkids() { const hide = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < this.skidN; i++) this.skid.setMatrixAt(i, hide); this.skid.instanceMatrix.needsUpdate = true; }
  spark(x, y, z, color, vx = 0, vz = 0) {
    const c = new THREE.Color(color);
    this.sparks.emit(x, y, z, vx + (Math.random() - 0.5) * 9, 3 + Math.random() * 6, vz + (Math.random() - 0.5) * 9, 0.35 + Math.random() * 0.3, c.r, c.g, c.b, 0.5 + Math.random() * 0.4, 28);
  }
  puff(x, y, z, size = 1.8, shade = 0.85, vx = 0, vz = 0) {
    this.smoke.emit(x, y, z, vx + (Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, vz + (Math.random() - 0.5) * 2, 0.6 + Math.random() * 0.4, shade, shade, shade, size * 0.45, 0, 1.4);
  }
  boostFlame(x, y, z, bx, bz) {
    const c = Math.random() < 0.5 ? [1, 0.55, 0.1] : [1, 0.9, 0.2];
    this.sparks.emit(x, y, z, bx * 12 + (Math.random() - 0.5) * 3, (Math.random() - 0.3) * 2, bz * 12 + (Math.random() - 0.5) * 3, 0.25, c[0], c[1], c[2], 0.9, 0, -0.6);
  }
  explode(pos, radius = 9) {
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * 6.28, s = 6 + Math.random() * 16, up = 4 + Math.random() * 14;
      const hot = Math.random();
      this.sparks.emit(pos.x, 1.5, pos.z, Math.cos(a) * s, up, Math.sin(a) * s, 0.5 + Math.random() * 0.6, 1, 0.3 + hot * 0.6, 0.05, 1 + Math.random() * 1.2, 26);
    }
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * 6.28, s = 2 + Math.random() * 7;
      this.smoke.emit(pos.x, 1.5, pos.z, Math.cos(a) * s, 2 + Math.random() * 5, Math.sin(a) * s, 1.2 + Math.random(), 0.2, 0.2, 0.2, 3, 0, 8);
    }
    if (!radius) return;
    const w = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0.85 }));
    w.position.set(pos.x, 1.5, pos.z); this.scene.add(w); this.waves.push({ mesh: w, t: 0, r: radius });
  }
  confetti(pos) {
    for (let i = 0; i < 50; i++) {
      const c = new THREE.Color().setHSL(Math.random(), 1, 0.55);
      this.sparks.emit(pos.x, 2, pos.z, (Math.random() - 0.5) * 14, 8 + Math.random() * 10, (Math.random() - 0.5) * 14, 1.2 + Math.random(), c.r, c.g, c.b, 0.8, 18);
    }
  }
  update(dt) {
    this.sparks.update(dt); this.smoke.update(dt);
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i]; w.t += dt / 0.4;
      w.mesh.scale.setScalar(1 + w.r * Math.min(1, w.t)); w.mesh.material.opacity = Math.max(0, 0.85 * (1 - w.t));
      if (w.t >= 1) { this.scene.remove(w.mesh); this.waves.splice(i, 1); }
    }
  }
}
export const fx = new FX();
