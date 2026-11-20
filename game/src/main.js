// NEON PALMS v2 — boot, fixed-timestep loop, camera, state machine, save/load.
import * as THREE from 'three';
import { World } from './world.js';
import { Car, carColor } from './vehicles.js';
import { Player, Pedestrian } from './player.js';
import { Wanted } from './wanted.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { makeRng, seedFromUrl } from './random.js';
import { SAVE_KEY, MISSIONS } from './config.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1200);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const rng = makeRng(seedFromUrl());
const world = new World(scene, rng);
const input = new Input(canvas);
const audio = new AudioSys();
const hud = new HUD();
const player = new Player(scene);
player.x = world.spawn.x; player.z = world.spawn.z;

const traffic = [], parked = [];
for (let i = 0; i < 7; i++) {
  const c = new Car(scene, { color: carColor(rng), rng });
  c.x = rng.range(-170, 170); c.z = rng.range(-170, 150);
  c.trafficInit(rng, world);
  if (c.ai.axis === 'x') c.x = rng.range(-170, 170); else c.z = rng.range(-170, 150);
  traffic.push(c);
}
const parkSpots = [[63.4, -40], [-56.6, 25], [56.6, 118], [-116.6, -95], [123.4, 66], [-3.4, -152], [56.6, 148]];
for (const [x, z] of parkSpots) {
  const vertical = Math.abs(x % 60) > 20;
  const c = new Car(scene, { x, z, angle: vertical ? Math.PI / 2 : 0, color: carColor(rng), rng });
  c.parked = true; parked.push(c);
}
const peds = [];
for (let i = 0; i < 12; i++) peds.push(new Pedestrian(scene, rng, world));
const wanted = new Wanted();
const police = new Police(scene, rng);
const missions = new Missions(scene, world, rng);

const S = {
  mode: 'title', money: 0, rep: 1, health: 100, missionsDone: 0,
  driving: null, hotCar: null, camYaw: Math.PI, camPitch: 0.32, carCamAngle: 0,
  time: 0, endKind: null, damageCd: 0,
};
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    const save = JSON.parse(raw);
    S.money = save.money | 0; S.rep = save.rep | 0 || 1; S.missionsDone = save.nextMission | 0;
    missions.next = S.missionsDone; missions.finished = !!save.finished;
    missions.showStartMarker();
    document.getElementById('continueBtn').style.display = '';
  }
} catch { /* fresh start */ }
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ money: S.money, rep: S.rep, nextMission: missions.next, finished: missions.finished })); } catch { /* ignore */ }
}

function activePos() { return S.driving ? { x: S.driving.x, z: S.driving.z } : { x: player.x, z: player.z }; }
function activeSpeed() { return S.driving ? Math.abs(S.driving.speed) : player.speedNow; }
function witnessed(x, z) {
  for (const p of peds) if (p.down <= 0 && Math.hypot(p.x - x, p.z - z) < 26) return true;
  for (const u of police.units) if (Math.hypot(u.x - x, u.z - z) < 45) return true;
  return false;
}
function commitCrime(kind, x, z) {
  const w = witnessed(x, z);
  if (wanted.commit(kind, w)) audio.fail();
  return w;
}

missions.hooks = {
  banner: (t, s) => hud.banner(t, s, 4),
  chime: () => audio.chime(),
  setStars: (n) => wanted.setStars(Math.max(wanted.stars, n)),
  raiseStars: (n) => wanted.setStars(Math.max(wanted.stars, n)),
  cashPickup: () => { S.money += 25; audio.chime(); save(); },
  spawnHotCar: (pos) => {
    if (S.hotCar) scene.remove(S.hotCar.group);
    S.hotCar = new Car(scene, { x: pos.x, z: pos.z, angle: 0.4, color: 0xe23b3b, rng });
    S.hotCar.parked = true; parked.push(S.hotCar);
  },
  complete: (def) => {
    const pay = Math.round(def.pay * (1 + 0.1 * (S.rep - 1)));
    S.money += pay; S.missionsDone = missions.next;
    S.rep = Math.min(5, 1 + missions.next);
    audio.success();
    if (missions.finished) hud.banner('MISSION COMPLETE +$' + pay, 'KING OF PALMERA BAY — free roam is yours', 5);
    else hud.banner('MISSION COMPLETE +$' + pay, def.title + ' done — Rep level ' + S.rep, 4.5);
    save();
  },
  fail: (def, reason) => {
    audio.fail();
    hud.banner('MISSION FAILED', reason + ' — return to the blue beacon to retry', 4);
  },
};

function allCars() { return [...traffic, ...parked, ...police.allCars(), ...(S.driving && !traffic.includes(S.driving) && !parked.includes(S.driving) ? [S.driving] : [])]; }
function nearestCar(x, z, maxD) {
  let best = null, bd = maxD;
  for (const c of allCars()) { const d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; best = c; } }
  return best;
}
function enterCar(c) {
  S.driving = c;
  c.parked = false;
  const ti = traffic.indexOf(c); if (ti >= 0) traffic.splice(ti, 1);
  player.group.visible = false;
  if (!c.stolenFlag) { c.stolenFlag = true; commitCrime('theft', c.x, c.z); }
  audio.ensure();
}
function exitCar() {
  const c = S.driving; if (!c) return;
  S.driving = null;
  if (!parked.includes(c)) parked.push(c);
  c.parked = true; c.speed = 0;
  player.x = c.x + Math.cos(c.angle) * 2.6; player.z = c.z - Math.sin(c.angle) * 2.6;
  const res = world.resolve(player.x, player.z, 0.9); player.x = res.x; player.z = res.z;
  player.group.visible = true;
}
function endGame(kind) {
  S.mode = 'ended'; S.endKind = kind;
  const el = document.getElementById('endScr');
  document.getElementById('endTitle').textContent = kind === 'busted' ? 'BUSTED' : 'WASTED';
  document.getElementById('endTitle').style.color = kind === 'busted' ? '#54a8ff' : '#ff5f6d';
  document.getElementById('endStats').innerHTML =
    (kind === 'busted' ? 'The police pinned you. Fine: $150.' : 'You woke up at Palmera General. Bill: $100.') +
    `<br>Money: $${S.money} &nbsp;·&nbsp; Rep: ${S.rep} &nbsp;·&nbsp; Missions done: ${S.missionsDone}/5`;
  el.style.display = 'flex';
  audio.fail();
}
function respawn() {
  document.getElementById('endScr').style.display = 'none';
  if (S.endKind === 'busted') { S.money = Math.max(0, S.money - 150); player.x = world.station.x + 6; player.z = world.station.z; }
  else { S.money = Math.max(0, S.money - 100); player.x = world.hospital.x + 6; player.z = world.hospital.z; }
  if (S.driving) exitCar();
  player.x = THREE.MathUtils.clamp(player.x, -190, 190); player.z = THREE.MathUtils.clamp(player.z, -190, 190);
  S.health = 100; wanted.setStars(0); police.reset();
  S.mode = 'playing'; save();
}
function startGame() {
  document.getElementById('title').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  S.mode = 'playing';
  audio.ensure();
}

let pendingPresses = new Set();
const P = (code) => { const had = pendingPresses.has(code); if (had) pendingPresses.delete(code); return had; };
function step(dt) {
  S.time += dt;
  const playing = S.mode === 'playing';
  if (P('Enter') && S.mode === 'title') startGame();
  if ((P('KeyP') || P('Escape')) && (playing || S.mode === 'paused')) {
    S.mode = S.mode === 'paused' ? 'playing' : 'paused';
    document.getElementById('pauseScr').style.display = S.mode === 'paused' ? 'flex' : 'none';
  }
  if (S.mode === 'ended' && (P('KeyR') || P('Enter'))) respawn();
  if (playing && P('KeyR') && missions.active) {
    const idx = missions.active.idx;
    missions.active = null; missions.showStartMarker();
    hud.banner('MISSION RESTARTED', MISSIONS[idx].title);
    missions.start(idx);
  }
  if (!playing) { world.update(dt, S.time); syncVisuals(); return; }

  // ---- player / driving
  const camForward = { x: Math.sin(S.camYaw), z: Math.cos(S.camYaw) };
  if (S.driving) {
    const c = S.driving;
    const ctrl = {
      throttle: (input.down('KeyW', 'ArrowUp') ? 1 : 0) + (input.down('KeyS', 'ArrowDown') ? -1 : 0) + (S.cruise && !input.down('KeyW', 'ArrowUp', 'KeyS', 'ArrowDown') ? S.cruise : 0),
      steer: (input.down('KeyA', 'ArrowLeft') ? 1 : 0) + (input.down('KeyD', 'ArrowRight') ? -1 : 0),
      handbrake: input.down('Space'),
    };
    const before = Math.abs(c.speed);
    const { crashed } = c.drive(dt, ctrl, world);
    if (crashed > 7) { audio.thud(); hud.flashDamage(); if (crashed > 16) S.health -= 4; }
    audio.engine(Math.abs(c.speed) / 34);
    if (P('KeyE')) exitCar();
    if (c.dead) { S.health -= 30; exitCar(); hud.banner('CAR WRECKED', 'Find another ride'); audio.thud(); }
  } else {
    const f = (input.down('KeyW', 'ArrowUp') ? 1 : 0) + (input.down('KeyS', 'ArrowDown') ? -1 : 0);
    const r = (input.down('KeyD', 'ArrowRight') ? 1 : 0) + (input.down('KeyA', 'ArrowLeft') ? -1 : 0);
    const move = {
      x: camForward.x * f + camForward.z * r,
      z: camForward.z * f - camForward.x * r,
      sprint: input.down('ShiftLeft', 'ShiftRight'),
    };
    player.update(dt, move, world);
    if (P('KeyF') && player.startPunch()) {
      audio.punch();
      for (const p of peds) {
        const dx = p.x - player.x, dz = p.z - player.z;
        if (Math.hypot(dx, dz) < 2.1 && (dx * Math.sin(player.angle) + dz * Math.cos(player.angle)) > 0.2) {
          p.knockDown(); commitCrime('punch', player.x, player.z);
          for (const q of peds) q.scatter(player.x, player.z);
        }
      }
    }
    if (P('KeyE')) {
      const c = nearestCar(player.x, player.z, 4);
      if (c && !c.dead) enterCar(c);
    }
    // hit by a moving car?
    S.damageCd -= dt;
    for (const c of allCars()) {
      if (Math.abs(c.speed) > 5 && Math.hypot(c.x - player.x, c.z - player.z) < 2.4 && S.damageCd <= 0) {
        S.health -= 16; S.damageCd = 0.8; hud.flashDamage(); audio.thud();
        player.x += Math.sin(c.angle) * 3; player.z += Math.cos(c.angle) * 3;
      }
    }
  }

  // ---- traffic
  const everyone = allCars();
  for (const c of traffic) {
    let ahead = 99;
    const fx = Math.sin(c.angle), fz = Math.cos(c.angle);
    for (const o of everyone) {
      if (o === c) continue;
      const dx = o.x - c.x, dz = o.z - c.z;
      const proj = dx * fx + dz * fz, lat = Math.abs(dx * fz - dz * fx);
      if (proj > 0 && proj < ahead && lat < 2.6) ahead = proj;
    }
    if (!S.driving) { const dx = player.x - c.x, dz = player.z - c.z; const proj = dx * fx + dz * fz; if (proj > 0 && proj < ahead && Math.abs(dx * fz - dz * fx) < 2.4) ahead = proj; }
    else if (S.driving) { const dx = S.driving.x - c.x, dz = S.driving.z - c.z; const proj = dx * fx + dz * fz; if (proj > 0 && proj < ahead && Math.abs(dx * fz - dz * fx) < 2.6) ahead = proj; }
    c.trafficUpdate(dt, world, rng, ahead);
  }
  // ---- car-car bumps
  for (let i = 0; i < everyone.length; i++) for (let j = i + 1; j < everyone.length; j++) {
    const a = everyone[i], b = everyone[j];
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d > 0.01 && d < 3.6) {
      const push = (3.6 - d) / 2, ux = dx / d, uz = dz / d;
      const rel = Math.abs(a.speed - b.speed);
      if (!a.parked) { a.x -= ux * push; a.z -= uz * push; }
      if (!b.parked) { b.x += ux * push; b.z += uz * push; }
      if (rel > 5) {
        a.damage(rel * 0.5); b.damage(rel * 0.5);
        if (a === S.driving || b === S.driving) {
          audio.thud(); hud.flashDamage();
          const other = a === S.driving ? b : a;
          if (other.police) commitCrime('hitCop', other.x, other.z);
          if (other.police && rel > 9) S.driving.damage(4);
        }
      }
    }
  }
  // ---- pedestrians
  for (const p of peds) {
    p.update(dt, world);
    if (S.driving && Math.abs(S.driving.speed) > 4) {
      const d = Math.hypot(p.x - S.driving.x, p.z - S.driving.z);
      if (d < 9) p.scatter(S.driving.x, S.driving.z);
      if (d < 1.9 && p.down <= 0) {
        p.knockDown(); commitCrime('hitPed', p.x, p.z);
        S.driving.damage(3); S.driving.speed *= 0.6; audio.thud(); hud.flashDamage();
        for (const q of peds) q.scatter(p.x, p.z);
      }
    }
  }
  // ---- wanted + police
  const pos = activePos();
  const pAngle = S.driving ? S.driving.angle : player.angle;
  const seen = police.update(dt, { playerPos: pos, playerSpeed: activeSpeed(), stars: wanted.stars, playerAngle: pAngle }, world);
  wanted.update(dt, seen.anySeen);
  if (S.starsLock != null) wanted.stars = S.starsLock; // screenshot staging pose
  if (police.bust >= 1) { endGame('busted'); }
  if (S.health <= 0) { S.health = 0; endGame('wasted'); }
  if (S.health < 100 && wanted.stars === 0) S.health = Math.min(100, S.health + dt * 1.6);

  // ---- missions
  missions.update(dt, {
    pos, playing: true, stars: wanted.stars,
    drivingHotCar: !!(S.driving && S.hotCar && S.driving === S.hotCar),
    hotCarDead: !!(S.hotCar && S.hotCar.dead),
  }, S.time);

  // ---- camera orbit input
  if (input.dragging) { S.camYaw -= input.mouseDX * 0.005; S.camPitch = THREE.MathUtils.clamp(S.camPitch + input.mouseDY * 0.003, 0.08, 1.1); }

  world.update(dt, S.time);
  audio.update(dt, !!S.driving, police.units.length > 0);
  syncVisuals();
  updateHUD();
}

function syncVisuals() {
  for (const c of allCars()) c.syncMesh(S.time);
  if (S.driving) player.group.position.set(S.driving.x, -10, S.driving.z);
}
function updateHUD() {
  const pos = activePos();
  const target = missions.currentTarget();
  hud.update(1 / 60, {
    money: S.money, rep: S.rep, stars: wanted.stars,
    health: S.driving ? Math.min(S.health, S.driving.health * 0.4 + S.health * 0.6) : S.health,
    driving: !!S.driving, speed: S.driving ? S.driving.speed : 0,
    objective: missions.objectiveText(),
    missionName: missions.active ? 'MISSION — ' + missions.active.def.title.toUpperCase() : (missions.finished ? 'FREE ROAM' : 'NEXT JOB'),
    targetDist: target ? Math.hypot(pos.x - target.x, pos.z - target.z) : null,
    timer: missions.active ? missions.active.timer : null,
    bust: police.bust, pos, angle: S.driving ? S.driving.angle : player.angle,
    target, traffic: [...traffic, ...parked], police: police.allCars(),
  });
}
function updateCamera(dt) {
  if (S.mode === 'title') {
    const t = S.time * 0.05;
    camera.position.set(Math.sin(t) * 55, 26, 60 + Math.cos(t) * 30);
    camera.lookAt(0, 6, 0);
    camera.fov = 58; camera.updateProjectionMatrix();
    return;
  }
  if (S.driving) {
    const c = S.driving;
    let da = c.angle - S.carCamAngle;
    while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    S.carCamAngle += da * Math.min(1, dt * 4.5);
    const dist = 10.5 + Math.abs(c.speed) * 0.16;
    const tx = c.x - Math.sin(S.carCamAngle) * dist, tz = c.z - Math.cos(S.carCamAngle) * dist;
    camera.position.lerp(new THREE.Vector3(tx, 4.2 + Math.abs(c.speed) * 0.03, tz), Math.min(1, dt * 7));
    camera.lookAt(c.x + Math.sin(c.angle) * 6, 1.4, c.z + Math.cos(c.angle) * 6);
    const targetFov = 62 + Math.min(14, Math.abs(c.speed) * 0.42);
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3);
    camera.updateProjectionMatrix();
  } else {
    const dist = 8.5;
    const tx = player.x - Math.sin(S.camYaw) * dist * Math.cos(S.camPitch);
    const tz = player.z - Math.cos(S.camYaw) * dist * Math.cos(S.camPitch);
    const ty = 1.6 + Math.sin(S.camPitch) * dist;
    camera.position.lerp(new THREE.Vector3(tx, ty, tz), Math.min(1, dt * 10));
    camera.lookAt(player.x, 1.5, player.z);
    camera.fov += (60 - camera.fov) * Math.min(1, dt * 3);
    camera.updateProjectionMatrix();
  }
}

// Test / screenshot handle
const api = {
  state: {
    get mode() { return S.mode; },
    get money() { return S.money; },
    get rep() { return S.rep; },
    get health() { return S.health; },
    get playerPos() { return activePos(); },
    get driving() { return !!S.driving; },
    get speed() { return S.driving ? S.driving.speed : player.speedNow; },
    get wanted() { return wanted.stars; },
    get policeCount() { return police.units.length; },
    get paused() { return S.mode === 'paused'; },
    get mission() { return missions.active ? missions.active.def.id : null; },
    get missionsDone() { return S.missionsDone; },
  },
  world,
  teleport(x, z) { if (S.driving) { S.driving.x = x; S.driving.z = z; } else { player.x = x; player.z = z; } },
  teleportNearCar() {
    const c = parked[0];
    player.x = c.x + 2.5; player.z = c.z + 1;
    return { x: c.x, z: c.z };
  },
  enterNearestCar() { const c = nearestCar(player.x, player.z, 6); if (c) { enterCar(c); return true; } return false; },
  commitCrime(kind = 'theft') { const p = activePos(); return commitCrime(kind, p.x, p.z); },
  setWanted(n) { wanted.setStars(n); },
  startGame, missions, wanted, police, player, traffic, parked, peds,
  giveMoney(n) { S.money += n; },
  spawnCar(x, z, angle, color) {
    const c = new Car(scene, { x, z, angle, color, rng });
    c.parked = true; parked.push(c);
    return c;
  },
  setHealth(n) { S.health = n; },
  internals: S,
};
api.renderer = renderer; api.scene = scene;
window.__neonPalms = api;

const shotName = new URLSearchParams(location.search).get('shot');
if (shotName) {
  applyShot(api, shotName);
  startGame();
}

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('continueBtn').addEventListener('click', startGame);

let last = performance.now(), acc = 0, ready = false;
function frame(now) {
  requestAnimationFrame(frame);
  let elapsed = Math.min(0.34, (now - last) / 1000); last = now;
  pendingPresses = new Set(input.pressedSet); input.pressedSet.clear();
  acc += elapsed;
  const dt = 1 / 60;
  let n = 0;
  while (acc >= dt && n < 20) { step(dt); acc -= dt; n++; }
  if (n === 20) acc = 0;
  updateCamera(elapsed || dt);
  renderer.render(scene, camera);
  input.endFrame();
  if (!ready) { ready = true; window.__gameReady = true; }
}
requestAnimationFrame(frame);
