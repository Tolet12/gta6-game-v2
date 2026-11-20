// The 5-mission story chain, beacons, and free-roam cash pickups.
import * as THREE from 'three';
import { MISSIONS } from './config.js';
import { TEX } from './world.js';

function dollarTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1d9e4b'; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill();
  g.strokeStyle = '#bff5cf'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#ffffff'; g.font = 'bold 84px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('$', 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Missions {
  constructor(scene, world, rng) {
    this.scene = scene; this.world = world; this.rng = rng;
    this.next = 0; this.active = null; this.finished = false;
    this.hooks = {};
    // Beacon: glowing pillar + ground ring
    this.beacon = new THREE.Group();
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 26, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd94a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    pillar.position.y = 13; this.beacon.add(pillar);
    this.beaconPillar = pillar;
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd94a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15; this.beacon.add(ring);
    this.beaconRing = ring;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glowWarm, transparent: true, opacity: 0.7, depthWrite: false }));
    glow.scale.set(10, 10, 1); glow.position.y = 2; this.beacon.add(glow);
    scene.add(this.beacon);
    // Free-roam cash pickups
    this.dollarTex = dollarTexture();
    this.pickups = [];
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dollarTex, transparent: true, depthWrite: false }));
      sp.scale.set(2.2, 2.2, 1); scene.add(sp);
      const p = { sprite: sp, x: 0, z: 0 };
      this.placePickup(p); this.pickups.push(p);
    }
    this.showStartMarker();
  }
  placePickup(p) {
    for (let tries = 0; tries < 20; tries++) {
      const x = this.rng.range(-175, 175), z = this.rng.range(-175, 155);
      if (!this.world.blocked(x, z, 2)) { p.x = x; p.z = z; break; }
    }
    p.sprite.position.set(p.x, 1.6, p.z);
  }
  intersections() {
    const pts = [];
    for (const x of this.world.roadLines) for (const z of this.world.roadLines) pts.push({ x, z });
    return pts;
  }
  farPoint(from, minD) {
    const pts = this.intersections().filter((p) => Math.hypot(p.x - from.x, p.z - from.z) > minD);
    return pts[this.rng.int(0, pts.length - 1)];
  }
  showStartMarker() {
    if (this.finished) { this.beacon.visible = false; return; }
    this.beacon.visible = true;
    this.beacon.position.set(this.world.missionStart.x, 0, this.world.missionStart.z);
    this.beaconPillar.material.color.setHex(0x54f0ff);
    this.beaconRing.material.color.setHex(0x54f0ff);
  }
  setBeacon(x, z, color = 0xffd94a) {
    this.beacon.visible = true;
    this.beacon.position.set(x, 0, z);
    this.beaconPillar.material.color.setHex(color);
    this.beaconRing.material.color.setHex(color);
  }
  currentTarget() {
    if (!this.active) return this.finished ? null : { x: this.world.missionStart.x, z: this.world.missionStart.z };
    return this.active.target;
  }
  start(idx) {
    const def = MISSIONS[idx];
    if (!def) return;
    const a = { def, idx, timer: def.time, phase: 'main', step: 0, target: null, targets: [] };
    this.active = a;
    const start = this.world.missionStart;
    if (def.kind === 'checkpoints') {
      let from = start;
      for (let i = 0; i < def.count; i++) { const p = this.farPoint(from, 90); a.targets.push(p); from = p; }
      a.target = a.targets[0];
    } else if (def.kind === 'deliver') {
      a.phase = 'pickup';
      a.target = this.farPoint(start, 70);
      a.deliverTo = { x: this.world.marina.x - 30, z: this.world.marina.z - 46 };
    } else if (def.kind === 'collect') {
      a.targets = [this.farPoint(start, 60), this.farPoint(start, 90), this.farPoint(start, 60)];
      a.target = a.targets[0];
    } else if (def.kind === 'escape') {
      a.phase = 'go';
      a.target = { x: this.world.hideout.x, z: this.world.hideout.z };
      this.hooks.setStars && this.hooks.setStars(def.stars);
    } else if (def.kind === 'deliverCar') {
      a.phase = 'getcar';
      a.target = { x: start.x + 6, z: start.z + 6 };
      this.hooks.spawnHotCar && this.hooks.spawnHotCar(a.target);
    }
    this.setBeacon(a.target.x, a.target.z, def.kind === 'deliverCar' ? 0xff5f6d : 0xffd94a);
    this.hooks.banner && this.hooks.banner(def.title.toUpperCase(), def.text);
    this.hooks.chime && this.hooks.chime();
  }
  fail(reason) {
    if (!this.active) return;
    const def = this.active.def;
    this.active = null;
    this.showStartMarker();
    this.hooks.fail && this.hooks.fail(def, reason);
  }
  complete() {
    const a = this.active; if (!a) return;
    this.active = null;
    this.next = a.idx + 1;
    if (this.next >= MISSIONS.length) this.finished = true;
    this.showStartMarker();
    this.hooks.complete && this.hooks.complete(a.def);
  }
  distTo(pos, t) { return Math.hypot(pos.x - t.x, pos.z - t.z); }
  update(dt, ctx, t) {
    // beacon pulse + pickups spin
    if (this.beacon.visible) {
      const s = 1 + Math.sin(t * 3) * 0.08;
      this.beaconRing.scale.set(s, s, 1);
      this.beaconPillar.material.opacity = 0.3 + Math.sin(t * 3) * 0.08;
    }
    for (const p of this.pickups) {
      p.sprite.position.y = 1.6 + Math.sin(t * 2.4 + p.x) * 0.25;
      if (this.distTo(ctx.pos, p) < 2.6) {
        this.placePickup(p);
        this.hooks.cashPickup && this.hooks.cashPickup();
      }
    }
    if (!this.active) {
      if (!this.finished && this.distTo(ctx.pos, this.world.missionStart) < 4.5 && ctx.playing) {
        this.start(this.next);
      }
      return;
    }
    const a = this.active;
    a.timer -= dt;
    if (a.timer <= 0) { this.fail('Time up'); return; }
    const d = a.target ? this.distTo(ctx.pos, a.target) : 999;
    const def = a.def;
    if (def.kind === 'checkpoints') {
      if (d < 7) {
        a.step++;
        this.hooks.chime && this.hooks.chime();
        if (a.step >= a.targets.length) { this.complete(); return; }
        a.target = a.targets[a.step];
        this.setBeacon(a.target.x, a.target.z);
        this.hooks.banner && this.hooks.banner(`CHECKPOINT ${a.step}/${a.targets.length}`, 'Keep going');
      }
    } else if (def.kind === 'deliver') {
      if (a.phase === 'pickup' && d < 5) {
        a.phase = 'deliver'; a.target = a.deliverTo;
        this.setBeacon(a.target.x, a.target.z, 0xff5f6d);
        this.hooks.setStars && this.hooks.setStars(def.stars);
        this.hooks.banner && this.hooks.banner('PACKAGE ON BOARD', 'Deliver it — the heat is on');
      } else if (a.phase === 'deliver' && d < 7) this.complete();
    } else if (def.kind === 'collect') {
      if (d < 5) {
        a.step++;
        this.hooks.chime && this.hooks.chime();
        this.hooks.raiseStars && this.hooks.raiseStars(Math.min(3, a.step));
        if (a.step >= a.targets.length) { this.complete(); return; }
        a.target = a.targets[a.step];
        this.setBeacon(a.target.x, a.target.z);
        this.hooks.banner && this.hooks.banner(`CASH DROP ${a.step}/${a.targets.length}`, 'Heat is rising');
      }
    } else if (def.kind === 'escape') {
      if (a.phase === 'go' && d < 8) {
        a.phase = 'lose';
        this.hooks.banner && this.hooks.banner('AT THE HIDEOUT', 'Now lose the heat completely');
      } else if (a.phase === 'lose' && ctx.stars === 0 && this.distTo(ctx.pos, this.world.hideout) < 30) {
        this.complete();
      }
    } else if (def.kind === 'deliverCar') {
      if (a.phase === 'getcar') {
        if (ctx.drivingHotCar) {
          a.phase = 'deliver'; a.target = { x: this.world.marina.x, z: this.world.marina.z - 14 };
          this.setBeacon(a.target.x, a.target.z, 0xff5f6d);
          this.hooks.setStars && this.hooks.setStars(def.stars);
          this.hooks.banner && this.hooks.banner('HOT CAR MOVING', 'Get it to the marina');
        }
      } else if (a.phase === 'deliver' && ctx.drivingHotCar && d < 9) this.complete();
      if (ctx.hotCarDead) { this.fail('The hot car was wrecked'); return; }
    }
  }
  objectiveText() {
    if (this.finished) return 'Free roam — King of Palmera Bay';
    if (!this.active) return 'Go to the blue beacon to start: ' + (MISSIONS[this.next] ? MISSIONS[this.next].title : '');
    const a = this.active, def = a.def;
    if (def.kind === 'checkpoints') return `${def.title}: checkpoint ${a.step + 1}/${a.targets.length}`;
    if (def.kind === 'collect') return `${def.title}: drop ${a.step + 1}/${a.targets.length}`;
    if (def.kind === 'deliver') return a.phase === 'pickup' ? `${def.title}: pick up the package` : `${def.title}: deliver the package`;
    if (def.kind === 'escape') return a.phase === 'go' ? `${def.title}: reach the hideout` : `${def.title}: lose the heat near the hideout`;
    if (def.kind === 'deliverCar') return a.phase === 'getcar' ? `${def.title}: take the marked car` : `${def.title}: deliver the car to the marina`;
    return def.title;
  }
}
