// Solara Bay v7 — main: renderer, sun-soaked city scene, arcade driving,
// on-foot play, traffic, SBP pursuit, missions, HUD wiring, shot staging,
// and the __SOLARA__ debug API the shot/playtest drivers use.

import * as THREE from 'three';
import { WORLD, MISSIONS, PLAYER, districtAt } from './config.js';
import { buildCity } from './city.js';
import { buildCar, buildHelicopter } from './vehicles.js';
import { buildPed, sidewalkSpots, buildEnemy, ENEMY_NAMES } from './people.js';
import { makePolice } from './police.js';
import { makeMissions } from './missions.js';
import { buildHud, updateHud, toast } from './hud.js';
import { makeAudio } from './audio.js';
import { makeInput } from './input.js';
import { SHOTS, parseQuery } from './shots.js';

const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => errors.push('rejection: ' + String(e.reason)));

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TIMES = {
  sunset: { sky: 0xe8965a, fog: 0xe8965a, sun: 0xffd9a0, sunI: 2.2, amb: 0x8a6a5a, ambI: 0.9, clock: '16:00', hemi: 0.55 },
  day:    { sky: 0x87b8d8, fog: 0x9ec4de, sun: 0xfff2cc, sunI: 2.6, amb: 0xbdd3e0, ambI: 1.0, clock: '12:00', hemi: 0.8 },
  night:  { sky: 0x111736, fog: 0x111736, sun: 0x8fb0ff, sunI: 1.0, amb: 0x3a4468, ambI: 0.75, clock: '23:40', hemi: 0.45 },
};

export function boot() {
  const query = parseQuery();
  const preset = SHOTS[query.shot] || SHOTS.cover;
  const rng = mulberry32(query.seed * 7919 + 13);
  const timeCfg = TIMES[preset.time] || TIMES.sunset;

  // --- renderer / scene ---
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !query.noaa });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(timeCfg.sky);
  scene.fog = new THREE.Fog(timeCfg.fog, 90, 420);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  const sun = new THREE.DirectionalLight(timeCfg.sun, timeCfg.sunI);
  sun.position.set(-120, 140, -60);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(timeCfg.sky, 0x3a2f28, timeCfg.hemi));
  scene.add(new THREE.AmbientLight(timeCfg.amb, timeCfg.ambI));
  // headlights: a warm pool of light ahead of the car at night
  const headlight = new THREE.PointLight(0xffe9a0, 0, 55, 1.1);
  scene.add(headlight);
  // low sun disc on the horizon for the sunset shots
  if (preset.time === 'sunset') {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(16, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff0c0, fog: false }));
    disc.position.set(-40, 26, -330); disc.lookAt(0, 26, 0);
    scene.add(disc);
  }

  const city = buildCity(scene, { night: preset.time === 'night' });
  const audio = makeAudio();
  const input = makeInput();
  buildHud();
  // Fit the dense HUD to shorter viewports: the panels are laid out for
  // 720 px tall; zoom scales the whole HUD subtree (layout included) so
  // nothing overlaps at 540 px, while the 3D canvas stays full-size.
  const hudEl = document.getElementById('hud');
  const fitHud = () => { hudEl.style.zoom = String(Math.min(1, window.innerHeight / 720)); };
  fitHud();
  window.addEventListener('resize', fitHud);

  // --- player + player car ---
  const playerCar = buildCar(0xd23c1e, { spoiler: true });
  scene.add(playerCar.group);
  const playerFigure = buildPed(7);
  scene.add(playerFigure.group);
  const player = {
    x: preset.player.x, z: preset.player.z, heading: preset.player.heading,
    speed: preset.player.speed || 0, inCar: preset.player.inCar, health: PLAYER.health, armour: PLAYER.armour,
  };
  let carCondition = 88;
  let cash = PLAYER.cash;
  let wanted = preset.wanted;
  let grip = 58;
  let radio = preset.radio || 0;

  // --- Regent target car (ram missions) ---
  const regent = buildCar(0x1e3a5f, {});
  regent.group.visible = false;
  scene.add(regent.group);
  const regentState = { x: 0, z: 0, heading: 0, speed: 0, active: false };

  // --- traffic: cars cruising the road grid ---
  const traffic = [];
  const civColors = [0x2e7f9e, 0x7d9e2e, 0xc2c2c2, 0x8c4a7d, 0x3a3a3a, 0xf2c14e];
  for (let i = 0; i < preset.traffic; i++) {
    const taxi = i % 4 === 3;
    const car = buildCar(taxi ? 0xf2c14e : civColors[i % civColors.length], { taxi });
    scene.add(car.group);
    const ew = rng() < 0.5;
    const road = -160 + Math.floor(rng() * 9) * 40;
    const lane = (rng() < 0.5 ? -1 : 1) * 3;
    traffic.push({
      car, ew, road, lane,
      pos: -150 + rng() * 300,
      speed: 8 + rng() * 7,
      dir: rng() < 0.5 ? 1 : -1,
    });
  }

  // --- pedestrians: sidewalks only, never road lanes ---
  const peds = [];
  for (const spot of sidewalkSpots(preset.peds, rng)) {
    const ped = buildPed(Math.floor(rng() * 40));
    ped.group.position.set(spot.x, 0, spot.z);
    ped.group.rotation.y = rng() * Math.PI * 2;
    scene.add(ped.group);
    peds.push({ ...ped, x: spot.x, z: spot.z, heading: rng() * Math.PI * 2, speed: 0.8 + rng() * 0.9, ew: rng() < 0.5, dir: rng() < 0.5 ? 1 : -1 });
  }

  // --- helicopter ---
  const heli = buildHelicopter();
  heli.group.visible = !!preset.heli;
  scene.add(heli.group);

  // --- police + roadblock ---
  const police = makePolice(scene, city.roadblock);
  police.spawnAround(player.x, player.z, wanted);

  // --- enemies (combat stages) ---
  let enemies = [];
  function spawnEnemies(cx, cz, n) {
    for (const e of enemies) scene.remove(e.group);
    enemies = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const e = buildEnemy(ENEMY_NAMES[i % ENEMY_NAMES.length], 100);
      const r = 7 + i * 1.5;
      e.group.position.set(cx + Math.sin(a) * r, 0, cz + Math.cos(a) * r);
      e.group.rotation.y = a + Math.PI;
      scene.add(e.group);
      enemies.push({ ...e, x: cx + Math.sin(a) * r, z: cz + Math.cos(a) * r });
    }
  }

  // --- objective marker: light beam + ring at the current objective ---
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  scene.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3, 4.2, 28),
    new THREE.MeshBasicMaterial({ color: 0xf2c14e, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; scene.add(ring);

  // --- missions ---
  let missionDone = false;
  let booting = true; // suppress the stage toast for the opening stage
  let speaker = 'MIRA KESANG';
  let speakerRole = 'Crew · Driver';
  let dialogue = preset.mission !== null ? MISSIONS[preset.mission].dialogue : MISSIONS[0].dialogue;
  const missions = makeMissions((kind, ev) => {
    if (kind === 'stage') {
      dialogue = missions.mission.dialogue;
      speaker = missions.mission.giver; speakerRole = missions.mission.giverRole;
      if (!booting) toast(`STAGE ${ev.stage + 1} — ${ev.text}`);
      audio.blip(880, 0.1);
      if (missions.current() && missions.current().kind === 'combat') spawnEnemies(ev.x ?? missions.current().x, ev.z ?? missions.current().z, preset.enemies || 5);
      if (missions.current() && missions.current().kind === 'ram') {
        regentState.active = true;
        regent.group.visible = true;
        const rp = preset.regent || { x: player.x + 40, z: player.z, heading: player.heading };
        regentState.x = rp.x; regentState.z = rp.z; regentState.heading = rp.heading; regentState.speed = 12;
      }
    }
    if (kind === 'complete') {
      cash += ev.payout;
      missionDone = true;
      wanted = Math.max(1, wanted - 2);
      dialogue = `Job done — $${ev.payout.toLocaleString('en-US')} in the bag. Clean work, Lyso.`;
      toast(`MISSION COMPLETE — $${ev.payout.toLocaleString('en-US')}`);
      audio.sting();
      try { localStorage.setItem('solara-bay-v7-save', JSON.stringify({ cash, xp: PLAYER.xp + 400 })); } catch { /* no storage */ }
    }
  });
  const missionIndex = preset.mission !== null ? preset.mission : (query.mission !== null ? query.mission : 0);
  missions.start(missionIndex);
  wanted = MISSIONS[missionIndex].stars;
  if (preset.wanted) wanted = preset.wanted;
  // jump to the preset stage (drives the real state machine with a staged ctx)
  if (preset.stage > 0) {
    for (let s = 0; s < preset.stage; s++) {
      const cur = missions.current();
      if (!cur) break;
      // collect stages need the player on foot at the pickup
      missions.step(3, { x: cur.x, z: cur.z, inCar: cur.kind !== 'collect', ramHit: 200, enemiesAlive: 0 });
    }
  }
  if (preset.enemies && missions.current() && missions.current().kind === 'combat') {
    spawnEnemies(missions.current().x, missions.current().z, preset.enemies);
  }
  booting = false;
  if (preset.regent && missions.current() && missions.current().kind === 'ram') {
    regentState.active = true; regent.group.visible = true;
    regentState.x = preset.regent.x; regentState.z = preset.regent.z;
    regentState.heading = preset.regent.heading; regentState.speed = 12;
  }
  // cover staging: the Regent is already half-wrecked when the shot opens,
  // so the stage bar reads mid-progress instead of empty.
  if (preset.regentHp && missions.current() && missions.current().kind === 'ram') {
    missions.step(0, { x: player.x, z: player.z, inCar: true, ramHit: 100 - preset.regentHp, enemiesAlive: 0 });
  }
  // foot shot: player starts on foot, car parked nearby
  if (!preset.player.inCar) {
    playerCar.group.position.set(player.x + 6, 0, player.z + 4);
    playerCar.group.rotation.y = player.heading + 0.6;
  }

  // --- title overlay (only when no shot preset is driving) ---
  const overlay = document.getElementById('title');
  let running = true;
  if (!query.shot) {
    running = false;
    overlay.style.display = 'flex';
    document.getElementById('play-btn').addEventListener('click', () => {
      overlay.style.display = 'none'; running = true; audio.startEngine();
    });
  } else {
    overlay.style.display = 'none';
  }

  // --- input actions ---
  input.on('press', (code) => {
    if (code === 'KeyE') {
      if (player.inCar) {
        player.inCar = false;
        playerFigure.group.position.set(player.x + 2, 0, player.z + 1);
        player.speed = 0;
      } else {
        const d = Math.hypot(playerCar.group.position.x - player.x, playerCar.group.position.z - player.z);
        if (d < 4.5) {
          player.inCar = true;
          player.x = playerCar.group.position.x; player.z = playerCar.group.position.z;
          player.heading = playerCar.group.rotation.y;
        }
      }
      audio.blip(440, 0.08);
    }
    if (code === 'KeyM') {
      const next = (missions.mission.id + 1) % MISSIONS.length;
      missionDone = false;
      missions.start(next);
      wanted = MISSIONS[next].stars;
      police.spawnAround(player.x, player.z, wanted);
      dialogue = MISSIONS[next].dialogue;
    }
    if (code === 'KeyZ') { wanted = Math.max(1, wanted - 1); toast('SWAP PLATES — wanted down'); }
    if (code === 'KeyX') { carCondition = Math.min(100, carCondition + 40); toast('QUICK FIX — car repaired'); }
    if (code === 'KeyC') { toast('EYES OUT — police positions revealed'); }
    if (code === 'KeyF' && !player.inCar && enemies.length) {
      // shoot nearest enemy in front
      let best = null; let bd = 14;
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const d = Math.hypot(e.x - player.x, e.z - player.z);
        if (d < bd) { bd = d; best = e; }
      }
      if (best) {
        best.setHp(best.hp - 34);
        audio.blip(180, 0.09, 'square', 0.2);
        if (best.hp <= 0) { best.group.visible = false; toast(`${best.name} down`); }
      }
    }
    if (code.startsWith('Digit')) { radio = (Number(code.slice(5)) - 1) % 3; }
  });
  window.addEventListener('mousedown', () => audio.startEngine(), { once: true });
  window.addEventListener('keydown', () => audio.startEngine(), { once: true });

  // --- physics helpers ---
  function collide(x, z) {
    for (const c of city.colliders) {
      if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return true;
    }
    return false;
  }
  function moveWithCollision(p, nx, nz) {
    if (!collide(nx, p.z)) p.x = nx;
    if (!collide(p.x, nz)) p.z = nz;
    p.x = Math.max(-WORLD.half, Math.min(WORLD.half + 30, p.x));
    p.z = Math.max(-WORLD.half, Math.min(WORLD.half, p.z));
  }

  let gameTime = 0;
  let last = performance.now();
  let hudTick = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    if (!running) { renderer.render(scene, camera); return; }
    gameTime += dt;
    const k = input.keys;

    // --- player movement ---
    if (player.inCar) {
      // staged shots hold a cruise speed (the driver never touches the
      // keys); the playtest shot leaves the throttle to its driver.
      const cruise = (query.shot && query.shot !== 'playtest') ? (preset.player.speed || 0) : 0;
      const autoGas = cruise > 0 && player.speed < cruise && !k.KeyS && !k.ArrowDown;
      const accel = (k.KeyW || k.ArrowUp || autoGas) ? 15 : 0;
      const brake = k.KeyS || k.ArrowDown ? 1 : 0;
      const steer = (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0);
      if (accel) player.speed += accel * dt;
      if (brake) player.speed -= (player.speed > 0 ? 26 : 10) * dt;
      player.speed -= player.speed * 0.55 * dt; // drag
      player.speed = Math.max(-9, Math.min(46, player.speed));
      const turnRate = 1.9 / (1 + Math.abs(player.speed) * 0.09);
      player.heading += steer * turnRate * dt * (player.speed >= 0 ? 1 : -1) * (Math.abs(player.speed) > 0.3 ? 1 : 0);
      const nx = player.x + Math.sin(player.heading) * player.speed * dt;
      const nz = player.z + Math.cos(player.heading) * player.speed * dt;
      const before = { x: player.x, z: player.z };
      moveWithCollision(player, nx, nz);
      if (Math.hypot(player.x - before.x, player.z - before.z) < Math.hypot(nx - before.x, nz - before.z) * 0.5 && Math.abs(player.speed) > 4) {
        player.speed *= 0.4; carCondition = Math.max(20, carCondition - 0.4); // scrape
      }
      playerCar.group.position.set(player.x, 0, player.z);
      playerCar.group.rotation.y = player.heading;
      for (const w of playerCar.wheels) w.rotation.x += player.speed * dt * 2.4;
      // Regent ram: close + fast = damage
      if (regentState.active) {
        const rd = Math.hypot(regentState.x - player.x, regentState.z - player.z);
        if (rd < 4.6 && Math.abs(player.speed) > 5) {
          // ~26 hp per second of hard contact: a few seconds of ramming
          // wrecks the Regent instead of one lucky tap doing it.
          missions.step(dt, { x: player.x, z: player.z, inCar: true, ramHit: 26 * dt, enemiesAlive: enemies.filter((e) => e.hp > 0).length });
          carCondition = Math.max(20, carCondition - 0.25);
        }
      }
    } else {
      const fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
      const strafe = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
      if (fwd || strafe) {
        const a = player.heading;
        const vx = Math.sin(a) * fwd + Math.cos(a) * strafe;
        const vz = Math.cos(a) * fwd - Math.sin(a) * strafe;
        const len = Math.hypot(vx, vz) || 1;
        moveWithCollision(player, player.x + (vx / len) * 5.2 * dt, player.z + (vz / len) * 5.2 * dt);
        player.speed = 5.2;
      } else player.speed = 0;
      if (k.KeyA || k.ArrowLeft) player.heading += 2.4 * dt;
      if (k.KeyD || k.ArrowRight) player.heading -= 2.4 * dt;
      playerFigure.group.position.set(player.x, 0, player.z);
      playerFigure.group.rotation.y = player.heading;
      playerFigure.group.visible = true;
    }
    playerFigure.group.visible = !player.inCar;
    if (player.inCar) playerFigure.group.position.set(player.x, -5, player.z);

    // --- traffic ---
    for (const t of traffic) {
      t.pos += t.speed * t.dir * dt;
      if (t.pos > 165) t.pos = -165;
      if (t.pos < -165) t.pos = 165;
      if (t.ew) { t.car.group.position.set(t.pos, 0, t.road + t.lane); t.car.group.rotation.y = t.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
      else { t.car.group.position.set(t.road + t.lane, 0, t.pos); t.car.group.rotation.y = t.dir > 0 ? 0 : Math.PI; }
      for (const w of t.car.wheels) w.rotation.x += t.speed * dt * 2;
    }

    // --- pedestrians stroll the sidewalks (never across intersections:
    // they turn back 12 m before a cross-road so they never stand on
    // asphalt where the two roads cross) ---
    for (const p of peds) {
      const along = p.ew ? p.x : p.z;
      const r = ((along + 160) % 40 + 40) % 40;
      if (Math.min(r, 40 - r) < 12) p.dir *= -1;
      if (p.ew) { p.x += p.dir * p.speed * dt; if (p.x > 150) p.x = -150; if (p.x < -150) p.x = 150; }
      else { p.z += p.dir * p.speed * dt; if (p.z > 150) p.z = -150; if (p.z < -150) p.z = 150; }
      p.group.position.set(p.x, 0, p.z);
      p.group.rotation.y = p.ew ? (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (p.dir > 0 ? 0 : Math.PI);
    }

    // --- Regent cruises the Strand until wrecked ---
    if (regentState.active && missions.regentHp > 0) {
      regentState.z += 0; // holds its line; moves along +x on the Strand
      regentState.x += regentState.speed * dt;
      if (regentState.x > 160) { regentState.x = 60; }
      regent.group.position.set(regentState.x, 0, regentState.z);
      regent.group.rotation.y = regentState.heading;
      for (const w of regent.wheels) w.rotation.x += regentState.speed * dt * 2;
    }

    // --- helicopter orbits the player (or holds ahead-above for staged shots) ---
    if (heli.group.visible) {
      const a = gameTime * 0.35;
      if (preset.heliAhead) {
        // low and ahead so it sits in the top of the frame, not above it:
        // the chase camera looks ~22° down, so the frame top is ~9° up.
        heli.group.position.set(
          player.x + Math.sin(player.heading) * 36 + Math.cos(player.heading) * 6,
          10,
          player.z + Math.cos(player.heading) * 36 - Math.sin(player.heading) * 6);
      } else {
        heli.group.position.set(player.x + Math.sin(a) * 26, 34 + Math.sin(gameTime * 0.8) * 1.5, player.z + Math.cos(a) * 26);
      }
      heli.group.rotation.y = Math.atan2(player.x - heli.group.position.x, player.z - heli.group.position.z);
      heli.rotor.rotation.y += dt * 22;
      heli.tailRotor.rotation.x += dt * 18;
      heli.beacon.color.setHex(Math.floor(gameTime * 3) % 2 ? 0xff2222 : 0x550000);
    }

    // --- police ---
    police.step(dt, player, wanted, gameTime);

    // --- objective marker ---
    const obj = missions.current();
    if (obj) {
      beam.position.set(obj.x, 13, obj.z);
      beam.material.opacity = 0.28 + 0.12 * Math.sin(gameTime * 3);
      ring.position.set(obj.x, 0.06, obj.z);
      const s = 1 + 0.12 * Math.sin(gameTime * 3);
      ring.scale.set(s, s, 1);
    } else { beam.visible = false; ring.visible = false; }

    // --- mission progress ---
    const alive = enemies.filter((e) => e.hp > 0).length;
    const result = missions.step(dt, {
      x: player.x, z: player.z, inCar: player.inCar,
      ramHit: 0, enemiesAlive: alive,
    });
    if (result === 'complete') missionDone = true;

    // --- camera ---
    const camDist = player.inCar ? 11.5 : 6.5;    const camH = player.inCar ? 4.6 : 3.0;
    const backX = player.x - Math.sin(player.heading) * camDist;
    const backZ = player.z - Math.cos(player.heading) * camDist;
    camera.position.set(backX, camH, backZ);
    camera.lookAt(player.x + Math.sin(player.heading) * 8, player.inCar ? 1.4 : 1.6, player.z + Math.cos(player.heading) * 8);
    if (preset.time === 'night') {
      headlight.intensity = 90;
      headlight.position.set(
        player.x + Math.sin(player.heading) * 9,
        2.5,
        player.z + Math.cos(player.heading) * 9);
    }

    // --- HUD (every other frame) ---
    if (++hudTick % 2 === 0) {
      const d = districtAt(player.x, player.z);
      grip = d.name === 'STRAND' ? 58 : d.name === 'CENTRAL' ? 71 : 64;
      updateHud({
        mission: missions.mission, stage: missions.stage, stageCount: missions.stageCount,
        stageText: missions.stageText(), stageProgress: missions.progress({ x: player.x, z: player.z, enemiesAlive: alive, enemiesTotal: enemies.length }),
        police: police.units.map((u) => ({ name: u.name, role: u.role, dist: u.dist, active: u.active, x: u.x, z: u.z })),
        wanted, cash, health: player.health, armour: player.armour,
        player: { x: player.x, z: player.z, heading: player.heading },
        speedKmh: player.speed * 3.6, inCar: player.inCar, condition: carCondition,
        speaker, speakerRole, dialogue, clock: timeCfg.clock, grip, radio,
        objective: obj ? { x: obj.x, z: obj.z } : null,
        enemies: enemies.filter((e) => e.hp > 0).map((e) => ({ x: e.x, z: e.z })),
        roadblock: wanted >= 4 ? { x: player.x + Math.sin(player.heading) * 45, z: player.z + Math.cos(player.heading) * 45 } : null,
      });
    }
    audio.update(player.speed * 3.6, wanted, running);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- debug / driver API ---
  function pedsOnRoad() {
    // Distance to the nearest road centreline: roads sit at v = -160 + 40k,
    // so the offset inside the 40 m grid cell is r = (p + 160) % 40 and the
    // distance to the nearest centreline is min(r, 40 - r). Sidewalk peds
    // sit 8-10.5 m out, so min distance > 6 means safely off the lanes.
    let n = 0;
    for (const p of peds) {
      const rz = ((p.z + 160) % 40 + 40) % 40;
      const rx = ((p.x + 160) % 40 + 40) % 40;
      const dRoad = Math.min(Math.min(rz, 40 - rz), Math.min(rx, 40 - rx));
      if (dRoad < 6) n++;
    }
    return n;
  }

  window.__SOLARA__ = {
    setKeys: (m) => input.setKeys(m),
    press: (c) => input.press(c),
    state() {
      const obj = missions.current();
      return {
        mode: missionDone ? 'complete' : 'playing',
        mission: missions.mission ? missions.mission.id : -1,
        missionName: missions.mission ? missions.mission.name : null,
        stage: missions.stage,
        missionDone,
        player: { x: +player.x.toFixed(1), z: +player.z.toFixed(1), heading: +player.heading.toFixed(2), speed: +Math.abs(player.speed).toFixed(1), inCar: player.inCar },
        car: { x: +playerCar.group.position.x.toFixed(1), z: +playerCar.group.position.z.toFixed(1) },
        speedSigned: +player.speed.toFixed(2),
        gameTime: +gameTime.toFixed(2),
        objective: obj ? { x: obj.x, z: obj.z, radius: obj.r } : null,
        wanted, cash,
        enemiesAlive: enemies.filter((e) => e.hp > 0).length,
        stageCount: missions.stageCount,
        stageProgress: +missions.progress({ x: player.x, z: player.z, enemiesAlive: enemies.filter((e) => e.hp > 0).length, enemiesTotal: enemies.length }).toFixed(2),
        regentHp: missions.regentHp,
        pedsOnRoad: pedsOnRoad(),
        pedSpots: peds.map((p) => [+p.x.toFixed(1), +p.z.toFixed(1)]),
        police: police.units.filter((u) => u.active).length,
        roadblock: wanted >= 4,
        errors: [...errors],
      };
    },
  };
}
