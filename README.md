# Slopio Kart 64

Un jeu de kart 3D **comique** façon N64, 100 % web (Three.js, aucun build).

## Lancer

```sh
npm install
npm start   # sert le jeu sur http://localhost:8000 et ouvre le navigateur
```

`?auto` dans l'URL : le joueur est piloté par l'IA (démo).

## Le jeu

- **8 caricatures** modélisées en low-poly, chacune avec ses stats, ses répliques et son animation : Mamamia (plombier moustachu), Sonik (hérisson bleu), Donkey Konk (gorille cravaté), Pikachou (rongeur électrique), Lynk (elfe vert muet), Kirbi (boule rose gloutonne), Bowzer (roi tortue) et Pac-Maman (boule jaune + fantôme en remorque).
- **Objets modélisés** (plus de boules !) : champignon douteux, peau de banane, carapace teigneuse, bombe pas contente, étoile arc-en-ciel. Ils sont portés derrière le kart avant d'être utilisés.
- **Drift retravaillé** : petit saut, glisse contrôlée, braquer vers l'intérieur charge plus vite, 3 niveaux de mini-turbo (bleu / orange / violet), étincelles, fumée, traces de pneus, bruit de gomme, caméra qui se décale.
- **Circuit rigolo** : vaches qui traversent la piste, boulets à dents qui rebondissent, tremplins (garde DRIFT appuyé en l'air pour une figure + turbo), plaques turbo, tribunes au public qui saute, panneaux à blagues, canards et champignons géants, soucoupe volante.
- **Humour partout** : commentateur, répliques des pilotes selon les évènements, klaxon (H), départ fusée, classement final moqueur.
- Rendu 240 px pixelisé, brouillard, textures *nearest*, musique et bruitages chiptune en WebAudio.

## Commandes

| Action | Touches |
| --- | --- |
| Accélérer / freiner | ↑ W / ↓ S |
| Tourner | ← → / A D |
| Déraper (relâcher = turbo) | Espace / Shift |
| Objet | E / Ctrl |
| Klaxon | H |
| Recommencer / son | R / M |

Manette et boutons tactiles supportés.
