// Detailed cars: shaped bodies, steering/spinning wheels, lights, damage smoke.
// Arcade physics plus lane-following traffic AI.
import * as THREE from 'three';
import { CAR } from './config.js';
import { TEX } from './world.js';

const PALETTE = [0xff5f6d, 0xffc93f, 0x3fa7ff, 0x7be495, 0xf2f2f2, 0x9b6bff, 0xff8c42, 0x2ec4b6, 0xe23b3b, 0x445566];
const tireGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
const tireMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1e });
const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.32, 8);
const rimMat = new THREE.MeshLambertMaterial({ color: 0xc8ccd4 });
const glassMat = new THREE.MeshLambertMaterial({ color: 0x18242f });

export class Car {
  constructor(scene, { x = 0, z = 0, angle = 0, color = 0xff5f6d, police = false, rng = null } = {}) {
    this.x = x; this.z = z; this.angle = angle; this.speed = 0;
    this.health = 100; this.police = police; this.steerVis = 0; this.wheelSpin = 0;
    this.braking = false; this.dead = false; this.flashPhase = rng ? rng.range(0, 6) : 0;
    const g = new THREE.Group(); this.group = g;
    const paint = new THREE.MeshLambertMaterial({ color: police ? 0xf4f6f8 : color });
    const dark = new THREE.MeshLambertMaterial({ color: 0x23262b });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.55, 4.3), paint); body.position.y = 0.55; g.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.34, 0.9), paint); nose.position.set(0, 0.48, 2.35); nose.rotation.x = 0.16; g.add(nose);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.4, 0.7), paint); tail.position.set(0, 0.62, -2.3); g.add(tail);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.52, 2.1), glassMat); cabin.position.set(0, 1.05, -0.2); g.add(cabin);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1.7), paint); roof.position.set(0, 1.36, -0.2); g.add(roof);
    const bf = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.3, 0.3), dark); bf.position.set(0, 0.34, 2.62); g.add(bf);
    const bb = bf.clone(); bb.position.z = -2.62; g.add(bb);
    for (const sx of [-0.95, 0.95]) {
      const mir = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.3), paint);
      mir.position.set(sx, 1.05, 0.85); g.add(mir);
    }
    if (police) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.3, 4.32), new THREE.MeshLambertMaterial({ color: 0x2456c8 }));
      stripe.position.y = 0.52; g.add(stripe);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 0.5), dark); bar.position.set(0, 1.52, -0.2); g.add(bar);
      this.lampL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.42), new THREE.MeshBasicMaterial({ color: 0xff2233 }));
      this.lampL.position.set(-0.34, 1.62, -0.2); g.add(this.lampL);
      this.lampR = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.42), new THREE.MeshBasicMaterial({ color: 0x2266ff }));
      this.lampR.position.set(0.34, 1.62, -0.2); g.add(this.lampR);
      this.glowL = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glowPink, color: 0xff3344, transparent: true, opacity: 0.8, depthWrite: false }));
      this.glowL.scale.set(3.4, 2, 1); this.glowL.position.set(-0.5, 1.7, -0.2); g.add(this.glowL);
      this.glowR = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glowCyan, color: 0x3388ff, transparent: true, opacity: 0.8, depthWrite: false }));
      this.glowR.scale.set(3.4, 2, 1); this.glowR.position.set(0.5, 1.7, -0.2); g.add(this.glowR);
    }
    this.headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.08), this.headMat); head.position.set(0, 0.58, 2.72); g.add(head);
    this.brakeMat = new THREE.MeshBasicMaterial({ color: 0x881111 });
    const brake = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.08), this.brakeMat); brake.position.set(0, 0.62, -2.68); g.add(brake);
    const hglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glowWarm, transparent: true, opacity: 0.5, depthWrite: false }));
    hglow.scale.set(3.6, 1.6, 1); hglow.position.set(0, 0.6, 3); g.add(hglow);
    this.wheels = []; this.frontPivots = [];
    for (const [wx, wz, front] of [[-0.95, 1.55, 1], [0.95, 1.55, 1], [-0.95, -1.55, 0], [0.95, -1.55, 0]]) {
      const pivot = new THREE.Group(); pivot.position.set(wx, 0.42, wz);
      const wheel = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, tireMat); tire.rotation.z = Math.PI / 2; wheel.add(tire);
      const rim = new THREE.Mesh(rimGeo, rimMat); rim.rotation.z = Math.PI / 2; wheel.add(rim);
      pivot.add(wheel); g.add(pivot);
      this.wheels.push(wheel); if (front) this.frontPivots.push(pivot);
    }
    this.smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glowWhite, color: 0x555555, transparent: true, opacity: 0, depthWrite: false }));
    this.smoke.scale.set(2.4, 2.4, 1); this.smoke.position.set(0, 1.6, 1.6); g.add(this.smoke);
    this.fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glowWarm, color: 0xff7722, transparent: true, opacity: 0, depthWrite: false }));
    this.fire.scale.set(1.8, 1.8, 1); this.fire.position.set(0, 1.2, 1.9); g.add(this.fire);
    this.syncMesh(0);
    scene.add(g);
  }
  syncMesh(t) {
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.angle;
    this.wheelSpin += this.speed * 0.06;
    for (const w of this.wheels) w.rotation.x = this.wheelSpin;
    for (const p of this.frontPivots) p.rotation.y = this.steerVis;
    this.brakeMat.color.setHex(this.braking ? 0xff2222 : 0x881111);
    if (this.police) {
      const ph = Math.floor(t * 5 + this.flashPhase) % 2 === 0;
      this.lampL.material.color.setHex(ph ? 0xff2233 : 0x551118);
      this.lampR.material.color.setHex(ph ? 0x112255 : 0x2266ff);
      this.glowL.material.opacity = ph ? 0.9 : 0.08;
      this.glowR.material.opacity = ph ? 0.08 : 0.9;
    }
    this.smoke.material.opacity = this.health < 55 && !this.dead ? 0.35 + Math.sin(t * 9) * 0.12 : 0;
    this.smoke.position.y = 1.6 + Math.sin(t * 3) * 0.2;
    this.fire.material.opacity = this.health < 25 && !this.dead ? 0.55 + Math.sin(t * 17) * 0.3 : 0;
  }
  damage(amount) {
    if (this.dead) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) { this.dead = true; this.speed = 0; }
  }
  // Arcade drive. ctrl: {throttle:-1..1, steer:-1..1, handbrake}
  drive(dt, ctrl, world) {
    if (this.dead) { this.speed = 0; return { crashed: 0 }; }
    const prevSpeed = this.speed;
    if (ctrl.throttle > 0) this.speed += CAR.accel * ctrl.throttle * dt * (this.speed < 0 ? 2.2 : 1);
    else if (ctrl.throttle < 0) {
      if (this.speed > 0.5) { this.speed -= CAR.brake * dt; this.braking = true; }
      else this.speed += CAR.accel * 0.55 * ctrl.throttle * dt;
    }
    this.braking = ctrl.throttle < 0 && this.speed > 0.5;
    if (ctrl.handbrake) this.speed -= this.speed * 1.6 * dt;
    this.speed -= this.speed * (ctrl.handbrake ? 0.4 : 0.55) * dt;
    if (!ctrl.throttle) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 2.2 * dt);
    this.speed = THREE.MathUtils.clamp(this.speed, -CAR.maxReverse, CAR.maxSpeed);
    const steerTarget = ctrl.steer * 0.55;
    this.steerVis += (steerTarget - this.steerVis) * Math.min(1, dt * 8);
    const spd = Math.abs(this.speed);
    if (spd > 0.2) {
      const grip = ctrl.handbrake ? 1.7 : 1;
      this.angle += ctrl.steer * CAR.turn * grip * dt * Math.min(1, spd / 9) * Math.sign(this.speed);
    }
    const nx = this.x + Math.sin(this.angle) * this.speed * dt;
    const nz = this.z + Math.cos(this.angle) * this.speed * dt;
    let crashed = 0;
    const res = world.resolve(nx, nz, 1.7);
    if (Math.abs(res.x - nx) > 0.01 || Math.abs(res.z - nz) > 0.01) {
      crashed = Math.abs(prevSpeed);
      if (crashed > 6) this.damage(crashed * 0.9);
      this.speed *= -0.25;
    }
    this.x = res.x; this.z = res.z;
    return { crashed };
  }
  // Traffic: follow a lane around the grid, brake for obstacles ahead.
  trafficInit(rng, world) {
    this.ai = {
      axis: rng.chance(0.5) ? 'x' : 'z',
      dir: rng.chance(0.5) ? 1 : -1,
      line: rng.pick(world.roadLines),
      target: rng.range(10, 15),
    };
    this.placeOnLane();
  }
  placeOnLane() {
    const a = this.ai, off = a.dir > 0 ? 3.4 : -3.4;
    if (a.axis === 'x') { this.z = a.line + off; this.angle = a.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { this.x = a.line + off; this.angle = a.dir > 0 ? 0 : Math.PI; }
  }
  trafficUpdate(dt, world, rng, aheadDist) {
    const a = this.ai; if (!a) return;
    let throttle = 0.6;
    if (aheadDist < 9) throttle = -0.4;
    else if (aheadDist < 15) throttle = 0;
    const atIntersection = world.roadLines.some((l) => Math.abs((a.axis === 'x' ? this.x : this.z) - l) < 2.2);
    if (atIntersection && rng.chance(0.006)) {
      a.axis = a.axis === 'x' ? 'z' : 'x';
      a.line = world.roadLines.reduce((best, l) => Math.abs(l - (a.axis === 'x' ? this.z : this.x)) < Math.abs(best - (a.axis === 'x' ? this.z : this.x)) ? l : best, a.line);
      if (rng.chance(0.4)) a.dir = -a.dir;
      this.placeOnLane();
    }
    const ctrl = { throttle, steer: 0, handbrake: false };
    // steer gently back onto the lane centre
    const off = a.axis === 'x' ? (a.line + (a.dir > 0 ? 3.4 : -3.4)) - this.z : (a.line + (a.dir > 0 ? 3.4 : -3.4)) - this.x;
    ctrl.steer = THREE.MathUtils.clamp(off * 0.12, -0.5, 0.5);
    const want = a.axis === 'x' ? (a.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (a.dir > 0 ? 0 : Math.PI);
    let da = want - this.angle;
    while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    ctrl.steer = THREE.MathUtils.clamp(da * 1.4 + ctrl.steer, -1, 1);
    if (Math.abs(this.speed) > a.target) ctrl.throttle = 0;
    this.drive(dt, ctrl, world);
    if (this.x > 200 || this.x < -200 || this.z > 205 || this.z < -200) {
      this.x = THREE.MathUtils.clamp(this.x, -195, 195); this.z = THREE.MathUtils.clamp(this.z, -195, 200);
      a.dir = -a.dir; this.placeOnLane();
    }
  }
}
export function carColor(rng) { return PALETTE[rng.int(0, PALETTE.length - 1)]; }
