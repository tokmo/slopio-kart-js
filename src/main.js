import * as THREE from 'three';
import { Track, TRACK_W } from './track.js';
import { Kart } from './kart.js';
import { Items, ITEM_NAMES } from './items.js';
import { Props } from './props.js';
import { CHARACTERS } from './characters.js';
import { drawIcon } from './models.js';
import { Sound } from './audio.js';
import { fx } from './fx.js';
import { onEvent } from './events.js';
import * as models from './models.js';

const LAPS = 3;
const AUTO = new URLSearchParams(location.search).has('auto'); // ?auto : le joueur est piloté par l'IA (démo/test)
const RES_H = 240;
const $ = id => document.getElementById(id);
const pick = a => a[Math.random() * a.length | 0];
const hex = c => '#' + c.toString(16).padStart(6, '0');
const lite = c => hex(new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.35).getHex());

// ---------- rendu bas-def ----------
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8fc8ff, 140, 520);
const camera = new THREE.PerspectiveCamera(62, 4 / 3, 0.5, 2500);
function resize() {
  const aspect = innerWidth / innerHeight;
  renderer.setSize(Math.round(RES_H * aspect), RES_H, false);
  camera.aspect = aspect; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

{
  const c = document.createElement('canvas'); c.width = 2; c.height = 128;
  const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#2a62c9'); g.addColorStop(0.7, '#8fc8ff'); g.addColorStop(1, '#d6ecff');
  x.fillStyle = g; x.fillRect(0, 0, 2, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  scene.background = t;
}
scene.add(new THREE.HemisphereLight(0xffffff, 0x557744, 1.5));
const sun = new THREE.DirectionalLight(0xfff2d0, 1.6); sun.position.set(0.5, 1, 0.3); scene.add(sun);

fx.init(scene);
const track = new Track(scene);
const mountains = new THREE.Group();
for (let i = 0; i < 24; i++) {
  const a = (i / 24) * Math.PI * 2, r = 1100 + Math.random() * 200, h = 150 + Math.random() * 200;
  const m = new THREE.Mesh(new THREE.ConeGeometry(120 + Math.random() * 100, h, 5),
    new THREE.MeshBasicMaterial({ color: i % 3 ? 0x6a7fa8 : 0x8a97b8, fog: false }));
  m.position.set(Math.cos(a) * r, h / 2 - 5, Math.sin(a) * r);
  mountains.add(m);
}
scene.add(mountains);

const sound = new Sound();
const items = new Items(scene, track, sound);
const props = new Props(scene, track);

// ---------- karts : 8 caricatures ----------
let karts = [], player = null;
function buildField(playerChar) {
  for (const k of karts) { scene.remove(k.mesh); scene.remove(k.mesh.userData.shadow); }
  karts = CHARACTERS.map(c => new Kart(track, c, { isPlayer: c === playerChar, skill: 0.9 + Math.random() * 0.09 }));
  player = karts.find(k => k.isPlayer);
  karts.forEach(k => { scene.add(k.mesh); scene.add(k.mesh.userData.shadow); });
  window.__game && Object.assign(window.__game, { karts, player });
}

function gridReset() {
  // le joueur part en 6e position, dans la mêlée
  const order = karts.filter(k => !k.isPlayer);
  order.splice(5, 0, player);
  order.forEach((k, slot) => {
    const row = slot >> 1, lat = slot % 2 ? 5.5 : -5.5;
    const idx = track.wrap(track.N - 6 - row * 5);
    const p = track.at(idx, lat);
    k.reset(p.x, p.z, track.heading(idx), idx);
    k.lap = 0; k.aiLat = (Math.random() - 0.5) * 12; k.aiPhase = Math.random() * 6; k.mesh.visible = true;
  });
  items.reset(); fx.clearSkids();
}

// ---------- sélection du personnage ----------
let sel = 0;
const preview = new THREE.Group();
const previewKarts = CHARACTERS.map(c => new Kart(track, c));
previewKarts.forEach(k => { k.mesh.visible = false; preview.add(k.mesh); k.mesh.position.set(0, 0, 0); });
scene.add(preview);
const previewPos = track.at(track.N - 40, -60);
preview.position.set(previewPos.x, 0, previewPos.z);
function showSelection() {
  const c = CHARACTERS[sel];
  previewKarts.forEach((k, i) => { k.mesh.visible = i === sel; });
  $('cname').textContent = c.name; $('cname').style.color = hex(c.color === 0xffe61a || c.color === 0xffd21f ? c.color : c.color);
  $('cfrom').textContent = c.from; $('ctag').textContent = c.tagline;
  const bar = (v, lo, hi) => Math.round(100 * (v - lo) / (hi - lo));
  $('bars').innerHTML = [['Vitesse', bar(c.stats.speed, 0.9, 1.1)], ['Maniabilité', bar(c.stats.turn, 0.7, 1.25)], ['Poids', bar(c.stats.weight, 0.6, 1.8)], ['Accélération', bar(c.stats.accel, 0.8, 1.3)]]
    .map(([n, v]) => `<div><span>${n}</span><i><b style="width:${Math.max(8, v)}%"></b></i></div>`).join('');
  $('cdots').innerHTML = CHARACTERS.map((_, i) => `<u class="${i === sel ? 'on' : ''}"></u>`).join('');
  sound.beep(500 + sel * 60, 0.06);
}
$('prev').addEventListener('pointerdown', e => { e.stopPropagation(); changeSel(-1); });
$('next').addEventListener('pointerdown', e => { e.stopPropagation(); changeSel(1); });
$('go').addEventListener('pointerdown', e => { e.stopPropagation(); confirmSel(); });
function changeSel(d) { sel = (sel + d + CHARACTERS.length) % CHARACTERS.length; showSelection(); }
function confirmSel() { buildField(CHARACTERS[sel]); $('select').classList.add('hidden'); startRace(); }

// ---------- entrées ----------
const keys = {}, touch = {};
let itemPressed = false;
addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  if (!e.repeat) { keys[e.code] = true; onPress(e.code); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
function onPress(code) {
  sound.init();
  if (state === 'menu' && code === 'Enter') openSelect();
  else if (state === 'select') {
    if (code === 'ArrowLeft' || code === 'KeyA' || code === 'KeyQ') changeSel(-1);
    if (code === 'ArrowRight' || code === 'KeyD') changeSel(1);
    if (code === 'Enter' || code === 'Space') confirmSel();
  } else if (state === 'finished' && code === 'Enter') openSelect();
  if (code === 'KeyR' && (state === 'race' || state === 'countdown' || state === 'finished')) startRace();
  if (code === 'KeyM') sound.setMuted(!sound.muted);
  if (code === 'KeyH' && (state === 'race')) honk();
  if (code === 'KeyE' || code === 'ControlLeft' || code === 'ControlRight') itemPressed = true;
}
function honk() { sound.honk(); say(player, pick(['*POUET !*', '*POUET POUET !*', '*PROUT* (klaxon)']), true); for (const k of karts) if (k !== player && k.pos.distanceTo(player.pos) < 25 && Math.random() < 0.5) say(k, pick(k.char.quotes.pass), false); }
function openSelect() {
  state = 'select'; $('menu').classList.add('hidden'); $('results').classList.add('hidden'); hud.classList.add('hidden');
  $('select').classList.remove('hidden'); showSelection(); banner.textContent = '';
}
$('menu').addEventListener('pointerdown', () => { sound.init(); if (state === 'menu') openSelect(); });
$('results').addEventListener('pointerdown', () => { if (state === 'finished') openSelect(); });
if (matchMedia('(pointer:coarse)').matches) $('touch').classList.remove('hidden');
document.querySelectorAll('#touch button').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); touch[k] = true; if (k === 'item') itemPressed = true; if (k === 'honk') honk(); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { touch[k] = false; });
});

function playerInput() {
  const gp = (navigator.getGamepads && navigator.getGamepads()[0]) || null;
  const ax = gp ? gp.axes[0] : 0;
  const steer = (keys.ArrowRight || keys.KeyD || touch.right ? 1 : 0) - (keys.ArrowLeft || keys.KeyA || keys.KeyQ || touch.left ? 1 : 0)
    + (Math.abs(ax) > 0.15 ? ax : 0);
  const gas = keys.ArrowUp || keys.KeyW || keys.KeyZ || gp?.buttons[0]?.pressed || (matchMedia('(pointer:coarse)').matches && !touch.brake);
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
  let lat = k.aiLat + Math.sin(time * 0.5 + k.aiPhase) * 3;
  const avoid = (p) => {
    const dx = p.x - k.pos.x, dz = p.z - k.pos.z, f = k.fwd;
    if (dx * f.x + dz * f.z > 0 && dx * dx + dz * dz < 900) { const r = T.right[k.idx]; lat += (dx * r.x + dz * r.z) > 0 ? -6 : 6; }
  };
  for (const b of items.bananas) avoid(b.mesh.position);
  for (const b of items.bombs) avoid(b.mesh.position);
  for (const c of props.cows) avoid(c.mesh.position);
  lat = Math.max(-9, Math.min(9, lat));
  const target = T.at(look, lat);
  const want = Math.atan2(target.x - k.pos.x, target.z - k.pos.z);
  const diff = wrapAngle(want - k.h);
  const steer = Math.max(-1, Math.min(1, -diff * 2.5));
  const curve = Math.abs(T.curvature(k.idx, 22));
  const targetSpeed = 60 * (1 - Math.min(0.5, curve * 0.9));
  if (k.item && !k.aiUse) k.aiUse = time + 0.8 + Math.random() * 3;
  const okay = k.item === 'mushroom' || k.item === 'star' ? curve < 0.25 : true;
  return { throttle: spd < targetSpeed ? 1 : 0, brake: spd > targetSpeed + 10 ? 1 : 0, steer, drift: false,
    wantsItem: !!k.item && k.aiUse && time > k.aiUse && okay };
}

// ---------- toasts / commentateur ----------
const toastEl = $('toast');
let toastT = 0, toastPrio = 0;
function say(kart, text, force) {
  const speaker = kart ? kart.name : 'COMMENTATEUR';
  if (!force && toastT > 0 && toastPrio > 0) return;
  toastEl.innerHTML = `<b style="color:${kart ? hex(kart.color) : '#ffe23a'}">${speaker} :</b> ${text}`;
  toastEl.classList.remove('hidden'); toastT = 2.6; toastPrio = force ? 1 : 0;
}
const ANNOUNCER = {
  hitP: ["{n} vient de découvrir la physique. Ça fait mal.", '{n} fait un joli tonneau. Note du jury : 6.', 'Ah, {n} a voulu tester le sol.'],
  cow: ['Une vache ! Personne ne pouvait le prévoir. (Le panneau, si.)', 'MEUH. {n} a perdu.'],
  chomp: ["Le boulet a mordu {n}. Le boulet s'excuse (non)."],
  wall: ['{n} embrasse le mur. Il est heureux, le mur.', 'Le mur est un ami, {n}. Un ami dur.'],
  lastLap: ["DERNIER TOUR ! Enfin, j'ai plus de café."],
  behind: ["{n} est dernier. On lui garde du buffet.", '{n} est si loin que la météo est différente.'],
  wrong: ['{n} va dans le mauvais sens. Bravo pour le courage.', 'Demi-tour, {n} ! Ou alors tu fais un truc que je ne comprends pas.'],
  trick: ['Quel style, {n} ! Le jury (ma mère) applaudit.', '{n} fait un saut périlleux. Personne ne lui avait demandé.'],
  turbo: ['Turbo ! {n} chauffe les pneus.'],
  star: ['{n} est INVINCIBLE ! (7 secondes)'],
  bomb: ['BOUM. Ça sent le brûlé.', "La bombe n'était pas contente."],
  finishWin: ['{n} gagne ! Tout le monde applaudit (poliment).'],
};
const ann = (key, kart) => say(null, pick(ANNOUNCER[key]).replace('{n}', kart ? kart.name : ''), false);
let lastQuote = 0;
onEvent((type, kart, extra) => {
  if (state !== 'race' && state !== 'countdown') return;
  const q = kart?.char?.quotes;
  const isP = kart === player, now = performance.now();
  if (type === 'hit') {
    if (isP) { say(kart, pick(q.hit), true); shake = 0.7; }
    else if (Math.random() < 0.3 && now - lastQuote > 3000) { say(kart, pick(q.hit), false); lastQuote = now; }
    if (extra === 'chomp' && isP) ann('chomp', kart);
  } else if (type === 'cow') { if (isP) ann('cow', kart); }
  else if (type === 'wall') { if (isP && Math.random() < 0.35) ann('wall', kart); }
  else if (type === 'trick') { if (isP) { ann('trick', kart); banner2('STYLE !'); } }
  else if (type === 'turbo') { if (isP) { banner2(['', 'TURBO !', 'SUPER TURBO !', 'ULTRA TURBO !!'][extra]); if (Math.random() < 0.5) say(kart, pick(q.boost), false); } sound.beep(500 + extra * 200, 0.15, 'square', 2); }
  else if (type === 'use') {
    if (isP) { if (extra === 'star') ann('star', kart); }
    else if (extra === 'star' && Math.random() < 0.7) say(kart, pick(q.boost), false);
  } else if (type === 'got') { if (isP) { say(null, `Tu obtiens : ${ITEM_NAMES[extra]}`, false); } }
  else if (type === 'boom') { if (Math.random() < 0.4) ann('bomb'); shake = Math.max(shake, Math.min(1, 60 / (player.pos.distanceTo(extra) + 20))); }
  else if (type === 'driftlevel' && isP) sound.beep(400 + extra * 250, 0.07, 'square');
});
function banner2(t) { const b = $('banner2'); b.textContent = t; b.classList.remove('hidden'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; }
$('banner2').addEventListener('animationend', () => $('banner2').classList.add('hidden'));

// ---------- état de course ----------
let state = 'menu', time = 0, raceTime = 0, countdown = 0, lastCount = 0, shake = 0, wrongT = 0;
const hud = $('hud'), banner = $('banner');
buildField(CHARACTERS[0]);

function startRace() {
  gridReset();
  state = 'countdown'; countdown = 4.2; lastCount = 4; raceTime = 0; lastLap = 1; wrongT = 0; lastPlace = 8; player.rocketArm = undefined;
  previewKarts.forEach(k => { k.mesh.visible = false; });
  $('menu').classList.add('hidden'); $('results').classList.add('hidden'); $('select').classList.add('hidden'); hud.classList.remove('hidden'); $('toast').classList.add('hidden');
  camH = player.h; sound.startMusic();
  say(null, pick(["C'est parti pour la course la moins sérieuse du monde !", 'Attention : les vaches ont priorité. Toujours.', 'Le règlement est optionnel aujourd’hui.']), true);
}

const ord = n => n + (n === 1 ? 'er' : 'e');
function updatePlaces() {
  const sorted = [...karts].sort((a, b) =>
    (b.finished - a.finished) || (a.finished ? a.finishTime - b.finishTime : b.progress - a.progress));
  sorted.forEach((k, i) => k.place = i + 1);
  return sorted;
}

const FINISH_QUIPS = [
  'Le podium te va bien. Le trophée, moins : il est en carton.', 'Presque ! La prochaine fois, prends un raccourci (illégal).',
  'Le bronze. La médaille en chocolat était déjà prise.', "4e : le premier des perdants, c'est déjà un titre.",
  '5e. Ta mère est fière quand même.', "6e. C'est la faute du kart. Toujours.", '7e. Au moins tu as fini. Certains sont encore sur la piste.', 'Dernier ! Un escargot sous Lexomil t’aurait battu de 4 secondes.',
];
function finishKart(k) {
  if (k.finished) return;
  k.finished = true; k.finishTime = raceTime;
  if (k === player) {
    state = 'finished';
    setTimeout(showResults, 2200);
    banner.textContent = 'FINISH!'; sound.lap(); fx.confetti(player.pos);
  }
}
function showResults() {
  if (state !== 'finished') return;
  const s = updatePlaces();
  const q = player.place === 1 ? pick(player.char.quotes.win) : FINISH_QUIPS[player.place - 1];
  $('results').innerHTML = `<h2>${ord(player.place)} — ${player.place === 1 ? 'BRAVO !' : player.place >= 7 ? 'AÏE.' : 'PAS MAL'}</h2>
    <table>${s.map((k, i) => `<tr class="${k === player ? 'me' : ''}"><td>${i + 1}.</td><td style="color:${lite(k.color)}">${k.name}</td><td>${k.finished ? fmt(k.finishTime) : '—'}</td></tr>`).join('')}</table>
    <p class="quip"><b style="color:${hex(player.color)}">${player.name} :</b> ${q}</p>
    <p class="blink" style="font-size:3vmin">ENTRÉE ou touche pour rejouer</p>`;
  $('results').classList.remove('hidden'); hud.classList.add('hidden'); banner.textContent = ''; $('toast').classList.add('hidden');
}
const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

// ---------- caméra ----------
let camH = 0, fov = 62;
const camPos = new THREE.Vector3(), lookAt = new THREE.Vector3();
function updateCamera(dt) {
  if (state === 'menu') {
    const t = time * 0.25, c = track.pts[track.N - 20];
    camera.position.set(c.x + Math.sin(t) * 30, 10, c.z + Math.cos(t) * 30);
    camera.lookAt(c.x, 2, c.z); return;
  }
  if (state === 'select') {
    const t = time * 0.4;
    preview.rotation.y = t;
    const c = preview.position;
    camera.position.set(c.x, 5.5, c.z + 17); camera.lookAt(c.x, -0.6, c.z);
    camera.fov = 42; camera.updateProjectionMatrix();
    fov = 45; return;
  }
  const target = player.h + player.visH * 0.5 + (player.drifting ? -player.drifting * 0.32 : 0);
  camH += wrapAngle(target - camH) * Math.min(1, (player.drifting ? 2.2 : 5) * dt);
  const back = 9.5 + Math.min(4, Math.max(0, player.speed) / 20);
  const sx = Math.sin(camH), cz = Math.cos(camH);
  camPos.set(player.pos.x - sx * back, 4.8 + player.y * 0.5, player.pos.z - cz * back);
  camera.position.lerp(camPos, Math.min(1, 14 * dt));
  if (camera.position.distanceTo(camPos) > 30) camera.position.copy(camPos);
  lookAt.set(player.pos.x + sx * 6, 1.8 + player.y * 0.4, player.pos.z + cz * 6);
  camera.lookAt(lookAt);
  if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake * 1.4; camera.position.y += (Math.random() - 0.5) * shake * 1.0; shake = Math.max(0, shake - dt * 1.8); }
  const tf = player.boost > 0 ? 80 : player.star > 0 ? 74 : 62 + Math.max(0, player.speed) * 0.1;
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
  for (const c of props.cows) { const [x, y] = mp(c.mesh.position.x, c.mesh.position.z); mctx.fillStyle = '#fff'; mctx.fillRect(x - 2, y - 2, 4, 4); mctx.fillStyle = '#000'; mctx.fillRect(x - 1, y - 1, 2, 2); }
  for (const k of karts) {
    const [x, y] = mp(k.pos.x, k.pos.z);
    mctx.fillStyle = k.isPlayer ? '#fff' : hex(k.color);
    mctx.strokeStyle = '#000'; mctx.lineWidth = 2;
    mctx.beginPath(); mctx.arc(x, y, k.isPlayer ? 5 : 4, 0, 7); mctx.stroke(); mctx.fill();
  }
}

// icône d'objet pixel-art
const iconCtx = $('itemcv').getContext('2d'); let shownIcon = '';
function setIcon(type) { if (type === shownIcon) return; shownIcon = type; iconCtx.clearRect(0, 0, 32, 32); if (type) drawIcon(iconCtx, type); }

// ---------- boucle ----------
let prev = performance.now(), hudT = 0, lastLap = 1, lastPlace = 8, backT = 0, lastProg = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now; time += dt;
  toastT -= dt; if (toastT <= 0) toastEl.classList.add('hidden');

  if (state === 'countdown') {
    countdown -= dt;
    const n = Math.ceil(countdown - 1);
    if (n !== lastCount) {
      lastCount = n;
      if (n >= 1 && n <= 3) { banner.textContent = n; sound.countdown(false); }
      else if (n <= 0) { banner.textContent = 'GO!'; sound.countdown(true); }
    }
    if ((keys.ArrowUp || keys.KeyW || keys.KeyZ) && player.rocketArm === undefined) player.rocketArm = countdown;
    if (countdown <= 1) {
      state = 'race'; setTimeout(() => { if (state === 'race') banner.textContent = ''; }, 900);
      // départ fusée si on appuie sur accélérer au bon moment (entre "2" et "GO")
      const t = player.rocketArm;
      if (!AUTO && t !== undefined && t < 1.9) { player.giveBoost(1.0); banner2('DÉPART FUSÉE !'); }
      else if (!AUTO && t !== undefined) say(null, 'Trop tôt ! Le moteur est noyé (et ta dignité aussi).', true);
    } else if (countdown > 4) banner.textContent = '';
    for (const k of karts) k.update(dt, { throttle: 0, brake: 0, steer: 0, drift: false });
  }

  if (state === 'race' || state === 'finished') {
    if (state === 'race') raceTime += dt;
    updatePlaces();
    for (const k of karts) {
      let input, scale = 1;
      if (k === player && state === 'race' && !AUTO) {
        input = playerInput();
        if (itemPressed) items.use(k);
      } else {
        input = aiInput(k, time);
        if (input.wantsItem) { k.aiUse = 0; items.use(k); }
        const gap = (player.progress - k.progress) / track.N;
        scale = (k === player ? 0.9 : k.skill) * (1 + Math.max(-1, Math.min(1, gap * 5)) * 0.06);
      }
      k.update(dt, input, scale);
      if (k.lap > LAPS && !k.finished) finishKart(k);
      if (k === player) {
        if (k.lap > lastLap && k.lap <= LAPS) { if (k.lap === LAPS) { banner.textContent = 'FINAL LAP!'; ann('lastLap', k); } else banner.textContent = 'LAP ' + k.lap; setTimeout(() => { if (state === 'race') banner.textContent = ''; }, 1500); sound.lap(); }
        lastLap = k.lap;
      }
    }
    itemPressed = false;
    // collisions kart/kart (le poids compte, l'étoile écrase)
    for (let i = 0; i < karts.length; i++) for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i], b = karts[j];
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d2 = dx * dx + dz * dz;
      if (d2 < 9.5 && d2 > 1e-4 && Math.abs(a.y - b.y) < 1.5) {
        const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, over = 3.08 - d;
        const wa = a.stats.weight, wb = b.stats.weight, tw = wa + wb;
        a.pos.x -= nx * over * wb / tw; a.pos.z -= nz * over * wb / tw; b.pos.x += nx * over * wa / tw; b.pos.z += nz * over * wa / tw;
        const rv = (b.v.x - a.v.x) * nx + (b.v.z - a.v.z) * nz;
        if (rv < 0) { const ja = rv * 1.2 * wb / tw, jb = rv * 1.2 * wa / tw; a.v.x += nx * ja; a.v.z += nz * ja; b.v.x -= nx * jb; b.v.z -= nz * jb; }
        if ((a === player || b === player) && rv < -4) { sound.bump(); shake = Math.max(shake, 0.25); }
        if (a.star > 0 && b.star <= 0) b.hit('star', 1.4);
        if (b.star > 0 && a.star <= 0) a.hit('star', 1.4);
      }
    }
    items.update(dt, karts, time);
    props.update(dt, karts, time, sound);
    sound.engineUpdate(player.speed, state === 'race');
    sound.screech(state === 'race' && (player.drifting !== 0 && player.y < 0.5));
    // mauvais sens / dernière place
    if (state === 'race') {
      backT += dt;
      if (backT > 0.5) {
        const dP = player.progress - lastProg; lastProg = player.progress; backT = 0;
        if (dP < -1 && player.speed > 3) { wrongT += 0.5; if (wrongT >= 1.5) { $('wrong').classList.remove('hidden'); if (wrongT === 1.5) ann('wrong', player); } }
        else { wrongT = 0; $('wrong').classList.add('hidden'); }
        if (player.place === 8 && lastPlace !== 8 && raceTime > 10) ann('behind', player);
        if (player.place < lastPlace && lastPlace - player.place >= 1 && Math.random() < 0.4) { const v = karts.find(k => k.place === player.place + 1); if (v && v !== player) say(v, pick(v.char.quotes.pass), false); }
        lastPlace = player.place;
      }
    }
  } else if (state === 'menu' || state === 'select') {
    items.update(dt, [], time); props.update(dt, [], time, sound);
    if (state === 'select') { const k = previewKarts[sel]; k.speed = 0; k.syncMesh(dt, { steer: 0, drift: false }); }
  }

  fx.update(dt);
  fx.setScale(RES_H * 0.5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  updateCamera(dt);

  hudT += dt;
  if (!hud.classList.contains('hidden') && hudT > 0.05) {
    hudT = 0;
    $('pos').innerHTML = `${player.place}<sup>${player.place === 1 ? 'er' : 'e'}</sup>`;
    $('lap').textContent = `LAP ${Math.min(LAPS, Math.max(1, player.lap))}/${LAPS}`;
    $('time').textContent = fmt(raceTime);
    $('kmh').textContent = Math.round(Math.abs(player.speed) * 3.2);
    setIcon(player.roulette > 0 ? ['mushroom', 'banana', 'shell', 'bomb', 'star'][Math.floor(time * 12) % 5] : player.item || '');
    $('driftbar').style.width = player.drifting ? Math.min(100, player.driftT / 2.1 * 100) + '%' : '0';
    $('driftbar').style.background = ['#fff', '#33aaff', '#ff8a00', '#d050ff'][player.driftLevel];
    drawMinimap();
  }
  mountains.position.x = camera.position.x * 0.98;
  mountains.position.z = camera.position.z * 0.98;
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
window.__game = { models, preview, camera, aiInput, karts, player, track, items, props, openSelect, confirmSel, get state() { return state; }, startRace, keys };
