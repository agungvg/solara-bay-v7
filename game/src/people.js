// Solara Bay v7 — people: sidewalk pedestrians (never on road lanes) and
// on-foot enemies with floating name tags + health bars readable at shot scale.

import * as THREE from 'three';

const SHIRTS = [0x3a7d5e, 0xc25e3a, 0x3a5ec2, 0xd8b13a, 0x7d3ac2, 0x2e8f8a, 0xb03a5e, 0x5e6b7a];
const SKINS = [0xe8b88a, 0xc98a5e, 0x8a5a3a, 0xf0c8a0, 0xa06a42];

function tagTexture(lines, opts = {}) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = opts.bar ? 96 : 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(10,12,16,0.82)';
  g.fillRect(0, 0, 256, c.height);
  g.strokeStyle = opts.color || '#f2c14e'; g.lineWidth = 4;
  g.strokeRect(2, 2, 252, c.height - 4);
  g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center';
  g.fillText(lines[0], 128, 40);
  if (opts.bar) {
    g.fillStyle = '#333'; g.fillRect(20, 56, 216, 14);
    g.fillStyle = opts.hpColor || '#3ddc5a';
    g.fillRect(20, 56, 216 * Math.max(0, opts.hp ?? 1), 14);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildPed(seed) {
  const g = new THREE.Group();
  const shirt = SHIRTS[seed % SHIRTS.length];
  const skin = SKINS[(seed * 3) % SKINS.length];
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x2a2f3a });
  // low-poly figure: torso block, legs, arms, head — small in frame, never a hero face
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), shirtMat);
  torso.position.y = 1.05; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.32), skinMat);
  head.position.y = 1.62; g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.34),
    new THREE.MeshLambertMaterial({ color: 0x1a1210 }));
  hair.position.y = 1.82; g.add(hair);
  for (const sx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.68, 0.24), pantsMat);
    leg.position.set(sx, 0.34, 0); g.add(leg);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.18), shirtMat);
    arm.position.set(sx * 2.4, 1.05, 0); g.add(arm);
  }
  return { group: g, seed };
}

// Sidewalk spawn points: offset 8-10 m from a road centreline, i.e. ON the
// sidewalk strip (road half 6 + sidewalk 4 => sidewalk centre at 8 m).
// Peds never spawn on road lanes — target 1 of the polish list.
export function sidewalkSpots(count, rng) {
  const spots = [];
  const roads = [];
  for (let v = -160; v <= 160; v += 40) roads.push(v);
  for (let i = 0; i < count; i++) {
    const alongRoad = rng() < 0.5;
    const road = roads[Math.floor(rng() * roads.length)];
    let along = -150 + rng() * 300;
    // keep clear of intersections: the along-road coordinate must sit at
    // least 10 m from any cross-road centreline, or the ped would stand
    // on asphalt where the two roads cross. Move it to mid-block (r = 20).
    const r = ((along + 160) % 40 + 40) % 40;
    if (Math.min(r, 40 - r) < 10) along += 20 - r;
    // keep the spawn inside the walking bounds so the edge wrap never
    // drops a ped 5 m from the outer road
    along = Math.max(-150, Math.min(150, along));
    const side = rng() < 0.5 ? -1 : 1;
    const off = 8 + rng() * 2.5;
    spots.push(alongRoad ? { x: along, z: road + side * off } : { x: road + side * off, z: along });
  }
  return spots;
}

export function buildEnemy(name, hpMax) {
  const ped = buildPed(2 + name.length);
  const g = ped.group;
  // scale up slightly so enemies read at screenshot scale
  g.scale.setScalar(1.15);
  // nametag + health bar sprite floating above the head
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tagTexture([name], { bar: true, hp: 1, color: '#ff5a4e' }),
    depthTest: true,
  }));
  sprite.scale.set(2.2, 0.83, 1);
  sprite.position.y = 2.9;
  g.add(sprite);
  // red rim so the enemy reads as hostile at a glance
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 24),
    new THREE.MeshBasicMaterial({ color: 0xff3a2e, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
  return {
    group: g, name, hp: hpMax, hpMax, sprite,
    setHp(v) {
      this.hp = Math.max(0, v);
      this.sprite.material.map = tagTexture([this.name], {
        bar: true, hp: this.hp / this.hpMax,
        hpColor: this.hp / this.hpMax > 0.5 ? '#3ddc5a' : '#ff5a4e', color: '#ff5a4e',
      });
      this.sprite.material.needsUpdate = true;
    },
  };
}

export const ENEMY_NAMES = ['VEX', 'RUKO', 'DARA', 'MOSS', 'JUNO', 'TALO'];
