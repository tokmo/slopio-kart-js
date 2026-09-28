import * as THREE from 'three';

// ---- petits helpers de modélisation (tout en Lambert low-poly, yeux en Basic) ----
const mats = new Map();
const mat = c => { if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c })); return mats.get(c); };
const basic = c => new THREE.MeshBasicMaterial({ color: c });
function B(g, w, h, d, c, x, y, z, rot) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z);
  if (rot) m.rotation.set(...rot); g.add(m); return m;
}
function S(g, r, c, x, y, z, sc = [1, 1, 1], seg = 8) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), mat(c)); m.position.set(x, y, z); m.scale.set(...sc); g.add(m); return m;
}
function C(g, r, h, c, x, y, z, rot, seg = 6) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(c)); m.position.set(x, y, z); if (rot) m.rotation.set(...rot); g.add(m); return m;
}
function Y(g, rt, rb, h, c, x, y, z, rot, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c)); m.position.set(x, y, z); if (rot) m.rotation.set(...rot); g.add(m); return m;
}
function eyeBasic(g, x, y, z, w, h, c = 0x000000) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), basic(c)); m.position.set(x, y, z); g.add(m); return m;
}
// bras qui vont du torse vers le volant
function arms(g, c, hand, sx = 0.75, sy = 0.55, big = 1) {
  for (const s of [-1, 1]) {
    B(g, 0.32 * big, 0.32 * big, 1.1, c, s * sx, sy, 0.55, [0.35, s * -0.15, 0]);
    S(g, 0.28 * big, hand, s * (sx - 0.05), sy - 0.15, 1.15, [1, 1, 1], 6);
  }
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- les 8 caricatures ----------
// Chaque builder renvoie un Group centré sur le siège (y=0 = assise), regardant +z.
const builders = {
  mamamia(g) {
    B(g, 1.3, 1.2, 0.9, 0xd8232a, 0, 0.6, -0.1);                 // chemise rouge
    B(g, 1.36, 0.8, 0.98, 0x2454c8, 0, 0.25, -0.1);              // salopette
    for (const s of [-1, 1]) { B(g, 0.22, 0.9, 0.1, 0x2454c8, s * 0.38, 0.75, 0.39); S(g, 0.1, 0xffd23a, s * 0.38, 0.35, 0.44, [1, 1, 0.5], 5); }
    arms(g, 0xd8232a, 0xffffff);
    S(g, 0.78, 0xffc9a0, 0, 1.75, 0, [1, 0.95, 1], 10);          // tête
    S(g, 0.36, 0xf0968a, 0, 1.62, 0.78, [1.1, 0.9, 1]);           // gros nez
    for (const s of [-1, 1]) {
      B(g, 0.8, 0.22, 0.2, 0x3a2010, s * 0.42, 1.36, 0.72, [0, 0, s * -0.25]);  // moustache XXL
      S(g, 0.25, 0xffc9a0, s * 0.8, 1.7, -0.05);                  // oreilles
      eyeBasic(g, s * 0.28, 1.95, 0.72, 0.28, 0.4, 0xffffff); eyeBasic(g, s * 0.28, 1.93, 0.77, 0.12, 0.26, 0x1a3fbf);
      B(g, 0.34, 0.09, 0.09, 0x3a2010, s * 0.28, 2.22, 0.76, [0, 0, s * 0.3]);    // sourcils
    }
    B(g, 0.32, 0.3, 0.6, 0x3a2010, 0, 1.75, -0.7);                // cheveux
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.84, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd8232a)); cap.position.set(0, 1.98, 0); g.add(cap);
    B(g, 1.3, 0.12, 0.75, 0xd8232a, 0, 2.02, 0.85);
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.3, 10), new THREE.MeshBasicMaterial({ map: canvasTex(32, 32, (c) => {
      c.fillStyle = '#fff'; c.beginPath(); c.arc(16, 16, 16, 0, 7); c.fill();
      c.fillStyle = '#d8232a'; c.font = 'bold 24px Arial'; c.textAlign = 'center'; c.fillText('M', 16, 25);
    }) })); badge.position.set(0, 2.32, 0.6); badge.rotation.x = -0.6; g.add(badge);
  },

  sonik(g) {
    B(g, 1.0, 1.0, 0.7, 0x1e63e6, 0, 0.5, -0.1); B(g, 0.6, 0.7, 0.1, 0xffc9a0, 0, 0.5, 0.27);
    arms(g, 0x1e63e6, 0xffffff, 0.65);
    const head = S(g, 0.85, 0x1e63e6, 0, 1.75, 0, [1, 0.95, 1], 10);
    S(g, 0.45, 0xffc9a0, 0, 1.5, 0.62, [1.2, 0.8, 0.7]);           // museau
    S(g, 0.13, 0x000000, 0, 1.72, 0.98);                            // nez
    B(g, 0.5, 0.06, 0.06, 0x000000, 0, 1.42, 0.95);                 // sourire narquois
    for (const s of [-1, 1]) {
      S(g, 0.3, 0xffffff, s * 0.32, 1.98, 0.62, [1, 1.35, 0.5]);
      S(g, 0.11, 0x22aa55, s * 0.28, 1.95, 0.8, [1, 1.3, 0.4], 5); S(g, 0.06, 0x000000, s * 0.28, 1.95, 0.84, [1, 1.3, 0.4], 4);
      B(g, 0.5, 0.12, 0.1, 0x1e63e6, s * 0.32, 2.36, 0.68, [0, 0, s * 0.25]);  // sourcils "trop cool"
      C(g, 0.22, 0.6, 0x1e63e6, s * 0.4, 2.65, 0.05, [0, 0, s * -0.2]);        // oreilles
      B(g, 0.5, 0.7, 1.2, 0xe01a1a, s * 0.45, -0.1, 1.0);                       // grosses chaussures
      B(g, 0.52, 0.12, 0.5, 0xffffff, s * 0.45, 0.05, 0.9);
    }
    for (const [x, y, r] of [[-0.45, 2.0, 0.5], [0, 2.25, 0.3], [0.45, 2.0, 0.5], [-0.25, 1.5, 0.7], [0.25, 1.5, 0.7]])
      C(g, 0.3, 1.5, 0x1e63e6, x, y, -1.0, [-1.4 - r * 0.2, 0, x * 0.4]);       // piquants
    g.userData.update = (t, k) => { const f = g.children.find(c => c.position.y === -0.1 && c.position.x > 0); if (f) f.rotation.x = Math.sin(t * (k.speed < 5 ? 14 : 3)) * 0.15; };
  },

  konk(g) {
    g.scale.setScalar(1.22);
    B(g, 1.9, 1.3, 1.25, 0x6b3a12, 0, 0.6, -0.2); B(g, 1.2, 0.9, 0.1, 0xc98e4a, 0, 0.7, 0.44);  // torse + plastron
    const tie = B(g, 0.32, 0.9, 0.1, 0xd8232a, 0, 0.55, 0.5); B(g, 0.44, 0.3, 0.12, 0xd8232a, 0, 0.95, 0.5);
    const kk = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshBasicMaterial({ map: canvasTex(16, 16, (c) => { c.fillStyle = '#ffd23a'; c.font = 'bold 12px Arial'; c.textAlign = 'center'; c.fillText('DK', 8, 13); }), transparent: true }));
    kk.position.set(0, 0.55, 0.56); g.add(kk);
    arms(g, 0x6b3a12, 0x8a4c18, 1.15, 0.5, 1.7);
    S(g, 0.8, 0x6b3a12, 0, 1.95, 0.1, [1.05, 0.95, 1], 10);
    S(g, 0.62, 0xd9a15e, 0, 1.85, 0.5, [1, 0.85, 0.6]);            // face
    B(g, 0.9, 0.2, 0.4, 0x6b3a12, 0, 2.45, 0.35);                   // gros sourcil
    B(g, 0.7, 0.1, 0.1, 0x1a0a00, 0, 1.62, 0.88); B(g, 0.5, 0.1, 0.1, 0xffffff, 0, 1.68, 0.9);   // bouche + dents
    for (const s of [-1, 1]) {
      eyeBasic(g, s * 0.24, 2.05, 0.86, 0.22, 0.26, 0xffffff); eyeBasic(g, s * 0.24, 2.03, 0.9, 0.1, 0.14);
      S(g, 0.09, 0x1a0a00, s * 0.13, 1.85, 0.98, [1, 1, 0.5], 4);
      S(g, 0.27, 0xd9a15e, s * 0.85, 1.9, 0.1);
    }
    B(g, 0.5, 0.3, 0.7, 0x6b3a12, 0, 2.7, -0.1);                    // houppette
    // banane volée dans une main
    const ban = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.09, 5, 8, Math.PI), mat(0xffdd22)); ban.position.set(-1.15, 0.9, 1.5); ban.rotation.z = 1.2; g.add(ban);
  },

  pikachou(g) {
    S(g, 0.75, 0xffd21f, 0, 0.5, -0.1, [1, 1.1, 0.9]);
    B(g, 1.1, 0.12, 0.05, 0x6b3a12, 0, 0.7, -0.6); B(g, 1.0, 0.12, 0.05, 0x6b3a12, 0, 0.4, -0.6);  // rayures dos
    arms(g, 0xffd21f, 0xffd21f, 0.6, 0.45);
    S(g, 0.9, 0xffd21f, 0, 1.75, 0.05, [1.08, 0.95, 1], 10);
    for (const s of [-1, 1]) {
      S(g, 0.2, 0xe8202a, s * 0.72, 1.5, 0.55, [1, 1, 0.4], 6);                     // joues
      eyeBasic(g, s * 0.36, 1.95, 0.88, 0.2, 0.28); eyeBasic(g, s * 0.34, 2.02, 0.93, 0.07, 0.09, 0xffffff);
      const ear = B(g, 0.32, 1.3, 0.14, 0xffd21f, s * 0.55, 2.85, -0.05, [0, 0, s * -0.3]);
      B(g, 0.34, 0.4, 0.16, 0x111111, s * 0.72, 3.4, -0.05, [0, 0, s * -0.3]);       // bouts noirs
    }
    S(g, 0.07, 0x000000, 0, 1.7, 0.98, [1, 0.8, 0.5], 4); B(g, 0.32, 0.06, 0.06, 0x000000, 0, 1.52, 0.95);
    // queue éclair
    const tail = new THREE.Group(); tail.position.set(0, 0.6, -0.8);
    B(tail, 0.3, 0.5, 0.15, 0x6b3a12, 0, 0, 0);
    B(tail, 0.35, 0.8, 0.15, 0xffd21f, 0.25, 0.6, 0, [0, 0, -0.5]); B(tail, 0.35, 0.8, 0.15, 0xffd21f, -0.15, 1.2, 0, [0, 0, 0.5]);
    B(tail, 0.9, 0.7, 0.15, 0xffd21f, 0.1, 1.9, 0);
    g.add(tail);
    g.userData.update = (t) => { tail.rotation.z = Math.sin(t * 9) * 0.25; };
  },

  lynk(g) {
    B(g, 1.2, 1.2, 0.8, 0x3f9d2f, 0, 0.6, -0.1); B(g, 1.25, 0.18, 0.85, 0x6b3a12, 0, 0.3, -0.1); B(g, 0.22, 0.22, 0.1, 0xffd23a, 0, 0.3, 0.34);
    arms(g, 0x3f9d2f, 0xffc9a0, 0.7);
    S(g, 0.72, 0xffc9a0, 0, 1.75, 0, [1, 1, 1], 10);
    for (const s of [-1, 1]) {
      eyeBasic(g, s * 0.26, 1.85, 0.68, 0.16, 0.42, 0x1f5fd0); eyeBasic(g, s * 0.26, 1.95, 0.72, 0.06, 0.1, 0xffffff);
      C(g, 0.16, 0.8, 0xffc9a0, s * 0.85, 1.85, -0.1, [0, 0, s * -1.35]);                // oreilles pointues
    }
    B(g, 0.9, 0.34, 0.34, 0xe6c24a, 0, 2.15, 0.62);                                       // frange
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.78, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(0xe6c24a)); hair.position.set(0, 1.78, -0.12); g.add(hair);
    const hat = C(g, 0.8, 2.4, 0x3f9d2f, 0, 2.4, -0.55, [-1.05, 0, 0], 8);                 // grand bonnet
    S(g, 0.2, 0xffffff, 0, 1.55, -2.0);
    B(g, 0.7, 0.9, 0.12, 0x2b59d6, 0, 0.9, -0.62); B(g, 0.22, 0.4, 0.14, 0xd8232a, 0, 0.9, -0.66);  // bouclier dans le dos
    B(g, 0.14, 1.3, 0.1, 0xc0c8d0, 0.5, 1.5, -0.62, [0, 0, -0.25]); B(g, 0.4, 0.1, 0.12, 0xffd23a, 0.4, 0.95, -0.62, [0, 0, -0.25]);
    g.userData.update = (t, k) => { hat.rotation.x = -1.05 - Math.min(0.5, Math.max(0, k.speed) / 90) + Math.sin(t * 6) * 0.03; };
  },

  kirbi(g) {
    const body = S(g, 1.25, 0xff9fc0, 0, 0.9, -0.1, [1, 1, 1], 10);
    for (const s of [-1, 1]) {
      S(g, 0.35, 0xff9fc0, s * 1.15, 0.5, 0.4, [1, 1, 1], 6);                                // bras ballon
      S(g, 0.55, 0xd8232a, s * 0.6, -0.3, 0.9, [1, 0.5, 1.4], 6);                            // pieds
      eyeBasic(g, s * 0.34, 1.35, 1.12, 0.3, 0.62, 0x111133);
      eyeBasic(g, s * 0.34, 1.3, 1.16, 0.2, 0.38, 0x2a5fe0); eyeBasic(g, s * 0.34, 1.55, 1.2, 0.2, 0.2, 0xffffff);
      S(g, 0.22, 0xff5a80, s * 0.8, 0.85, 0.95, [1, 0.6, 0.4], 5);                          // joues
    }
    B(g, 0.2, 0.14, 0.08, 0xc0102a, 0, 0.78, 1.2);                                        // petite bouche
    g.userData.update = (t, k) => { const sq = 1 + Math.sin(t * (6 + Math.max(0, k.speed) * 0.1)) * 0.04; body.scale.set(1 / sq, sq, 1 / sq); };
  },

  bowzer(g) {
    g.scale.setScalar(1.22);
    B(g, 1.7, 1.2, 1.1, 0xf2c84a, 0, 0.55, 0.0);
    const shell = S(g, 1.15, 0x2a8a2a, 0, 1.0, -0.8, [1.1, 1, 0.7], 8); shell.userData.shell = 1;
    Y(g, 1.3, 1.3, 0.3, 0xe8e0c0, 0, 0.9, -0.55, [Math.PI / 2 - 0.2, 0, 0], 10);
    for (const [x, y] of [[0, 1.95], [-0.7, 1.6], [0.7, 1.6], [-0.35, 1.0], [0.35, 1.0]]) C(g, 0.22, 0.7, 0xf4f1e6, x, y, -1.15, [-1.0, 0, 0]);   // pointes
    arms(g, 0xf2c84a, 0xf2c84a, 1.0, 0.5, 1.5);
    for (const s of [-1, 1]) B(g, 0.5, 0.5, 0.5, 0x333333, s * 1.0, 0.35, 0.95);        // bracelets
    S(g, 0.85, 0xf2c84a, 0, 1.95, 0.15, [1.1, 1, 1], 10);
    S(g, 0.55, 0x8fbf3a, 0, 1.65, 0.75, [1.1, 0.75, 0.9]);                                // museau
    for (const s of [-1, 1]) {
      S(g, 0.09, 0x222222, s * 0.2, 1.75, 1.2, [1, 1, 0.5], 4);
      B(g, 0.14, 0.2, 0.1, 0xffffff, s * 0.3, 1.38, 1.05);                                // crocs
      C(g, 0.16, 0.7, 0xf4f1e6, s * 0.7, 2.75, 0.05, [0, 0, s * -0.4]);                   // cornes
      eyeBasic(g, s * 0.32, 2.05, 0.92, 0.25, 0.22, 0xffffff); eyeBasic(g, s * 0.32, 2.03, 0.97, 0.1, 0.14, 0xd8232a);
      B(g, 0.42, 0.14, 0.12, 0xb01818, s * 0.32, 2.3, 0.96, [0, 0, s * -0.4]);           // sourcils furieux
    }
    for (let i = 0; i < 4; i++) C(g, 0.28, 0.9, 0xd8232a, (i - 1.5) * 0.35, 2.7, -0.3, [-0.6 - i * 0.05, 0, (i - 1.5) * 0.15]);  // crinière
  },

  pacmaman(g) {
    const top = new THREE.Group(), bot = new THREE.Group(); top.position.set(0, 0.7, -0.6); bot.position.copy(top.position); g.add(top, bot);
    const R = 1.15;
    const t = new THREE.Mesh(new THREE.SphereGeometry(R, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffe61a)); t.position.set(0, 0, 0.6); top.add(t);
    const b = new THREE.Mesh(new THREE.SphereGeometry(R, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0xffe61a)); b.position.set(0, 0, 0.6); bot.add(b);
    const inside = Y(bot, R * 0.98, R * 0.98, 0.05, 0x8a1010, 0, 0.02, 0.6, null, 12);
    for (const s of [-1, 1]) { eyeBasic(top, s * 0.35, 0.75, 1.5, 0.22, 0.4); eyeBasic(top, s * 0.35, 0.85, 1.55, 0.08, 0.1, 0xffffff); }
    S(top, 0.1, 0x222222, 0.7, 0.35, 1.6, [1, 1, 0.5], 4);                                  // grain de beauté
    // noeud rose
    S(top, 0.3, 0xff5fa2, -0.3, 1.3, 0.9, [1.4, 1, 0.8], 6); S(top, 0.3, 0xff5fa2, 0.3, 1.3, 0.9, [1.4, 1, 0.8], 6); S(top, 0.16, 0xd8237a, 0, 1.3, 0.92);
    // petit fantôme remorqué
    const ghost = new THREE.Group(); ghost.position.set(0, 0.9, -3.2);
    S(ghost, 0.75, 0xff2a2a, 0, 0.4, 0, [1, 1, 1], 8); B(ghost, 1.5, 0.7, 1.5, 0xff2a2a, 0, 0, 0);
    for (const s of [-1, 1]) { eyeBasic(ghost, s * 0.3, 0.6, 0.72, 0.3, 0.36, 0xffffff); eyeBasic(ghost, s * 0.3 + 0.05, 0.58, 0.77, 0.14, 0.2, 0x1a3fbf); }
    g.add(ghost);
    g.userData.update = (tm, k) => {
      const open = 0.35 + Math.abs(Math.sin(tm * 9)) * 0.4; top.rotation.x = -open; bot.rotation.x = open;
      ghost.position.y = 0.9 + Math.sin(tm * 4) * 0.25; ghost.position.x = Math.sin(tm * 2.2) * 0.35;
    };
  },
};

export const CHARACTERS = [
  { id: 'mamamia', name: 'Mamamia', from: 'plombier moustachu', color: 0xd8232a, helmet: 0xd8232a, stats: { speed: 1.0, turn: 1.0, weight: 1.0, accel: 1.0, charge: 1.0 },
    tagline: 'Plombier moustachu. Débouche tout sauf ses propres erreurs.',
    quotes: { hit: ['Mamamiaaaa !', 'Mes tuyaux !!', 'Je paie pas ça sur ma facture !'], boost: ['Yahoo… euh, Yahou !', "C'est parti, spaghetti !"], pass: ['Pardon, chantier !', 'Ciao ciao !'], lose: ['Je retourne aux WC.'], win: ["C'est moi le plus fort, ma mère l'a dit !"], item: ['Un champi ? Je le mange pas, promis.'] } },
  { id: 'sonik', name: 'Sonik', from: 'hérisson bleu', color: 0x1e63e6, helmet: 0x1e63e6, stats: { speed: 1.07, turn: 0.95, weight: 0.7, accel: 1.25, charge: 1.0 },
    tagline: "Hérisson bleu allergique aux virages. Tapote du pied en 0,2 s d'attente.",
    quotes: { hit: ['Trop lent, ce pneu !', 'Ça compte pas, je regardais ailleurs.'], boost: ['Gotta go… euh, vite !', "T'as vu ça ? Non, trop rapide."], pass: ["Tu m'attendais ?", 'Salut, je repars.'], lose: ["J'ai pas assez mangé de piments."], win: ['Facile. Je me suis même ennuyé.'], item: ['Ah, un truc pour aller plus vite.'] } },
  { id: 'konk', name: 'Donkey Konk', from: 'gorille cravaté', color: 0x8a4c18, helmet: 0x6b3a12, stats: { speed: 1.03, turn: 0.82, weight: 1.6, accel: 0.9, charge: 1.0 },
    tagline: "Gorille cravaté. Adore les bananes, déteste qu'on les lui lance.",
    quotes: { hit: ['OUH OUH AH AH !', 'Ma cravate !!', 'Qui a mis une banane ici ?!'], boost: ['OUH !', 'Ça sent la banane.'], pass: ['ÉCARTE-TOI, PETIT.', 'Poids lourd, prioritaire.'], lose: ["J'ai faim."], win: ['BANANES POUR TOUS !'], item: ['Banane ? Pour moi ?'] } },
  { id: 'pikachou', name: 'Pikachou', from: 'rongeur électrique', color: 0xffd21f, helmet: 0xffd21f, stats: { speed: 0.98, turn: 1.15, weight: 0.8, accel: 1.1, charge: 1.35 },
    tagline: "Rongeur électrique. Ne sait dire qu'un mot. Le même.",
    quotes: { hit: ['Pika…', 'PIKA-AÏE !', 'Pikachou ! (traduction : ouille)'], boost: ['PIKAAA !', 'Chou !'], pass: ['Pika pika ! (pousse-toi)', 'Chouuu !'], lose: ['Pika… (je veux ma pile)'], win: ['PIKA PIKA PIKAAAA !'], item: ['Pika ?'] } },
  { id: 'lynk', name: 'Lynk', from: 'elfe vert muet', color: 0x3f9d2f, helmet: 0x3f9d2f, stats: { speed: 1.0, turn: 1.08, weight: 1.0, accel: 1.0, charge: 1.15 },
    tagline: 'Elfe vert muet. Sauve des princesses mais pas son embrayage.',
    quotes: { hit: ['HYAAH !', '…!!', 'Hé ! Écoute-moi… ah non.'], boost: ['HYAH !', 'HÉ, LISTEN !'], pass: ['…', 'Hyaah !'], lose: ['(soupir silencieux)'], win: ['*fait le geste de victoire en tenant un objet*'], item: ['*ouvre un coffre*  Tadada-daaa !'] } },
  { id: 'kirbi', name: 'Kirbi', from: 'boule rose gloutonne', color: 0xff9fc0, helmet: 0xff9fc0, stats: { speed: 0.95, turn: 1.2, weight: 0.7, accel: 1.15, charge: 1.1 },
    tagline: "Boule rose gloutonne. Avale tout, y compris ses adversaires (en théorie).",
    quotes: { hit: ['Poyo !?', "Poyo… j'ai mal au ballon."], boost: ['POYO !!', 'Poyoyoyo !'], pass: ['Poyo ! (pardon)', 'Poyoooo !'], lose: ["Poyo… j'ai encore faim."], win: ['POYO POYO POYO !'], item: ['Poyo ? Ça se mange ?'] } },
  { id: 'bowzer', name: 'Bowzer', from: 'roi tortue cracheur', color: 0x2a8a2a, helmet: 0xf2c84a, stats: { speed: 1.05, turn: 0.78, weight: 1.7, accel: 0.85, charge: 1.0 },
    tagline: "Roi tortue colérique. Kidnappe des princesses, oublie de payer le parking.",
    quotes: { hit: ['GRAOUUUH !!', 'C’est TOI qui vas payer ça !', 'JE VAIS TE… euh, aïe.'], boost: ['MOUAHAHA !', 'DEVANT MOI, ROI !'], pass: ['ÉCRASÉ, LE PETIT !', 'Dégage de mon royaume !'], lose: ["Je vais brûler quelque chose. Ça va me calmer."], win: ["MOUAHAHA ! Je l'ai fait sans kidnapper personne !"], item: ['À MOI LA CARAPACE !'] } },
  { id: 'pacmaman', name: 'Pac-Maman', from: 'boule jaune goulue', color: 0xffe61a, helmet: 0xffe61a, stats: { speed: 1.0, turn: 1.0, weight: 0.95, accel: 1.15, charge: 1.0 },
    tagline: "Boule jaune, mange tout sur sa route. Traîne un fantôme en laisse.",
    quotes: { hit: ['Waka waka… aïe.', 'Mon fantôme a tout vu !'], boost: ['WAKA WAKA WAKA !', "J'ai mangé un point !"], pass: ['Waka ! Pardon.', 'Je te grignote !'], lose: ["Le fantôme m'a rattrapée…"], win: ['Waka waka, GAGNÉ !'], item: ['Miam, un fruit !'] } },
];

export function buildCharacter(id) {
  const g = new THREE.Group();
  builders[id](g);
  return g;
}
