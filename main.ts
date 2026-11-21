// Solara Bay v7 — entrypoint for make.fun gta6-01 (Node 22, stdlib only).
// It hands the game in: copies game/ and screenshots/ from beside this file
// into the output directory and writes dossier.json with the vendored
// make.fun library, exactly as the kit's program contract asks.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  throw new Error(`solara-bay-v7 main.ts: ${message}`);
}

function countFiles(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    total += entry.isDirectory() ? countFiles(full) : 1;
  }
  return total;
}

function dirBytes(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    total += entry.isDirectory() ? dirBytes(full) : statSync(full).size;
  }
  return total;
}

// Refuse to hand in a game that would fail the gate's own caps, instead of
// letting the scorer be the first to notice.
const gameDir = join(repoRoot, 'game');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
if (statSync(join(gameDir, 'index.html')).size > 1024 * 1024) fail('game/index.html is over 1 MiB');
if (countFiles(gameDir) > 993) fail('game/ holds more than 993 files');
if (dirBytes(gameDir) > 48 * 1024 * 1024) fail('game/ is over 48 MiB');

const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) fail(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
  for (const name of shots) {
    if (statSync(join(shotsDir, name)).size > 256 * 1024) fail(`screenshot ${name} is over 256 KiB`);
  }
} else {
  fail('screenshots/ is missing');
}

mkdirSync(outputDir, { recursive: true });
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// The gate caps the dossier at 1.5 MiB; refuse a handoff that would fail
// it instead of letting the scorer be the first to notice.
const dossierBytes = statSync(join(outputDir, 'dossier.json')).size;
if (dossierBytes > 1572864) fail(`dossier.json is ${dossierBytes} bytes, over the 1.5 MiB gate cap`);

console.log(`solara-bay-v7 handed in: game + ${readdirSync(shotsDir).length} screenshots -> ${outputDir} (dossier ${dossierBytes} bytes)`);
