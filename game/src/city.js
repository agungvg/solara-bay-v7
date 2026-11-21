// Solara Bay v7 — city builder: streets, blocks, towers, palms, beach, pier.
// Everything is procedural three.js geometry + runtime canvas textures.

import * as THREE from 'three';
import { WORLD } from './config.js';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function windowTexture(base, lit) {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 12; y < h - 12; y += 22) {
      for (let x = 10; x < w - 10; x += 18) {
        const on = ((x * 7 + y * 13) % 10) < 5;
        g.fillStyle = on ? lit : 'rgba(20,26,40,0.9)';
        g.fillRect(x, y, 11, 13);
      }
    }
  });
}

function roadTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#33302e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3b3835';
    for (let i = 0; i < 500; i++) g.fillRect((i * 37) % w, (i * 91) % h, 2, 2);
    // edge lines
    g.fillStyle = '#d8d2c4'; g.fillRect(6, 0, 3, h); g.fillRect(w - 9, 0, 3, h);
    // centre dashes
    g.fillStyle = '#f2c14e';
    for (let y = 0; y < h; y += 42) g.fillRect(w / 2 - 2, y, 4, 24);
  });
}

function signTexture(text, sub) {
  return canvasTexture(512, 192, (g, w, h) => {
    g.fillStyle = '#101418'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f2c14e'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#f2c14e'; g.font = 'bold 54px sans-serif';
    g.textAlign = 'center'; g.fillText(text, w / 2, 92);
    g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif';
    g.fillText(sub, w / 2, 148);
  });
}

const BUILDING_COLORS = ['#c98a5e', '#b5774f', '#8f6a72', '#6e7d8c', '#a89a7d', '#7d6a8c', '#946b4a'];
const WINDOW_LIT = ['#ffd98a', '#ffe9b0', '#9fd8ff'];

export function buildCity(scene, opts) {
  const night = !!opts.night;
  const group = new THREE.Group();
  const H = WORLD.half;
  const colliders = []; // {x0,z0,x1,z1} building footprints for the car

  // --- ground: sand base, grass inland, beach east ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(H * 2 + 120, H * 2 + 120),
    new THREE.MeshLambertMaterial({ color: night ? '#2c2f2a' : '#8a7a55' }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(20, -0.05, 0);
  group.add(ground);

  // beach strip + water to the east
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(34, H * 2 + 120),
    new THREE.MeshLambertMaterial({ color: night ? '#4a4234' : '#e8c98f' }),
  );
  sand.rotation.x = -Math.PI / 2; sand.position.set(H + 17, 0, 0);
  group.add(sand);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(160, H * 2 + 200),
    new THREE.MeshLambertMaterial({ color: night ? '#0a1c2e' : '#2e7f9e', transparent: true, opacity: 0.92 }),
  );
  water.rotation.x = -Math.PI / 2; water.position.set(H + 120, 0.02, 0);
  group.add(water);

  // --- road grid: asphalt planes with lane markings + sidewalks ---
  const roadTex = roadTexture();
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
  const walkMat = new THREE.MeshLambertMaterial({ color: night ? '#3a3a38' : '#b9ab8e' });
  const roads = [];
  for (let v = -160; v <= 160; v += WORLD.roadEvery) roads.push(v);
  for (const v of roads) {
    const len = H * 2 + 20;
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(len, WORLD.roadWidth), roadMat.clone());
    ew.material.map = roadTex.clone(); ew.material.map.repeat.set(len / 24, 1);
    ew.material.map.needsUpdate = true;
    ew.rotation.x = -Math.PI / 2; ew.position.set(0, 0.01, v);
    group.add(ew);
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, len), roadMat.clone());
    ns.material.map = roadTex.clone(); ns.material.map.repeat.set(1, len / 24);
    ns.material.map.needsUpdate = true;
    ns.rotation.x = -Math.PI / 2; ns.position.set(v, 0.01, 0);
    group.add(ns);
    // sidewalks: two strips flanking each road
    for (const off of [-1, 1]) {
      const sw1 = new THREE.Mesh(new THREE.PlaneGeometry(len, WORLD.sidewalk), walkMat);
      sw1.rotation.x = -Math.PI / 2; sw1.position.set(0, 0.02, v + off * (WORLD.roadWidth / 2 + WORLD.sidewalk / 2));
      group.add(sw1);
      const sw2 = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.sidewalk, len), walkMat);
      sw2.rotation.x = -Math.PI / 2; sw2.position.set(v + off * (WORLD.roadWidth / 2 + WORLD.sidewalk / 2), 0.02, 0);
      group.add(sw2);
    }
  }

  // --- buildings: one tower per block, windows lit at night ---
  const winTexes = BUILDING_COLORS.map((c, i) => windowTexture(c, WINDOW_LIT[i % 3]));
  let bi = 0;
  for (let gx = -160; gx <= 120; gx += WORLD.roadEvery) {
    for (let gz = -160; gz <= 160; gz += WORLD.roadEvery) {
      if (gx >= 120) continue; // strand: palms + beach, no towers
      const cx = gx + WORLD.roadEvery / 2, cz = gz + WORLD.roadEvery / 2;
      const w = 16 + ((bi * 13) % 8), d = 16 + ((bi * 7) % 8);
      const h = 14 + ((bi * 29) % 46);
      const mat = new THREE.MeshLambertMaterial({ map: winTexes[bi % winTexes.length] });
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      tower.position.set(cx, h / 2, cz);
      group.add(tower);
      // roof cap
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 1.2, d + 1),
        new THREE.MeshLambertMaterial({ color: '#3a3230' }));
      roof.position.set(cx, h + 0.6, cz);
      group.add(roof);
      colliders.push({ x0: cx - w / 2 - 1, z0: cz - d / 2 - 1, x1: cx + w / 2 + 1, z1: cz + d / 2 + 1 });
      bi++;
    }
  }

  // --- palms along the Strand boulevard + scattered in blocks ---
  const trunkMat = new THREE.MeshLambertMaterial({ color: '#6b4a2f' });
  const frondMat = new THREE.MeshLambertMaterial({ color: night ? '#1d4d2a' : '#2f8f4e', side: THREE.DoubleSide });
  const palms = [];
  function palm(x, z, s = 1) {
    const p = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * s, 0.55 * s, 9 * s, 6), trunkMat);
    trunk.position.y = 4.5 * s; trunk.rotation.z = 0.08;
    p.add(trunk);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(1.6 * s, 5.5 * s, 4), frondMat);
      const a = (i / 6) * Math.PI * 2;
      f.position.set(Math.cos(a) * 2.2 * s, 9 * s, Math.sin(a) * 2.2 * s);
      f.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      p.add(f);
    }
    p.position.set(x, 0, z);
    group.add(p); palms.push(p);
    return p;
  }
  for (let z = -140; z <= 160; z += 24) { palm(128, z); palm(152, z + 12, 0.9); }
  for (let i = 0; i < 26; i++) palm(-140 + ((i * 53) % 260), -140 + ((i * 97) % 280), 0.8 + ((i * 7) % 5) / 10);

  // --- Kumala Pier (wooden deck into the water) ---
  const pierMat = new THREE.MeshLambertMaterial({ color: '#7a5c38' });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 10), pierMat);
  pier.position.set(H + 48, 0.6, 48); group.add(pier);
  for (let i = 0; i < 8; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3, 6), pierMat);
    post.position.set(H + 22 + i * 7, 0, 48 + (i % 2 ? 4.5 : -4.5));
    group.add(post);
  }

  // --- billboard: SOLARA BAY, VISIT THE STRAND ---
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 9),
    new THREE.MeshBasicMaterial({ map: signTexture('SOLARA BAY', 'VISIT THE STRAND') }),
  );
  board.position.set(60, 14, -52); board.rotation.y = Math.PI / 4;
  group.add(board);
  const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 10, 6), pierMat);
  post1.position.set(56, 5, -48); group.add(post1);
  const post2 = post1.clone(); post2.position.set(64, 5, -56); group.add(post2);

  // --- roadblock kit (spawned by police.js at wanted >= 4, parked here off-stage) ---
  const roadblock = buildRoadblock();
  roadblock.group.position.set(0, -50, 0); // hidden under ground until deployed
  group.add(roadblock.group);

  scene.add(group);
  return { group, colliders, palms, roadblock };
}

export function buildRoadblock() {
  const group = new THREE.Group();
  const barrierMat = new THREE.MeshLambertMaterial({ color: '#e8e4da' });
  const stripeMat = new THREE.MeshLambertMaterial({ color: '#e23b2e' });
  for (let i = -1; i <= 1; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, 0.5), barrierMat);
    bar.position.set(i * 6, 0.9, 0); group.add(bar);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.35, 0.55), stripeMat);
    stripe.position.set(i * 6, 1.05, 0); group.add(stripe);
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 1.4), barrierMat);
    leg1.position.set(i * 6 - 2.2, 0.45, 0); group.add(leg1);
    const leg2 = leg1.clone(); leg2.position.x = i * 6 + 2.2; group.add(leg2);
  }
  // cones
  const coneMat = new THREE.MeshLambertMaterial({ color: '#ff6a1a' });
  for (let i = 0; i < 6; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 8), coneMat);
    cone.position.set(-12 + i * 4.8, 0.65, i % 2 ? 3.4 : -3.4);
    group.add(cone);
  }
  // flashing light bar on a pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5, 6),
    new THREE.MeshLambertMaterial({ color: '#222' }));
  pole.position.set(9, 2.5, -4); group.add(pole);
  const beaconMat = new THREE.MeshBasicMaterial({ color: '#ff2a2a' });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), beaconMat);
  beacon.position.set(9, 5.3, -4); group.add(beacon);
  // SBP CHECKPOINT sign
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 4),
    new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      map: (() => {
        const c = document.createElement('canvas'); c.width = 512; c.height = 192;
        const g = c.getContext('2d');
        g.fillStyle = '#101418'; g.fillRect(0, 0, 512, 192);
        g.strokeStyle = '#ff2a2a'; g.lineWidth = 8; g.strokeRect(6, 6, 500, 180);
        g.fillStyle = '#ff2a2a'; g.font = 'bold 52px sans-serif'; g.textAlign = 'center';
        g.fillText('SBP CHECKPOINT', 256, 88);
        g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif';
        g.fillText('STOP · ID READY', 256, 148);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
      })(),
    }),
  );
  sign.position.set(0, 5.6, 0); group.add(sign);
  return { group, beacon, beaconMat };
}
