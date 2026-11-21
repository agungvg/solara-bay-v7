// Solara Bay v7 — dense HUD: mission card, SBP response panel, wanted
// stars, cash + rank, weapon slots, crew ability cards, dialogue box,
// district card + live minimap (streets, labels, blips, player arrow),
// speed + vehicle + condition, radio line, health/armour.

import { CREW, WEAPONS, RADIO, PLAYER, districtAt } from './config.js';

const $ = (id) => document.getElementById(id);

export function buildHud() {
  const root = document.getElementById('hud');
  root.innerHTML = `
  <div class="panel" id="mission-card">
    <div class="mc-chapter" id="mc-chapter">CH.1 · HARBOR LIGHTS</div>
    <div class="mc-stage" id="mc-stage">STAGE 1/3</div>
    <div class="mc-name" id="mc-name">FIRST SCORE</div>
    <div class="mc-bar"><div id="mc-fill"></div></div>
    <div class="mc-text" id="mc-text">Drive to the kiosk on Harbor Row</div>
    <div class="mc-next" id="mc-next">NEXT Pick up the package</div>
  </div>
  <div class="panel" id="police-panel">
    <div class="pp-head"><span>SBP RESPONSE</span><span id="pp-count">2 UNITS</span></div>
    <div id="pp-rows"></div>
    <div class="pp-foot" id="pp-foot">AIR UNIT DEPLOYED · OSPREY-1 OVERHEAD</div>
  </div>
  <div class="panel" id="district-card">
    <div class="dc-name" id="dc-name">KUMALA STRAND</div>
    <div class="dc-sub" id="dc-sub">Strand Boulevard · Beachfront strip</div>
    <div class="dc-meter"><span>GRIP <b id="dc-grip">58%</b></span><div class="dc-bar"><div id="dc-fill"></div></div></div>
  </div>
  <canvas id="minimap" width="220" height="220"></canvas>
  <div class="panel" id="vitals">
    <div class="vit-row"><span>HEALTH</span><div class="vit-bar"><div id="vit-hp"></div></div><b id="vit-hp-n">100</b></div>
    <div class="vit-row"><span>ARMOUR</span><div class="vit-bar"><div id="vit-ar"></div></div><b id="vit-ar-n">40</b></div>
  </div>
  <div id="cash-box">
    <div class="cb-time" id="cb-time">16:00</div>
    <div class="cb-cash" id="cb-cash">$18,450</div>
    <div class="cb-stars" id="cb-stars">★★★★☆</div>
    <div class="cb-rank">FIXER&nbsp;&nbsp;<span id="cb-xp">3,900 / 5,000 XP</span></div>
    <div class="cb-xpbar"><div id="cb-xpfill"></div></div>
  </div>
  <div id="weapons"></div>
  <div id="crew"></div>
  <div class="panel" id="dialogue">
    <div class="dlg-face" id="dlg-face">MK</div>
    <div><div class="dlg-who"><span id="dlg-name">MIRA KESANG</span> <i id="dlg-role">Crew · Driver</i></div>
    <div class="dlg-text" id="dlg-text">Easy money, Lyso. Grab the parcel, don’t stop for anyone in a uniform.</div></div>
  </div>
  <div id="speed-box">
    <div class="sp-num"><span id="sp-kmh">112</span><span class="sp-unit">KM/H</span></div>
    <div class="sp-car" id="sp-car">RUKAN PELO GT</div>
    <div class="sp-tune" id="sp-tune">TUNE 3 · SPORTS</div>
    <div class="sp-cond"><span>CONDITION</span><div class="sp-bar"><div id="sp-condfill"></div></div><b id="sp-cond">88% CLEAN</b></div>
  </div>
  <div id="radio-line">♪ RADIO OMBO 98.4 — Tide Runner — Sol Mara</div>
  <div id="toast"></div>
  <div id="hint">WASD drive · E enter/exit car · SPACE brake · M mission · 1-4 weapons · Z/X/C crew</div>`;

  const wbox = $('weapons');
  wbox.innerHTML = WEAPONS.map((w) => `
    <div class="wpn ${w.slot === 2 ? 'active' : ''}">
      <div class="wpn-num">${w.slot}</div><div class="wpn-ic">${w.icon}</div>
      <div class="wpn-name">${w.name}</div><div class="wpn-ammo">${w.ammo}</div>
    </div>`).join('');
  const cbox = $('crew');
  cbox.innerHTML = CREW.map((c) => `
    <div class="crew-card">
      <div class="crew-face" style="background:${c.color}">${c.name.slice(0, 1)}</div>
      <div class="crew-body"><b>${c.ability}</b><span>${c.name} · ${c.role}</span><em>${c.desc}</em></div>
      <div class="crew-key">${c.key}</div>
    </div>`).join('');
  return root;
}

const FACE_INITIALS = { 'MIRA KESANG': 'MK', 'LIO TAN': 'LT', 'KIKI RAH': 'KR', 'SBP DISPATCH': 'SB' };

export function updateHud(state) {
  const m = state.mission;
  $('mc-chapter').textContent = m ? m.chapter : 'FREE ROAM · SOLARA BAY';
  $('mc-stage').textContent = m ? `STAGE ${state.stage + 1}/${state.stageCount}` : 'NO MISSION';
  $('mc-name').textContent = m ? m.name : 'SOLARA BAY';
  $('mc-fill').style.width = `${Math.round(state.stageProgress * 100)}%`;
  $('mc-text').textContent = state.stageText;
  $('mc-next').textContent = m && state.stage + 1 < state.stageCount
    ? `NEXT ${m.stages[state.stage + 1].text}` : m ? 'NEXT Finish the job' : 'NEXT Press M to start the story';

  const units = state.police.filter((u) => u.active);
  $('pp-count').textContent = `${units.length} UNITS`;
  $('pp-rows').innerHTML = units.map((u) => `
    <div class="pp-row"><span class="pp-name">${u.name}</span>
    <span class="pp-role ${u.role}">${u.role}</span>
    <span class="pp-dist">${Math.round(u.dist)} m</span></div>`).join('')
    || '<div class="pp-row"><span class="pp-name">—</span><span class="pp-dist">no units near</span></div>';
  $('pp-foot').textContent = state.wanted >= 4
    ? 'ROADBLOCK AHEAD · SBP CHECKPOINT · OSPREY-1 OVERHEAD'
    : 'AIR UNIT DEPLOYED · OSPREY-1 OVERHEAD';

  const d = districtAt(state.player.x, state.player.z);
  $('dc-name').textContent = d.name;
  $('dc-sub').textContent = `${d.label} · Solara Bay`;
  $('dc-grip').textContent = `${state.grip}%`;
  $('dc-fill').style.width = `${state.grip}%`;

  $('cb-time').textContent = state.clock;
  $('cb-cash').textContent = `$${state.cash.toLocaleString('en-US')}`;
  $('cb-stars').textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
  $('cb-stars').style.color = state.wanted >= 4 ? '#ff5a4e' : '#f2c14e';
  $('cb-xp').textContent = `${PLAYER.xp.toLocaleString('en-US')} / ${PLAYER.xpMax.toLocaleString('en-US')} XP`;
  $('cb-xpfill').style.width = `${Math.round((PLAYER.xp / PLAYER.xpMax) * 100)}%`;

  $('vit-hp').style.width = `${state.health}%`;
  $('vit-hp-n').textContent = Math.round(state.health);
  $('vit-ar').style.width = `${state.armour}%`;
  $('vit-ar-n').textContent = Math.round(state.armour);

  $('dlg-name').textContent = state.speaker;
  $('dlg-role').textContent = state.speakerRole;
  $('dlg-text').textContent = state.dialogue;
  $('dlg-face').textContent = FACE_INITIALS[state.speaker] || 'SB';

  $('sp-kmh').textContent = Math.round(Math.abs(state.speedKmh));
  $('sp-car').textContent = state.inCar ? PLAYER.carName : 'ON FOOT';
  $('sp-tune').textContent = state.inCar ? PLAYER.tune : 'STREET · KUMALA STRAND';
  $('sp-condfill').style.width = `${state.condition}%`;
  $('sp-cond').textContent = `${Math.round(state.condition)}% ${state.condition > 60 ? 'CLEAN' : 'DAMAGED'}`;

  const r = RADIO[state.radio % RADIO.length];
  $('radio-line').textContent = `♪ ${r.station} — ${r.track}`;

  drawMinimap(state);
}

function drawMinimap(state) {
  const cv = $('minimap');
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(8,14,22,0.92)'; g.fillRect(0, 0, W, H);
  const half = 170;
  const toPx = (v) => ((v + half) / (half * 2)) * W;
  // water east
  g.fillStyle = '#1d5a78'; g.fillRect(toPx(170), 0, W - toPx(170), H);
  g.fillStyle = '#e8c98f'; g.fillRect(toPx(158), 0, toPx(170) - toPx(158), H);
  // streets
  g.strokeStyle = '#7d8aa0'; g.lineWidth = 3;
  for (let v = -160; v <= 160; v += 40) {
    g.beginPath(); g.moveTo(toPx(v), 0); g.lineTo(toPx(v), H); g.stroke();
    g.beginPath(); g.moveTo(0, toPx(v)); g.lineTo(W, toPx(v)); g.stroke();
  }
  // district labels
  g.fillStyle = '#c8d2de'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center';
  for (const d of [{ n: 'HEIGHTS', x: -100, z: -100 }, { n: 'MARINA', x: 100, z: -100 },
    { n: 'CENTRAL', x: 0, z: 0 }, { n: 'PASARU', x: -100, z: 100 },
    { n: 'HARBOR', x: 100, z: 100 }, { n: 'STRAND', x: 128, z: 0 }]) {
    g.fillText(d.n, toPx(d.x), toPx(d.z));
  }
  // mission marker (yellow diamond)
  if (state.objective) {
    const ox = toPx(state.objective.x), oy = toPx(state.objective.z);
    g.fillStyle = '#f2c14e';
    g.beginPath(); g.moveTo(ox, oy - 8); g.lineTo(ox + 8, oy); g.lineTo(ox, oy + 8); g.lineTo(ox - 8, oy); g.closePath(); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
  }
  // police blips (red/blue)
  for (const u of state.police) {
    if (!u.active) continue;
    g.fillStyle = u.role === 'RAMMING' ? '#ff3a2e' : '#3a7dff';
    g.beginPath(); g.arc(toPx(u.x), toPx(u.z), 4, 0, Math.PI * 2); g.fill();
  }
  // enemies (orange)
  for (const e of state.enemies) {
    g.fillStyle = '#ff8a1a';
    g.beginPath(); g.arc(toPx(e.x), toPx(e.z), 3, 0, Math.PI * 2); g.fill();
  }
  // roadblock marker when wanted >= 4
  if (state.roadblock) {
    g.fillStyle = '#ff2a2a';
    g.fillRect(toPx(state.roadblock.x) - 5, toPx(state.roadblock.z) - 5, 10, 10);
  }
  // player arrow (white triangle, rotated to heading)
  const px = toPx(state.player.x), py = toPx(state.player.z);
  g.save();
  g.translate(px, py); g.rotate(Math.atan2(Math.sin(state.player.heading), Math.cos(state.player.heading)) + Math.PI);
  // canvas y is flipped vs world z: heading maps with sin/cos swap handled by rotate on (x,-z)
  g.restore();
  g.save();
  g.translate(px, py);
  g.rotate(-state.player.heading);
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(0, -8); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill();
  g.strokeStyle = '#111'; g.lineWidth = 1; g.stroke();
  g.restore();
  // north + frame
  g.fillStyle = '#fff'; g.font = 'bold 11px sans-serif'; g.textAlign = 'left';
  g.fillText('N', 8, 14);
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2);
}

export function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
