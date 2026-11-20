// World and gameplay constants for NEON PALMS v2.
export const WORLD = {
  seedDefault: 7,
  block: 60,
  roadHalf: 7,
  grid: 3,
  beachZ: 168,
  bound: 196,
};
export const PLAYER = { walk: 7, run: 11.5, radius: 0.9, health: 100 };
export const CAR = { maxSpeed: 34, maxReverse: 10, accel: 17, brake: 28, turn: 1.85 };
export const MISSIONS = [
  { id: 'm1', title: 'First Run', pay: 150, time: 80, kind: 'checkpoints', count: 4, text: 'Drive through 4 checkpoints across town' },
  { id: 'm2', title: 'Hot Package', pay: 300, time: 95, kind: 'deliver', stars: 2, text: 'Pick up the package, then deliver it across town' },
  { id: 'm3', title: 'Cash Drops', pay: 400, time: 105, kind: 'collect', count: 3, text: 'Collect 3 glowing cash drops before time runs out' },
  { id: 'm4', title: 'The Getaway', pay: 500, time: 130, kind: 'escape', stars: 3, text: 'Reach the hideout, then lose the heat completely' },
  { id: 'm5', title: 'Harbor Finale', pay: 800, time: 160, kind: 'deliverCar', stars: 4, text: 'Deliver the hot car to the marina at the far edge of town' },
];
export const SAVE_KEY = 'neonpalms-save-v2';
export const SHOP_NAMES = ['PALM MART','NEON NOODLES','SURF & COFFEE','TACO SOL','VINYL VAULT','CORAL CUTS','PIZZA PALMERA','GYM LAGOON','BOOK BREEZE','DONUT DOCK'];
export const BILLBOARDS = ['PALMERA COLA','SUNSET RADIO','LAGOON HOTEL','NEON PALMS','CORAL AIR','BAY BURGERS'];
