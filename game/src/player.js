// On-foot character with a walk cycle and punch, plus strolling pedestrians.
import * as THREE from 'three';
import { PLAYER } from './config.js';

const skinMat = new THREE.MeshLambertMaterial({ color: 0xe8b088 });
function limb(w, h, d, color) {
  const pivot = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.y = -h / 2; pivot.add(m);
  return pivot;
}
export function makeFigure({ shirt = 0xff5f6d, pants = 0x2b3a67, skin = null } = {}) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), new THREE.MeshLambertMaterial({ color: shirt }));
  torso.position.y = 1.12; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.4), skin || skinMat);
  head.position.y = 1.72; g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.42), new THREE.MeshLambertMaterial({ color: 0x2a1c10 }));
  hair.position.y = 1.95; g.add(hair);
  const armL = limb(0.17, 0.66, 0.17, shirt); armL.position.set(-0.42, 1.44, 0); g.add(armL);
  const armR = limb(0.17, 0.66, 0.17, shirt); armR.position.set(0.42, 1.44, 0); g.add(armR);
  const legL = limb(0.2, 0.78, 0.2, pants); legL.position.set(-0.16, 0.78, 0); g.add(legL);
  const legR = limb(0.2, 0.78, 0.2, pants); legR.position.set(0.16, 0.78, 0); g.add(legR);
  return { group: g, armL, armR, legL, legR };
}
function animateFigure(fig, phase, punchT) {
  const s = Math.sin(phase);
  fig.legL.rotation.x = s * 0.65; fig.legR.rotation.x = -s * 0.65;
  fig.armL.rotation.x = -s * 0.5;
  fig.armR.rotation.x = punchT > 0 ? -1.9 + Math.sin(punchT * 22) * 0.5 : s * 0.5;
}

export class Player {
  constructor(scene) {
    this.fig = makeFigure({ shirt: 0xff7847, pants: 0x27324f });
    this.group = this.fig.group;
    scene.add(this.group);
    this.x = 4; this.z = 88; this.angle = Math.PI; this.phase = 0;
    this.punchT = 0; this.punchHitDone = false; this.moving = false; this.speedNow = 0;
  }
  startPunch() { if (this.punchT <= 0) { this.punchT = 0.32; this.punchHitDone = false; return true; } return false; }
  update(dt, move, world) {
    // move: {x,z} desired world-space direction (unit-ish), sprint flag
    const len = Math.hypot(move.x, move.z);
    this.moving = len > 0.1;
    if (this.moving) {
      const spd = move.sprint ? PLAYER.run : PLAYER.walk;
      this.speedNow = spd;
      const nx = this.x + (move.x / len) * spd * dt;
      const nz = this.z + (move.z / len) * spd * dt;
      const res = world.resolve(nx, nz, PLAYER.radius);
      this.x = res.x; this.z = res.z;
      const target = Math.atan2(move.x, move.z);
      let da = target - this.angle;
      while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      this.angle += da * Math.min(1, dt * 12);
      this.phase += dt * (move.sprint ? 13 : 9.5);
    } else this.speedNow = 0;
    if (this.punchT > 0) this.punchT -= dt;
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.angle;
    animateFigure(this.fig, this.phase, Math.max(0, this.punchT));
  }
}

const PED_COLORS = [0x54c8ff, 0xffd94a, 0x7be495, 0xff8fb3, 0xf2f2f2, 0xb088ff, 0xff9f43, 0x4adede];
export class Pedestrian {
  constructor(scene, rng, world) {
    this.fig = makeFigure({ shirt: PED_COLORS[rng.int(0, PED_COLORS.length - 1)], pants: rng.int(0, 0x888888) });
    this.group = this.fig.group; scene.add(this.group);
    this.axis = rng.chance(0.5) ? 'x' : 'z';
    this.line = rng.pick(world.roadLines);
    this.off = (rng.chance(0.5) ? 9.6 : -9.6);
    this.dir = rng.chance(0.5) ? 1 : -1;
    this.along = rng.range(-170, 170);
    this.phase = rng.range(0, 6);
    this.fleeT = 0; this.fleeX = 0; this.fleeZ = 0; this.down = 0;
    this.syncPos();
  }
  syncPos() {
    if (this.axis === 'x') { this.x = this.along; this.z = this.line + this.off; }
    else { this.x = this.line + this.off; this.z = this.along; }
    this.group.position.set(this.x, this.down > 0 ? -0.55 : 0, this.z);
    this.group.rotation.y = this.angle || 0;
    if (this.down > 0) this.group.rotation.x = -Math.PI / 2.2;
    else this.group.rotation.x = 0;
  }
  scatter(fromX, fromZ) {
    const dx = this.x - fromX, dz = this.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    if (d < 14) { this.fleeT = 1.8; this.fleeX = dx / d; this.fleeZ = dz / d; }
  }
  update(dt, world) {
    if (this.down > 0) { this.down -= dt; this.syncPos(); return; }
    let vx = 0, vz = 0;
    if (this.fleeT > 0) {
      this.fleeT -= dt; vx = this.fleeX * 8; vz = this.fleeZ * 8;
      this.phase += dt * 14;
    } else {
      if (this.axis === 'x') vx = this.dir * 2.1; else vz = this.dir * 2.1;
      this.phase += dt * 7;
      this.along += this.dir * 2.1 * dt;
      if (this.along > 185) this.dir = -1; if (this.along < -185) this.dir = 1;
    }
    if (this.fleeT > 0) {
      const res = world.resolve(this.x + vx * dt, this.z + vz * dt, 0.7);
      this.x = res.x; this.z = res.z;
      if (this.axis === 'x') this.along = this.x; else this.along = this.z;
    }
    this.angle = Math.atan2(vx, vz);
    this.syncPos();
    animateFigure(this.fig, this.phase, 0);
  }
  knockDown() { this.down = 4; }
}
