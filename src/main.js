import * as THREE from 'three';
import { Track, TRACK_W } from './track.js';
import { Kart } from './kart.js';
import { Items, ICON } from './items.js';
import { Sound } from './audio.js';

const LAPS = 3;
const AUTO = new URLSearchParams(location.search).has('auto'); // ?auto : le joueur est piloté par l'IA (démo/test)
const RES_H = 240; // hauteur de rendu façon N64
const $ = id => document.getElementById(id);

// ---------- rendu bas-def ----------
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
const scene = new THREE.Scene();
const SKY = 0x8fc8ff;
scene.fog = new THREE.Fog(SKY, 140, 520);
const camera = new THREE.PerspectiveCamera(62, 4 / 3, 0.5, 2500);

function resize() {
  const aspect = innerWidth / innerHeight;
  renderer.setSize(Math.round(RES_H * aspect), RES_H, false);
  camera.aspect = aspect; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ciel dégradé + montagnes
{
  const c = document.createElement('canvas'); c.width = 2; c.height = 128;
  const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#2a62c9'); g.addColorStop(0.7, '#8fc8ff'); g.addColorStop(1, '#d6ecff');
  x.fillStyle = g; x.fillRect(0, 0, 2, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  scene.background = t;
}
const hemi = new THREE.HemisphereLight(0xffffff, 0x557744, 1.5);
const sun = new THREE.DirectionalLight(0xfff2d0, 1.6); sun.position.set(0.5, 1, 0.3);
scene.add(hemi, sun);

const track = new Track(scene);
const mountains = new THREE.Group();
for (let i = 0; i < 24; i++) {
  const a = (i / 24) * Math.PI * 2, r = 1100 + Math.random() * 200, h = 150 + Math.random() * 200;
  const m = new THREE.Mesh(new THREE.ConeGeometry(120 + Math.random() * 100, h, 5),
    new THREE.MeshBasicMaterial({ color: i % 3 ? 0x6a7fa8 : 0x8a97b8, fog: false }));
  m.position.set(Math.cos(a) * r, h / 2 - 5, Math.sin(a) * r);
  mountains.add(m);
}
mountains.position.set(0, 0, 160);
scene.add(mountains);

const sound = new Sound();
const items = new Items(scene, track, sound);

// ---------- karts ----------
const ROSTER = [
  { name: 'Rex', color: 0x2fbf4a, helmet: 0xffcc00, skill: 0.96 },
  { name: 'Pia', color: 0xff5fa2, helmet: 0xffffff, skill: 0.93 },
  { name: 'Bolt', color: 0xffc800, helmet: 0x222222, skill: 0.98 },
  { name: 'Nina', color: 0x9b59ff, helmet: 0x66ffee, skill: 0.90 },
  { name: 'Otto', color: 0x2ad4ff, helmet: 0xff5533, skill: 0.95 },
  { name: 'Toi', color: 0xe11d2a, helmet: 0xffffff, isPlayer: true },
];
const karts = ROSTER.map(r => new Kart(track, r));
const player = karts.find(k => k.isPlayer);
karts.forEach(k => scene.add(k.mesh));

function gridReset() {
  // ordre de grille : le joueur part au fond
  const order = [0, 1, 2, 3, 4, 5];
  order.forEach((ri, slot) => {
    const k = karts[ri], row = slot >> 1, lat = slot % 2 ? 5.5 : -5.5;
    const idx = track.wrap(track.N - 6 - row * 5);
    const p = track.at(idx, lat);
    k.reset(p.x, p.z, track.heading(idx), idx);
    k.lap = 0; k.aiLat = (Math.random() - 0.5) * 12; k.aiPhase = Math.random() * 6;
    k.mesh.visible = true;
  });
  items.reset();
}

// ---------- entrées ----------
const keys = {};
const touch = {};
addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  if (!e.repeat) keys[e.code] = true;
  if (!e.repeat) onPress(e.code);
});
addEventListener('keyup', e => { keys[e.code] = false; });
let itemPressed = false;
function onPress(code) {
  sound.init();
  if (code === 'Enter' && (state === 'menu' || state === 'finished')) startRace();
  if (code === 'KeyR' && state !== 'menu') startRace();
  if (code === 'KeyM') sound.setMuted(!sound.muted);
  if (code === 'KeyE' || code === 'ControlLeft' || code === 'ControlRight') itemPressed = true;
}
$('menu').addEventListener('pointerdown', () => { sound.init(); if (state === 'menu') startRace(); });
$('results').addEventListener('pointerdown', () => { if (state === 'finished') startRace(); });
if (matchMedia('(pointer:coarse)').matches) $('touch').classList.remove('hidden');
document.querySelectorAll('#touch button').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); touch[k] = true; if (k === 'item') itemPressed = true; });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { touch[k] = false; });
});

function playerInput() {
  const gp = (navigator.getGamepads && navigator.getGamepads()[0]) || null;
  const ax = gp ? gp.axes[0] : 0;
  const steer = (keys.ArrowRight || keys.KeyD || touch.right ? 1 : 0) - (keys.ArrowLeft || keys.KeyA || keys.KeyQ || touch.left ? 1 : 0)
    + (Math.abs(ax) > 0.15 ? ax : 0);
  const gas = keys.ArrowUp || keys.KeyW || keys.KeyZ || gp?.buttons[0]?.pressed || touch.right || touch.left || (matchMedia('(pointer:coarse)').matches && !touch.brake);
  return {
    throttle: gas ? 1 : 0,
    brake: keys.ArrowDown || keys.KeyS || touch.brake || gp?.buttons[1]?.pressed ? 1 : 0,
    steer: Math.max(-1, Math.min(1, steer)),
    drift: !!(keys.Space || keys.ShiftLeft || keys.ShiftRight || touch.drift || gp?.buttons[5]?.pressed),
  };
}

// ---------- IA ----------
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
function aiInput(k, time) {
  const T = track, spd = Math.max(0, k.speed);
  const look = k.idx + 8 + spd / 6;
  // léger louvoiement + évitement des bananes / karts proches
  let lat = k.aiLat + Math.sin(time * 0.5 + k.aiPhase) * 3;
  for (const b of items.bananas) {
    const dx = b.mesh.position.x - k.pos.x, dz = b.mesh.position.z - k.pos.z;
    const f = k.fwd;
    if (dx * f.x + dz * f.z > 0 && dx * dx + dz * dz < 900) {
      const r = T.right[k.idx]; const side = dx * r.x + dz * r.z;
      lat += side > 0 ? -6 : 6;
    }
  }
  lat = Math.max(-9, Math.min(9, lat));
  const target = T.at(look, lat);
  const want = Math.atan2(target.x - k.pos.x, target.z - k.pos.z);
  const diff = wrapAngle(want - k.h);
  const steer = Math.max(-1, Math.min(1, -diff * 2.5));
  const curve = Math.abs(T.curvature(k.idx, 22));
  const targetSpeed = 60 * (1 - Math.min(0.5, curve * 0.9));
  const throttle = spd < targetSpeed ? 1 : 0;
  const brake = spd > targetSpeed + 10 ? 1 : 0;
  // utilisation des objets
  if (k.item && !k.aiUse) k.aiUse = time + 0.8 + Math.random() * 3;
  return { throttle, brake, steer, drift: false, wantsItem: !!k.item && k.aiUse && time > k.aiUse && (k.item !== 'mushroom' || curve < 0.25) };
}

// ---------- état de course ----------
let state = 'menu', time = 0, raceTime = 0, countdown = 0, lastCount = 0, finishOrder = [];
const hud = $('hud'), banner = $('banner');
gridReset();

function startRace() {
  gridReset();
  state = 'countdown'; countdown = 4.2; lastCount = 4; raceTime = 0; finishOrder = [];
  $('menu').classList.add('hidden'); $('results').classList.add('hidden'); hud.classList.remove('hidden');
  camH = player.h; sound.startMusic();
}

const ord = n => n + ['st', 'nd', 'rd', 'th', 'th', 'th'][n - 1];
function updatePlaces() {
  const sorted = [...karts].sort((a, b) =>
    (b.finished - a.finished) || (a.finished ? a.finishTime - b.finishTime : b.progress - a.progress));
  sorted.forEach((k, i) => k.place = i + 1);
  return sorted;
}

function finishKart(k) {
  if (k.finished) return;
  k.finished = true; k.finishTime = raceTime; finishOrder.push(k);
  if (k === player) {
    state = 'finished';
    setTimeout(showResults, 1800);
    banner.textContent = 'FINISH!'; sound.lap();
  }
}
function showResults() {
  if (state !== 'finished') return;
  // classement final : ceux qui ont fini, puis les autres par progression
  const s = updatePlaces();
  $('results').innerHTML = `<h2>${ord(player.place)} PLACE</h2><table>${s.map((k, i) =>
    `<tr class="${k === player ? 'me' : ''}"><td>${i + 1}.</td><td>${k.name}</td><td>${k.finished ? fmt(k.finishTime) : '—'}</td></tr>`).join('')}</table>
    <p class="blink" style="font-size:3vmin">ENTRÉE ou touche pour rejouer</p>`;
  $('results').classList.remove('hidden'); hud.classList.add('hidden');
  banner.textContent = '';
}
const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

// ---------- caméra ----------
let camH = 0, fov = 62;
const camPos = new THREE.Vector3(), lookAt = new THREE.Vector3();
function updateCamera(dt) {
  if (state === 'menu') {
    const t = time * 0.25, c = track.pts[track.N - 20];
    camera.position.set(c.x + Math.sin(t) * 26, 9, c.z + Math.cos(t) * 26);
    camera.lookAt(c.x, 2, c.z); return;
  }
  const target = player.h + player.visH * 0.5 + (player.drifting ? -player.drifting * 0.25 : 0);
  camH += wrapAngle(target - camH) * Math.min(1, (player.drifting ? 2.5 : 5) * dt);
  const back = 9 + Math.min(4, Math.max(0, player.speed) / 20);
  const sx = Math.sin(camH), cz = Math.cos(camH);
  camPos.set(player.pos.x - sx * back, 4.6, player.pos.z - cz * back);
  camera.position.lerp(camPos, Math.min(1, 14 * dt));
  if (camera.position.distanceTo(camPos) > 30) camera.position.copy(camPos);
  lookAt.set(player.pos.x + sx * 6, 1.8, player.pos.z + cz * 6);
  camera.lookAt(lookAt);
  const tf = player.boost > 0 ? 78 : 62 + Math.max(0, player.speed) * 0.1;
  fov += (tf - fov) * Math.min(1, 6 * dt);
  camera.fov = fov; camera.updateProjectionMatrix();
}

// ---------- minimap ----------
const mini = $('minimap'), mctx = mini.getContext('2d');
const bounds = track.pts.reduce((b, p) => ({
  x0: Math.min(b.x0, p.x), x1: Math.max(b.x1, p.x), z0: Math.min(b.z0, p.z), z1: Math.max(b.z1, p.z) }),
  { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 });
const mScale = 120 / Math.max(bounds.x1 - bounds.x0, bounds.z1 - bounds.z0);
const mp = (x, z) => [10 + (x - bounds.x0) * mScale, 130 - (z - bounds.z0) * mScale];
function drawMinimap() {
  mctx.clearRect(0, 0, 140, 140);
  mctx.lineJoin = 'round'; mctx.lineCap = 'round';
  for (const [w, c] of [[9, '#000'], [6, '#ddd']]) {
    mctx.lineWidth = w; mctx.strokeStyle = c; mctx.beginPath();
    track.pts.forEach((p, i) => { const [x, y] = mp(p.x, p.z); i ? mctx.lineTo(x, y) : mctx.moveTo(x, y); });
    mctx.closePath(); mctx.stroke();
  }
  for (const k of karts) {
    const [x, y] = mp(k.pos.x, k.pos.z);
    mctx.fillStyle = k.isPlayer ? '#fff' : '#' + k.color.toString(16).padStart(6, '0');
    mctx.strokeStyle = '#000'; mctx.lineWidth = 2;
    mctx.beginPath(); mctx.arc(x, y, k.isPlayer ? 5 : 4, 0, 7); mctx.stroke(); mctx.fill();
  }
}

// ---------- boucle ----------
let prev = performance.now(), hudT = 0, lastLap = 1;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now; time += dt;

  if (state === 'countdown') {
    countdown -= dt;
    const n = Math.ceil(countdown - 1);
    if (n !== lastCount) {
      lastCount = n;
      if (n >= 1 && n <= 3) { banner.textContent = n; sound.countdown(false); }
      else if (n <= 0) { banner.textContent = 'GO!'; sound.countdown(true); }
    }
    if (countdown <= 1) { state = 'race'; setTimeout(() => { if (state === 'race') banner.textContent = ''; }, 900); }
    else if (countdown > 4) banner.textContent = '';
    // départ lancé : pas de déplacement mais les karts se stabilisent
    for (const k of karts) k.update(dt, { throttle: 0, brake: 0, steer: 0, drift: false });
    // turbo de départ si le joueur accélère au bon moment
    player.startHeld = keys.ArrowUp || keys.KeyW || keys.KeyZ || touch.left || touch.right;
    if (countdown < 1.4) player.goodStart = countdown > 0.9 ? false : player.startHeld;
  }

  if (state === 'race' || state === 'finished') {
    if (state === 'race') raceTime += dt;
    const sorted = updatePlaces();
    const lead = sorted[0];
    for (const k of karts) {
      let input, scale = 1;
      if (k === player && state === 'race' && !AUTO) {
        input = playerInput();
        if (itemPressed) { items.use(k, karts); }
      } else {
        input = aiInput(k, time);
        if (input.wantsItem) { k.aiUse = 0; items.use(k, karts); }
        // rubber band : les IA en retard accélèrent un peu, celles en tête ralentissent
        const gap = (player.progress - k.progress) / track.N;
        scale = (k === player ? 1 : k.skill) * (1 + Math.max(-1, Math.min(1, gap * 5)) * 0.06);
        if (k === player) scale = 0.9;
      }
      k.update(dt, input, scale);
      if (k.lap > LAPS && !k.finished) finishKart(k);
      if (k === player) {
        if (k.lap > lastLap && k.lap <= LAPS) { banner.textContent = k.lap === LAPS ? 'FINAL LAP!' : ''; setTimeout(() => { if (state === 'race') banner.textContent = ''; }, 1500); sound.lap(); }
        lastLap = k.lap;
      }
    }
    itemPressed = false;
    // collisions kart/kart
    for (let i = 0; i < karts.length; i++) for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i], b = karts[j];
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d2 = dx * dx + dz * dz;
      if (d2 < 9.5 && d2 > 1e-4) {
        const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, push = (3.08 - d) / 2;
        a.pos.x -= nx * push; a.pos.z -= nz * push; b.pos.x += nx * push; b.pos.z += nz * push;
        const rv = (b.v.x - a.v.x) * nx + (b.v.z - a.v.z) * nz;
        if (rv < 0) { const jx = nx * rv * 0.6, jz = nz * rv * 0.6; a.v.x += jx; a.v.z += jz; b.v.x -= jx; b.v.z -= jz; }
        if ((a === player || b === player) && rv < -4) sound.bump();
      }
    }
    items.update(dt, karts, time);
    sound.engineUpdate(player.speed, state === 'race');
  } else if (state === 'menu') {
    items.update(dt, [], time);
  }

  updateCamera(dt);

  hudT += dt;
  if (hud.classList.contains('hidden') === false && hudT > 0.05) {
    hudT = 0;
    $('pos').innerHTML = `${player.place}<sup>${['st', 'nd', 'rd', 'th', 'th', 'th'][player.place - 1]}</sup>`;
    $('lap').textContent = `LAP ${Math.min(LAPS, Math.max(1, player.lap))}/${LAPS}`;
    $('time').textContent = fmt(raceTime);
    $('kmh').textContent = Math.round(Math.abs(player.speed) * 3.2);
    $('item').textContent = player.roulette > 0 ? ICON[['mushroom', 'banana', 'shell'][Math.floor(time * 12) % 3]] : player.item ? ICON[player.item] : '';
    drawMinimap();
  }
  mountains.position.x = camera.position.x * 0.98;
  mountains.position.z = camera.position.z * 0.98;
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
window.__game = { aiInput, karts, player, track, items, get state() { return state; }, startRace, keys };
