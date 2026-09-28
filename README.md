# Slopio Kart 64

Un jeu de kart 3D façon N64, 100 % web (Three.js, aucun build).

- Rendu basse définition (240 px de haut, upscale pixelisé), textures en *nearest*, brouillard, low-poly.
- 6 pilotes (5 IA avec rubber-banding), 3 tours, circuit généré à partir d'une spline.
- Dérapage avec mini-turbos (bleu / orange), plaques turbo, cases à objets (champignon, banane, carapace).
- Musique et bruitages chiptune générés en WebAudio. Clavier, manette et boutons tactiles.

## Lancer

```sh
python3 -m http.server 8000   # ou n'importe quel serveur statique
# puis ouvrir http://localhost:8000
```

`?auto` dans l'URL : le joueur est piloté par l'IA (démo).

## Commandes

| Action | Touches |
| --- | --- |
| Accélérer / freiner | ↑ W / ↓ S |
| Tourner | ← → / A D |
| Déraper (relâcher = turbo) | Espace / Shift |
| Objet | E / Ctrl |
| Recommencer / son | R / M |
