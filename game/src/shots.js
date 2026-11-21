// Solara Bay v7 — screenshot + playtest staging. Each shot stages the live
// game (real mission, real police, real traffic) from a named preset, then
// the loop runs it forward so the frame is what the game really looks like.

export const SHOTS = {
  cover: {
    mission: 2, stage: 1, wanted: 4, time: 'sunset', radio: 0,
    player: { x: 40, z: 0, heading: Math.PI / 2, inCar: true, speed: 31 },
    // Regent target car ahead on Strand Boulevard, roadblock beyond it
    regent: { x: 72, z: 0, heading: Math.PI / 2 },
    regentHp: 55,
    traffic: 8, peds: 10, heli: true, heliAhead: true, roadblock: true,
    cam: 'chase', note: 'WRECK THE REGENT mid-chase, wanted 4, roadblock ahead',
  },
  chase: {
    mission: 0, stage: 0, wanted: 3, time: 'sunset', radio: 1,
    player: { x: 30, z: 120, heading: Math.PI / 2, inCar: true, speed: 34 },
    traffic: 9, peds: 12, heli: true, heliAhead: true, roadblock: false,
    cam: 'chase', note: 'FIRST SCORE — Strand sprint with SBP on the tail',
  },
  foot: {
    mission: 6, stage: 1, wanted: 2, time: 'day', radio: 2,
    player: { x: -48, z: -44, heading: Math.PI * 0.25, inCar: false, speed: 0 },
    traffic: 4, peds: 8, heli: false, roadblock: false,
    cam: 'foot', enemies: 5, note: 'SAFEHOUSE SIEGE — on foot, named enemies, health bars',
  },
  night: {
    mission: 3, stage: 0, wanted: 5, time: 'night', radio: 0,
    player: { x: 80, z: 80, heading: Math.PI, inCar: true, speed: 28 },
    traffic: 7, peds: 6, heli: true, heliAhead: true, roadblock: true,
    cam: 'chase', note: 'NIGHT SHIFT — wanted 5, checkpoint lights, neon harbor',
  },
  playtest: {
    mission: 0, stage: 0, wanted: 1, time: 'day', radio: 0,
    player: { x: 42.9, z: 120, heading: Math.PI / 2, inCar: true, speed: 8 },
    traffic: 2, peds: 4, heli: false, roadblock: false,
    cam: 'chase', note: 'playtest: mission 0 end-to-end',
  },
};

export function shotNames() { return Object.keys(SHOTS); }

export function parseQuery() {
  const q = new URLSearchParams(window.location.search);
  return {
    shot: q.get('shot') || 'cover',
    seed: Number(q.get('seed') || 1),
    mission: q.get('mission') !== null ? Number(q.get('mission')) : null,
    noshadow: q.get('noshadow') === '1',
    noaa: q.get('noaa') === '1',
  };
}
