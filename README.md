# Solara Bay — an open-world crime game

[![make.fun](https://img.shields.io/badge/make.fun-gta6--01-orange)](https://make.fun)
[![Solara Bay](https://img.shields.io/badge/Solara%20Bay-v7-ff8c00)](https://make.fun)
[![Open World](https://img.shields.io/badge/open%20world-3D-blue)](https://make.fun)

**Solara Bay** is an original open-world crime game built for the
[make.fun](https://make.fun) **Make GTA 6** competition (gta6-01).
A sun-soaked bay city of your own — no Rockstar names, maps, art or music.
Drive the Strand, dodge the SBP, run the crew.

## The city

Kumala Strand, Old Pasaru, Central, Marina, the Heights and the Harbor —
a full road grid with lane-marked asphalt, sidewalks full of pedestrians,
palm-lined beachfront, a wooden pier, and a billboard that says
*SOLARA BAY — VISIT THE STRAND*. Everything is procedural three.js
geometry and runtime canvas textures; the game runs **offline** from
static files under `game/` (three.js is vendored as `three.module.min.js`).

## What is in the game

- **8 story missions, staged objectives** — FIRST SCORE, MARKET SQUEEZE,
  WRECK THE REGENT, NIGHT SHIFT, PIER PRESSURE, STRAND RUN, SAFEHOUSE SIEGE
  and KING TIDE, each with a named giver, dialogue and payout.
- **Wanted level + SBP response** — 6 named police units (KITE-1, CORAL-85,
  CORAL-43, CORAL-48, HERON-2, MARLIN-3) with roles RAMMING / PURSUIT /
  FLANKING and live distances in metres, plus the OSPREY-1 helicopter.
  At wanted 4+ an SBP roadblock goes up: barriers, cones, flashing lights
  and a SBP CHECKPOINT sign.
- **Dense HUD** — mission card with stage bar, police panel, wanted stars,
  cash + rank/XP, 4 weapon slots with ammo, 3 crew ability cards
  (SWAP PLATES / QUICK FIX / EYES OUT), dialogue box with a named speaker,
  district card + live minimap with street grid, district labels, mission
  marker, police blips and player arrow, speed + car name + tune +
  condition bar, and a radio station line.
- **On foot and by car** — steal and drive traffic, ram the Regent,
  fight named enemies on foot (name tags + health bars), save in the browser.
- **Day, sunset and night** — three times of day with matching light, fog
  and neon.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Drive / walk |
| SPACE | Brake |
| E | Enter / exit car |
| F | Shoot (on foot) |
| M | Next mission |
| 1–4 | Weapons |
| Z / X / C | Swap Plates / Quick Fix / Eyes Out |

## Play it

```sh
node serve.ts        # serves game/ at http://localhost:8080
```

Open `game/index.html` in desktop Chrome. No network request is made.

## Screenshots

Four PNGs in `screenshots/` — cover (mid-chase, WRECK THE REGENT),
chase, on-foot siege and night shift — all real renders of the game.

## Entry

Built fresh for gta6-01 round 7. Entry program: `main.ts` (Node 22,
standard library only) copies `game/` + `screenshots/` to `/output` and
writes `dossier.json` with the vendored make.fun library.
