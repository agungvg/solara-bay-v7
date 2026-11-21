// Solara Bay v7 — SBP police response: 6 named units with roles, live
// distances, pursuit / ramming / flanking steering, and the wanted-4+
// roadblock (barriers, cones, flashing lights, SBP CHECKPOINT sign).

import { POLICE_NAMES } from './config.js';
import { buildCar } from './vehicles.js';

export function makePolice(scene, roadblock) {
  const units = POLICE_NAMES.map((def, i) => {
    const car = buildCar(0x1a1a1a, { police: true });
    scene.add(car.group);
    return {
      ...def, car, x: 0, z: 0, heading: 0, speed: 0,
      dist: 999, active: false, phase: i * 1.7,
    };
  });

  function spawnAround(px, pz, wanted) {
    const n = wanted >= 5 ? 6 : wanted >= 3 ? 5 : wanted >= 2 ? 4 : 2;
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      u.active = i < n;
      if (!u.active) { u.car.group.visible = false; continue; }
      u.car.group.visible = true;
      const a = (i / Math.max(1, n)) * Math.PI * 2 + 0.6;
      const d = 14 + i * 5;
      u.x = px + Math.sin(a) * d;
      u.z = pz + Math.cos(a) * d;
      u.heading = Math.atan2(px - u.x, pz - u.z);
      u.speed = 8 + i;
    }
  }

  function step(dt, player, wanted, time) {
    let anyNear = false;
    for (const u of units) {
      if (!u.active) continue;
      const dx = player.x - u.x, dz = player.z - u.z;
      u.dist = Math.hypot(dx, dz);
      const desired = Math.atan2(dx, dz);
      let err = desired - u.heading;
      while (err > Math.PI) err -= Math.PI * 2;
      while (err < -Math.PI) err += Math.PI * 2;
      // role steering: RAMMING aims dead at the player, FLANKING aims 25 m
      // ahead of the player, PURSUIT trails 8 m behind the player's line.
      let aim = desired;
      if (u.role === 'FLANKING') {
        const fx = player.x + Math.sin(player.heading) * 25;
        const fz = player.z + Math.cos(player.heading) * 25;
        aim = Math.atan2(fx - u.x, fz - u.z);
        err = aim - u.heading;
        while (err > Math.PI) err -= Math.PI * 2;
        while (err < -Math.PI) err += Math.PI * 2;
      }
      const turn = Math.max(-1.9, Math.min(1.9, err * 2.2));
      u.heading += turn * dt;
      const target = u.role === 'RAMMING' ? 26 : u.role === 'FLANKING' ? 22 : 18;
      u.speed += Math.max(-14, Math.min(14, (target - u.speed))) * dt;
      u.x += Math.sin(u.heading) * u.speed * dt;
      u.z += Math.cos(u.heading) * u.speed * dt;
      u.car.group.position.set(u.x, 0, u.z);
      u.car.group.rotation.y = u.heading;
      // light bar strobe, alternating red/blue
      const on = Math.floor(time * 6 + u.phase) % 2 === 0;
      if (u.car.lightBar) {
        u.car.lightBar.red.color.setHex(on ? 0xff2222 : 0x550000);
        u.car.lightBar.blue.color.setHex(on ? 0x111133 : 0x2255ff);
      }
      if (u.dist < 60) anyNear = true;
    }
    // Roadblock: wanted 4+ puts barriers + cones + flashing sign across the
    // road 45 m ahead of the player's heading; below 4 it hides away.
    if (wanted >= 4) {
      const bx = player.x + Math.sin(player.heading) * 45;
      const bz = player.z + Math.cos(player.heading) * 45;
      roadblock.group.position.set(bx, 0, bz);
      roadblock.group.rotation.y = player.heading + Math.PI / 2;
      const flash = Math.floor(time * 4) % 2 === 0;
      roadblock.beaconMat.color.setHex(flash ? 0xff2a2a : 0x881111);
    } else {
      roadblock.group.position.set(0, -50, 0);
    }
    return anyNear;
  }

  return { units, spawnAround, step };
}

export function wantedStars(wanted) {
  return '★'.repeat(wanted) + '☆'.repeat(5 - wanted);
}
