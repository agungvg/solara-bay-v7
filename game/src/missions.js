// Solara Bay v7 — story mission state machine: staged objectives, ram
// targets, on-foot combat, payouts, wanted escalation, dialogue lines.

import { MISSIONS } from './config.js';

export function makeMissions(onEvent) {
  let mission = null;      // active mission object
  let stage = 0;
  let done = false;
  let stageTimer = 0;
  let regentHp = null;     // 0..100 while a ram stage runs
  let enemiesAlive = 0;
  let payoutGiven = false;

  function start(index) {
    mission = MISSIONS[index % MISSIONS.length];
    stage = 0;
    done = false;
    stageTimer = 0;
    regentHp = mission.stages.some((s) => s.kind === 'ram') ? 100 : null;
    enemiesAlive = 0;
    payoutGiven = false;
    onEvent('stage', { mission: mission.name, stage, text: mission.stages[0].text });
    return mission;
  }

  function current() {
    return mission ? mission.stages[stage] : null;
  }

  function stageText() {
    return mission ? mission.stages[stage].text : 'Free roam — press M for a mission';
  }

  // Returns 'advanced' | 'complete' | null. `ctx` carries the live world:
  // player pos, inCar, regent damage dealt this tick, enemies killed.
  function step(dt, ctx) {
    if (!mission || done) return null;
    stageTimer += dt;
    const st = mission.stages[stage];
    const d = Math.hypot(st.x - ctx.x, st.z - ctx.z);
    let advance = false;
    if (st.kind === 'drive' || st.kind === 'escape' || st.kind === 'deliver') {
      advance = d < st.r;
    } else if (st.kind === 'collect') {
      advance = !ctx.inCar && d < st.r;
    } else if (st.kind === 'ram') {
      if (ctx.ramHit) regentHp = Math.max(0, regentHp - ctx.ramHit);
      advance = regentHp <= 0;
    } else if (st.kind === 'combat') {
      advance = ctx.enemiesAlive === 0 && stageTimer > 2;
    }
    if (!advance) return null;
    if (stage + 1 >= mission.stages.length) {
      done = true;
      if (!payoutGiven) { payoutGiven = true; onEvent('complete', { mission: mission.name, payout: mission.payout, stars: mission.stars }); }
      return 'complete';
    }
    stage += 1;
    stageTimer = 0;
    onEvent('stage', { mission: mission.name, stage, text: mission.stages[stage].text });
    return 'advanced';
  }

  function progress(ctx) {
    if (!mission) return 0;
    const st = mission.stages[stage];
    if (!st) return 1;
    if (st.kind === 'ram') return 1 - (regentHp ?? 100) / 100;
    if (st.kind === 'combat') return ctx.enemiesTotal ? 1 - ctx.enemiesAlive / ctx.enemiesTotal : 0;
    const d = Math.hypot(st.x - ctx.x, st.z - ctx.z);
    return Math.max(0, Math.min(1, 1 - d / 160));
  }

  return {
    start, current, stageText, step, progress,
    get mission() { return mission; },
    get stage() { return stage; },
    get done() { return done; },
    get regentHp() { return regentHp; },
    get stageCount() { return mission ? mission.stages.length : 0; },
    setEnemies(n) { enemiesAlive = n; },
  };
}

export function missionObjectiveMarker(mission, stage) {
  if (!mission) return null;
  return mission.stages[stage];
}
