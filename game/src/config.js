// Solara Bay v7 — world constants, story missions, crew, districts, radio.
// Fresh build for gta6-01 round 7. All names, places and people are original.

export const WORLD = {
  half: 170,            // playable half-extent in metres
  roadEvery: 40,        // grid spacing
  roadWidth: 12,
  sidewalk: 4,
  block: 28,
};

export const DISTRICTS = [
  { name: 'HEIGHTS',  x: -100, z: -100, label: 'Heights' },
  { name: 'MARINA',   x: 100,  z: -100, label: 'Marina' },
  { name: 'CENTRAL',  x: 0,    z: 0,    label: 'Central' },
  { name: 'PASARU',   x: -100, z: 100,  label: 'Old Pasaru' },
  { name: 'HARBOR',   x: 100,  z: 100,  label: 'Harbor' },
  { name: 'STRAND',   x: 140,  z: 0,    label: 'Kumala Strand' },
];

export function districtAt(x, z) {
  let best = DISTRICTS[0];
  let bd = Infinity;
  for (const d of DISTRICTS) {
    const dd = Math.hypot(d.x - x, d.z - z);
    if (dd < bd) { bd = dd; best = d; }
  }
  return best;
}

// 8 story missions. Stage kinds: drive | collect | ram | combat | deliver | escape
export const MISSIONS = [
  {
    id: 0, name: 'FIRST SCORE', chapter: 'CH.1 · HARBOR LIGHTS',
    giver: 'MIRA KESANG', giverRole: 'Crew · Driver',
    brief: 'A courier job that pays in cash and trouble. Pick it up, drop it off, stay loose.',
    payout: 1200, stars: 1,
    stages: [
      { kind: 'drive',   text: 'Drive to the kiosk on Harbor Row', x: 100, z: 120, r: 9 },
      { kind: 'collect', text: 'Pick up the package at the kiosk', x: 104, z: 128, r: 3.5 },
      { kind: 'drive',   text: 'Deliver to the drop at Harbor Gate', x: 120, z: 40, r: 9 },
    ],
    dialogue: 'Easy money, Lyso. Grab the parcel, don’t stop for anyone in a uniform.',
  },
  {
    id: 1, name: 'MARKET SQUEEZE', chapter: 'CH.1 · HARBOR LIGHTS',
    giver: 'LIO TAN', giverRole: 'Crew · Mechanic',
    brief: 'The market crew skimmed our cut. Take the van, take the ledger, take the road.',
    payout: 2400, stars: 2,
    stages: [
      { kind: 'drive',   text: 'Reach the market gate in Central', x: 0, z: 40, r: 9 },
      { kind: 'collect', text: 'Grab the ledger from the stall', x: -4, z: 48, r: 3.5 },
      { kind: 'escape',  text: 'Lose the tail — reach the Marina', x: 120, z: -80, r: 10 },
    ],
    dialogue: 'Ledger’s in the blue stall. If a siren shows up, it was never us.',
  },
  {
    id: 2, name: 'WRECK THE REGENT', chapter: 'CH.3 · HIGH WATER',
    giver: 'MIRA KESANG', giverRole: 'Crew · Driver',
    brief: 'The Regent is running for Kumala Pier with our money. Ram it until it breaks.',
    payout: 5200, stars: 4,
    stages: [
      { kind: 'drive', text: 'Catch the Regent on Strand Boulevard', x: 80, z: 0, r: 12 },
      { kind: 'ram',   text: 'Wreck the Regent — ram it until it breaks', x: 120, z: 0, r: 14 },
      { kind: 'escape', text: 'Lose the heat', x: -80, z: -80, r: 12 },
    ],
    dialogue: 'He’s making for Kumala Pier! Ram the Regent before it reaches the water!',
  },
  {
    id: 3, name: 'NIGHT SHIFT', chapter: 'CH.2 · NEON TIDE',
    giver: 'KIKI RAH', giverRole: 'Crew · Lookout',
    brief: 'Midnight run through the checkpoints. Eyes out, lights low, radio loud.',
    payout: 3100, stars: 5,
    stages: [
      { kind: 'drive',   text: 'Slip past the Harbor checkpoint', x: 120, z: 80, r: 9 },
      { kind: 'collect', text: 'Pick up the crate at the pier', x: 132, z: 96, r: 3.5 },
      { kind: 'escape',  text: 'Vanish into the Heights', x: -120, z: -120, r: 12 },
    ],
    dialogue: 'Checkpoints are up all over Harbor. Thread the gaps and don’t stop.',
  },
  {
    id: 4, name: 'PIER PRESSURE', chapter: 'CH.3 · HIGH WATER',
    giver: 'LIO TAN', giverRole: 'Crew · Mechanic',
    brief: 'The pier crew wants a toll. We don’t pay tolls. We collect them.',
    payout: 3800, stars: 3,
    stages: [
      { kind: 'drive',   text: 'Reach Kumala Pier', x: 140, z: 40, r: 9 },
      { kind: 'combat',  text: 'Clear the pier crew', x: 144, z: 48, r: 12 },
      { kind: 'deliver', text: 'Plant the beacon on the pier end', x: 156, z: 48, r: 6 },
    ],
    dialogue: 'They’ve got the whole pier wired. Clear them out, then plant the beacon.',
  },
  {
    id: 5, name: 'STRAND RUN', chapter: 'CH.2 · NEON TIDE',
    giver: 'MIRA KESANG', giverRole: 'Crew · Driver',
    brief: 'Sunset sprint down the Strand. Fastest crew in the bay takes the purse.',
    payout: 4500, stars: 2,
    stages: [
      { kind: 'drive', text: 'Hit the Strand start line', x: 120, z: -40, r: 9 },
      { kind: 'drive', text: 'Checkpoint: the palms at mid-Strand', x: 140, z: 40, r: 9 },
      { kind: 'drive', text: 'Finish at the Harbor gate', x: 100, z: 120, r: 9 },
    ],
    dialogue: 'Three checkpoints, one sunset, no brakes. Show them what the Pelo GT does.',
  },
  {
    id: 6, name: 'SAFEHOUSE SIEGE', chapter: 'CH.4 · KING TIDE',
    giver: 'KIKI RAH', giverRole: 'Crew · Lookout',
    brief: 'They found the safehouse. Hold the street on foot until the van is loaded.',
    payout: 6100, stars: 4,
    stages: [
      { kind: 'drive',   text: 'Get to the safehouse in Central', x: -40, z: -40, r: 9 },
      { kind: 'combat',  text: 'Hold the street — clear the crew', x: -36, z: -32, r: 14 },
      { kind: 'escape',  text: 'Escort the van to the Marina', x: 120, z: -80, r: 10 },
    ],
    dialogue: 'Six of them on the street, Lyso. On foot. Make every shot count.',
  },
  {
    id: 7, name: 'KING TIDE', chapter: 'CH.4 · KING TIDE',
    giver: 'MIRA KESANG', giverRole: 'Crew · Driver',
    brief: 'The tide is in and so is everyone. One last run across the whole bay.',
    payout: 9000, stars: 5,
    stages: [
      { kind: 'drive',   text: 'Start the run at the Heights', x: -120, z: -120, r: 9 },
      { kind: 'ram',     text: 'Break the blockade on Central Ave', x: 0, z: 0, r: 14 },
      { kind: 'collect', text: 'Grab the tide cache at the pier', x: 152, z: 44, r: 3.5 },
      { kind: 'escape',  text: 'Disappear into the Strand crowd', x: 140, z: -40, r: 12 },
    ],
    dialogue: 'Whole bay’s watching. Drive like the tide itself is chasing you.',
  },
];

export const CREW = [
  { name: 'Mira', role: 'Driver',   ability: 'SWAP PLATES', key: 'Z', color: '#5aa9ff', desc: 'Wanted −1 star' },
  { name: 'Lio',  role: 'Mechanic', ability: 'QUICK FIX',   key: 'X', color: '#ffb347', desc: 'Repair 40% car' },
  { name: 'Kiki', role: 'Lookout',  ability: 'EYES OUT',    key: 'C', color: '#b678ff', desc: 'Reveal police 12s' },
];

export const WEAPONS = [
  { slot: 1, name: 'FISTS',        ammo: '∞',  icon: '✊' },
  { slot: 2, name: '.38 REVOLVER', ammo: 60,   icon: '🔫' },
  { slot: 3, name: 'SMG',          ammo: 90,   icon: '▬▬' },
  { slot: 4, name: '12G PUMP',     ammo: 18,   icon: '▬▬' },
];

export const RADIO = [
  { station: 'RADIO OMBO 98.4', track: 'Tide Runner — Sol Mara' },
  { station: 'STRAND FM 91.2',  track: 'Neon Palms — Kite Club' },
  { station: 'BAY TALK 104.7',  track: 'Harbor Nights — D. Pelan' },
];

export const POLICE_NAMES = [
  { name: 'KITE-1',   role: 'RAMMING' },
  { name: 'CORAL-85', role: 'FLANKING' },
  { name: 'CORAL-43', role: 'FLANKING' },
  { name: 'CORAL-48', role: 'PURSUIT' },
  { name: 'HERON-2',  role: 'PURSUIT' },
  { name: 'MARLIN-3', role: 'RAMMING' },
];

export const PLAYER = {
  name: 'Lyso', rank: 'FIXER', xp: 3900, xpMax: 5000,
  cash: 18450, health: 100, armour: 40,
  carName: 'RUKAN PELO GT', tune: 'TUNE 3 · SPORTS',
};
