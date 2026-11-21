// Solara Bay v7 — vehicles: modeled low-poly cars, police interceptors,
// the Regent target car, and the SBP air unit helicopter.

import * as THREE from 'three';

const PALETTE = {
  player: 0xd23c1e, regent: 0x1e3a5f, taxi: 0xf2c14e, civilian: [0x2e7f9e, 0x7d9e2e, 0xc2c2c2, 0x8c4a7d, 0x3a3a3a],
  police: 0x1a1a1a,
};

function paintTexture(color) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#' + color.toString(16).padStart(6, '0'); g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 0, 64, 10);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildCar(color, opts = {}) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ map: paintTexture(color) });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x14181f });
  // cabin glass is unlit dark so the sunset never washes it tan
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x141c26 });
  const chromeMat = new THREE.MeshLambertMaterial({ color: 0xd8dde2 });

  // lower body + hood + trunk shaping
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.55; g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.4, 0.7), bodyMat);
  nose.position.set(0, 0.48, 2.15); g.add(nose);
  // cabin with glasshouse
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.1), glassMat);
  cabin.position.set(0, 1.12, -0.25); g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 1.9), bodyMat);
  roof.position.set(0, 1.45, -0.25); g.add(roof);
  // bumpers + grille + spoiler
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.22, 0.25), chromeMat);
  bumperF.position.set(0, 0.32, 2.42); g.add(bumperF);
  const bumperR = bumperF.clone(); bumperR.position.z = -2.42; g.add(bumperR);
  if (opts.spoiler) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.5), darkMat);
    wing.position.set(0, 1.05, -2.15); g.add(wing);
  }
  // headlights + taillights (emissive so they read at night)
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const sx of [-0.65, 0.65]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), headMat);
    hl.position.set(sx, 0.62, 2.5); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.08), tailMat);
    tl.position.set(sx, 0.62, -2.5); g.add(tl);
  }
  // wheels: dark cylinders with hubcaps, turned to roll
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.3, 8);
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Group();
    const tyre = new THREE.Mesh(wheelGeo, darkMat);
    tyre.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(hubGeo, chromeMat);
    hub.rotation.z = Math.PI / 2;
    w.add(tyre); w.add(hub);
    w.position.set(wx, 0.36, wz);
    g.add(w); wheels.push(w);
  }
  // police livery: light bar + door stripe
  let lightBar = null;
  if (opts.police) {
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 0.4), darkMat);
    barBase.position.set(0, 1.55, -0.25); g.add(barBase);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.42), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(-0.32, 1.62, -0.25); g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.42), new THREE.MeshBasicMaterial({ color: 0x2255ff }));
    blue.position.set(0.32, 1.62, -0.25); g.add(blue);
    lightBar = { red: red.material, blue: blue.material };
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.22, 3.6),
      new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
    stripe.position.set(0, 0.62, 0); g.add(stripe);
  }
  if (opts.taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xffe14d }));
    sign.position.set(0, 1.56, -0.25); g.add(sign);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return { group: g, wheels, lightBar, color };
}

export function buildHelicopter() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x22262c });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x9fd4e8, transparent: true, opacity: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 4.2), bodyMat);
  body.position.y = 0; g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.4), glassMat);
  nose.position.set(0, -0.1, 2.5); g.add(nose);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 5.2), bodyMat);
  tail.position.set(0, 0.3, -4.4); g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.6, 1.2), bodyMat);
  fin.position.set(0, 1.0, -6.6); g.add(fin);
  // skids
  const skidMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const sx of [-1.1, 1.1]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 4.6), skidMat);
    skid.position.set(sx, -1.35, 0); g.add(skid);
  }
  // main rotor (spins) + tail rotor
  const rotorMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const rotor = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.55), rotorMat);
    blade.rotation.y = i * Math.PI / 2;
    rotor.add(blade);
  }
  rotor.position.y = 1.35; g.add(rotor);
  const tailRotor = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.3), rotorMat);
    blade.rotation.x = i * Math.PI / 2;
    tailRotor.add(blade);
  }
  tailRotor.position.set(-0.5, 0.5, -6.4); g.add(tailRotor);
  // searchlight cone + red beacon
  const spot = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide }));
  spot.position.set(0, -5.5, 1); spot.rotation.x = Math.PI; g.add(spot);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  beacon.position.set(0, 1.1, -1); g.add(beacon);
  return { group: g, rotor, tailRotor, beacon: beacon.material };
}
