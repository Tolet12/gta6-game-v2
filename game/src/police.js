// Police pursuit: units spawn at road edges scaled by stars, chase and pin the
// player; at 4+ stars they set roadblocks ahead. A close, slow player gets busted.
import * as THREE from 'three';
import { Car } from './vehicles.js';

export class Police {
  constructor(scene, rng) {
    this.scene = scene; this.rng = rng;
    this.units = [];
    this.blocks = [];
    this.bust = 0; // 0..1 busted meter
    this.spawnT = 0;
  }
  desiredUnits(stars) { return stars <= 0 ? 0 : [0, 2, 3, 4, 5, 6][stars]; }
  spawnUnit(world, px, pz) {
    // spawn at a road edge at least 55 units away
    const line = this.rng.pick(world.roadLines);
    const along = THREE.MathUtils.clamp((this.rng.chance(0.5) ? px : pz) + this.rng.range(60, 90) * (this.rng.chance(0.5) ? 1 : -1), -185, 185);
    const horiz = this.rng.chance(0.5);
    const car = new Car(this.scene, { x: horiz ? along : line, z: horiz ? line : along, police: true, rng: this.rng });
    car.ai = null;
    this.units.push(car);
    return car;
  }
  clearBlocks() {
    for (const b of this.blocks) this.scene.remove(b.group);
    this.blocks = [];
  }
  setupRoadblock(world, px, pz, pAngle) {
    this.clearBlocks();
    if (this.rng) { /* deterministic-ish placement ahead of the player */ }
    const ahead = 46;
    let bx = px + Math.sin(pAngle) * ahead, bz = pz + Math.cos(pAngle) * ahead;
    // snap to nearest road line so the block sits across a road
    const snap = (v) => world.roadLines.reduce((best, l) => Math.abs(l - v) < Math.abs(best - v) ? l : best, world.roadLines[0]);
    if (Math.abs(Math.sin(pAngle)) > Math.abs(Math.cos(pAngle))) bx = snap(bx); else bz = snap(bz);
    bx = THREE.MathUtils.clamp(bx, -185, 185); bz = THREE.MathUtils.clamp(bz, -185, 185);
    const across = pAngle + Math.PI / 2;
    for (const off of [-3.2, 3.2]) {
      const car = new Car(this.scene, {
        x: bx + Math.sin(across) * off, z: bz + Math.cos(across) * off,
        angle: across + (off < 0 ? 0.35 : -0.35), police: true, rng: this.rng,
      });
      car.speed = 0; this.blocks.push(car);
    }
  }
  update(dt, state, world) {
    const { playerPos, playerSpeed, stars, playerAngle } = state;
    this.spawnT -= dt;
    const want = this.desiredUnits(stars);
    if (stars > 0 && this.units.length < want && this.spawnT <= 0) {
      this.spawnUnit(world, playerPos.x, playerPos.z);
      this.spawnT = 1.6;
    }
    if (stars === 0) {
      // heat gone: units give up and drive off, then despawn far away
      for (const u of this.units) { u.drive(dt, { throttle: 0.5, steer: 0, handbrake: false }, world); }
      this.units = this.units.filter((u) => {
        const d = Math.hypot(u.x - playerPos.x, u.z - playerPos.z);
        if (d > 110) { this.scene.remove(u.group); return false; }
        return true;
      });
      this.clearBlocks();
      this.bust = Math.max(0, this.bust - dt * 0.5);
      return { anySeen: false };
    }
    if (stars >= 4 && this.blocks.length === 0) this.setupRoadblock(world, playerPos.x, playerPos.z, playerAngle);
    if (stars < 4) this.clearBlocks();
    let anySeen = false, closest = 1e9;
    for (const u of this.units) {
      const dx = playerPos.x - u.x, dz = playerPos.z - u.z;
      const dist = Math.hypot(dx, dz);
      closest = Math.min(closest, dist);
      if (dist < 70) anySeen = true;
      const wantAngle = Math.atan2(dx, dz);
      let da = wantAngle - u.angle;
      while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      const steer = THREE.MathUtils.clamp(da * 1.6, -1, 1);
      let throttle = 1;
      if (dist < 7) throttle = 0.15; // pin, don't blast through
      if (dist > 130) { // teleport-catchup keeps pressure on, off-screen
        u.x = playerPos.x - Math.sin(u.angle) * 90; u.z = playerPos.z - Math.cos(u.angle) * 90;
        const res = world.resolve(u.x, u.z, 1.7); u.x = res.x; u.z = res.z;
      }
      const before = { x: u.x, z: u.z };
      u.drive(dt, { throttle, steer, handbrake: false }, world);
      u.x = THREE.MathUtils.clamp(u.x, -198, 198); u.z = THREE.MathUtils.clamp(u.z, -198, 230);
      if (Math.hypot(u.x - before.x, u.z - before.z) < 0.001 && dist > 10) u.angle += dt * 1.2; // unstuck wiggle
    }
    // Busted: a unit stays close while the player is slow or stopped
    if (closest < 9 && playerSpeed < 3.2) this.bust = Math.min(1, this.bust + dt / 2.6);
    else this.bust = Math.max(0, this.bust - dt * 0.6);
    return { anySeen };
  }
  allCars() { return [...this.units, ...this.blocks]; }
  reset() {
    for (const u of this.allCars()) this.scene.remove(u.group);
    this.units = []; this.blocks = []; this.bust = 0;
  }
}
