// The city of Palmera Bay: sky, roads, textured buildings, palms, neon, beach.
// Everything is generated at runtime from canvas textures — no external assets.
import * as THREE from 'three';
import { WORLD, SHOP_NAMES, BILLBOARDS } from './config.js';

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}
function glowTexture(inner, outer) {
  return canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(0.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
}
export const TEX = {};
function buildTextures(rng) {
  TEX.glowWarm = glowTexture('rgba(255,230,170,1)', 'rgba(255,160,60,0.35)');
  TEX.glowPink = glowTexture('rgba(255,120,220,1)', 'rgba(255,0,160,0.35)');
  TEX.glowCyan = glowTexture('rgba(140,240,255,1)', 'rgba(0,180,255,0.35)');
  TEX.glowWhite = glowTexture('rgba(255,255,255,1)', 'rgba(200,220,255,0.3)');
  TEX.sky = canvasTex(64, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2e5f9e'); gr.addColorStop(0.45, '#7fb2dd');
    gr.addColorStop(0.72, '#f7c489'); gr.addColorStop(0.88, '#ff9d6b'); gr.addColorStop(1, '#ffd9a0');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  TEX.road = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#33373d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,255,255,${rng.range(0.01, 0.05)})`; g.fillRect(rng.range(0, w), rng.range(0, h), 2, 2); }
    g.fillStyle = '#f5d76a'; g.fillRect(2, 0, 3, h); g.fillRect(w - 5, 0, 3, h);
    g.fillStyle = '#e8e8e8';
    for (let y = 8; y < h; y += 42) g.fillRect(w / 2 - 2, y, 4, 22);
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(18, 0, 22, h); g.fillRect(w - 40, 0, 22, h);
  }, true);
  TEX.walk = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#b8a894'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,75,60,0.5)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); }
  }, true);
  TEX.cross = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#33373d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8e8e8';
    for (let x = 8; x < w; x += 24) g.fillRect(x, 10, 12, h - 20);
  });
  TEX.sand = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#eed9a0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(160,120,60,${rng.range(0.05, 0.16)})`; g.fillRect(rng.range(0, w), rng.range(0, h), 2, 2); }
  }, true);
  TEX.water = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2f9db8'); gr.addColorStop(1, '#1668a0');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
    for (let i = 0; i < 26; i++) { const y = rng.range(0, h); g.beginPath(); g.moveTo(rng.range(0, w - 40), y); g.lineTo(rng.range(40, w), y); g.stroke(); }
  }, true);
  TEX.frond = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.translate(128, 236);
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.92 + (i / 8) * Math.PI * 0.84;
      g.save(); g.rotate(a);
      g.strokeStyle = '#2e8b3a'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(10, -70, 4, -118); g.stroke();
      g.lineWidth = 2;
      for (let s = 18; s < 110; s += 12) { g.beginPath(); g.moveTo(6, -s); g.lineTo(22, -s - 12); g.stroke(); g.beginPath(); g.moveTo(6, -s); g.lineTo(-10, -s - 12); g.stroke(); }
      g.restore();
    }
    g.fillStyle = '#6b4a2a'; g.beginPath(); g.arc(-6, 6, 9, 0, 7); g.arc(10, 8, 8, 0, 7); g.fill();
  });
  TEX.cloud = canvasTex(256, 128, (g) => {
    g.clearRect(0, 0, 256, 128); g.fillStyle = 'rgba(255,244,230,0.85)';
    for (const [x, y, r] of [[70, 80, 34], [120, 66, 44], [176, 80, 32], [120, 88, 40]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  });
}
function facadeTexture(rng, base, accent) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, w, 10);
    const cols = 5, rows = 7;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const lit = rng.chance(0.42);
      g.fillStyle = lit ? (rng.chance(0.5) ? '#ffd97a' : '#bfe8ff') : '#26314a';
      g.fillRect(14 + c * 46, 16 + r * 30, 28, 18);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(14 + c * 46, 16 + r * 30, 28, 4);
    }
    g.fillStyle = accent; g.fillRect(0, h - 34, w, 34);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, h - 6, w, 6);
  });
}
function signTexture(text, bg, fg) {
  return canvasTex(512, 96, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.font = 'bold 52px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = fg; g.shadowBlur = 18; g.fillStyle = fg;
    g.fillText(text, w / 2, h / 2 + 2); g.fillText(text, w / 2, h / 2 + 2);
  });
}
function skylineTexture(rng, color, maxH) {
  return canvasTex(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = color;
    let x = 0;
    while (x < w) { const bw = rng.range(40, 110), bh = rng.range(50, maxH); g.fillRect(x, h - bh, bw, bh); if (rng.chance(0.4)) g.fillRect(x + bw * 0.3, h - bh - 14, bw * 0.3, 14); x += bw + rng.range(2, 14); }
    g.fillStyle = 'rgba(255,215,130,0.8)';
    for (let i = 0; i < 160; i++) g.fillRect(rng.range(0, w), rng.range(h - maxH, h - 8), 3, 4);
  });
}

export class World {
  constructor(scene, rng) {
    this.scene = scene; this.rng = rng;
    this.colliders = [];
    this.palms = [];
    this.neonSigns = [];
    this.roadLines = [];
    for (let i = -WORLD.grid; i <= WORLD.grid; i++) this.roadLines.push(i * WORLD.block);
    buildTextures(rng);
    this.buildSky(); this.buildGround(); this.buildBuildings(); this.buildPalms(); this.buildBeach(); this.buildProps();
    this.spawn = { x: 4, z: 88 };
    this.hospital = { x: -168, z: -120 };
    this.station = { x: 168, z: -120 };
    this.hideout = { x: -150, z: 132 };
    this.marina = { x: 150, z: 176 };
    this.missionStart = { x: -4, z: 64 };
  }
  addCollider(x, z, hw, hd) { this.colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd }); }
  blocked(x, z, r = 0.9) {
    for (const c of this.colliders) if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return true;
    return false;
  }
  resolve(x, z, r = 0.9) {
    for (const c of this.colliders) {
      if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) {
        const dxl = x - (c.minX - r), dxr = (c.maxX + r) - x, dzl = z - (c.minZ - r), dzr = (c.maxZ + r) - z;
        const m = Math.min(dxl, dxr, dzl, dzr);
        if (m === dxl) x = c.minX - r; else if (m === dxr) x = c.maxX + r; else if (m === dzl) z = c.minZ - r; else z = c.maxZ + r;
      }
    }
    return { x: THREE.MathUtils.clamp(x, -WORLD.bound, WORLD.bound), z: THREE.MathUtils.clamp(z, -WORLD.bound, WORLD.bound + 60) };
  }
  isRoad(x, z) {
    for (const l of this.roadLines) if (Math.abs(x - l) < WORLD.roadHalf + 1 || Math.abs(z - l) < WORLD.roadHalf + 1) return true;
    return false;
  }
  buildSky() {
    const s = this.scene;
    s.fog = new THREE.Fog(0xf4c48d, 130, 460);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(520, 24, 16), new THREE.MeshBasicMaterial({ map: TEX.sky, side: THREE.BackSide, fog: false }));
    s.add(dome);
    const sun = new THREE.Mesh(new THREE.CircleGeometry(26, 24), new THREE.MeshBasicMaterial({ color: 0xffe9b0, fog: false }));
    sun.position.set(-330, 92, -300); sun.lookAt(0, 20, 0); s.add(sun);
    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glowWarm, color: 0xffc37a, transparent: true, opacity: 0.9, fog: false, depthWrite: false }));
    sunGlow.scale.setScalar(190); sunGlow.position.copy(sun.position); s.add(sunGlow);
    this.clouds = [];
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.cloud, transparent: true, opacity: 0.85, fog: false, depthWrite: false }));
      sp.position.set(this.rng.range(-380, 380), this.rng.range(90, 150), this.rng.range(-380, 200));
      sp.scale.set(this.rng.range(90, 160), this.rng.range(36, 60), 1);
      s.add(sp); this.clouds.push(sp);
    }
    const layers = [
      { d: 430, y: 0, c: '#5b6fa8', h: 190, o: 0.75 },
      { d: 360, y: 0, c: '#44558c', h: 150, o: 0.9 },
      { d: 300, y: 0, c: '#2f3f6e', h: 115, o: 1 },
    ];
    this.skylines = [];
    for (const L of layers) {
      const tex = skylineTexture(this.rng, L.c, L.h);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: L.o, fog: false, side: THREE.DoubleSide });
      for (const [x, z, ry] of [[0, -L.d, 0], [0, L.d - 60, Math.PI], [-L.d, 0, Math.PI / 2], [L.d, 0, -Math.PI / 2]]) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(760, 190), mat);
        p.position.set(x, 62, z); p.rotation.y = ry; s.add(p); this.skylines.push(p);
      }
    }
    s.add(new THREE.HemisphereLight(0xbfe3ff, 0x8a6a4a, 0.95));
    const dir = new THREE.DirectionalLight(0xffd9a3, 1.6);
    dir.position.set(-120, 160, -80); s.add(dir);
    s.add(new THREE.AmbientLight(0xffe0c0, 0.25));
  }
  buildGround() {
    const s = this.scene, B = WORLD.block, lines = this.roadLines;
    const base = new THREE.Mesh(new THREE.PlaneGeometry(440, 470), new THREE.MeshLambertMaterial({ map: TEX.walk }));
    TEX.walk.repeat.set(60, 60);
    base.rotation.x = -Math.PI / 2; base.position.set(0, -0.05, 12); s.add(base);
    const roadMat = new THREE.MeshLambertMaterial({ map: TEX.road });
    const roadGeoH = new THREE.PlaneGeometry(392, WORLD.roadHalf * 2);
    const roadGeoV = new THREE.PlaneGeometry(WORLD.roadHalf * 2, 392);
    for (const l of lines) {
      const rh = new THREE.Mesh(roadGeoH, roadMat.clone());
      rh.material.map = TEX.road.clone(); rh.material.map.repeat.set(24, 1); rh.material.map.needsUpdate = true;
      rh.rotation.x = -Math.PI / 2; rh.rotation.z = Math.PI / 2; rh.position.set(0, 0.02, l); s.add(rh);
      const rv = new THREE.Mesh(roadGeoV, roadMat.clone());
      rv.material.map = TEX.road.clone(); rv.material.map.repeat.set(1, 24); rv.material.map.needsUpdate = true;
      rv.rotation.x = -Math.PI / 2; rv.position.set(l, 0.02, 0); s.add(rv);
    }
    const crossMat = new THREE.MeshLambertMaterial({ map: TEX.cross });
    const crossGeo = new THREE.PlaneGeometry(15, 15);
    for (const x of [-60, 0, 60]) for (const z of [-60, 0, 60]) {
      const c = new THREE.Mesh(crossGeo, crossMat);
      c.rotation.x = -Math.PI / 2; c.position.set(x, 0.04, z); s.add(c);
    }
  }
  buildBuildings() {
    const s = this.scene, rng = this.rng;
    const palettes = [
      ['#e8b4a0', '#c96f4a'], ['#a8c8e0', '#4a7ba6'], ['#f0d9a8', '#c9a24a'], ['#d9a8c8', '#a64a86'],
      ['#b0dcc0', '#4aa672'], ['#e8e0d0', '#8a7a5f'], ['#f2f2f2', '#5a6a8a'], ['#ffd0b0', '#d97b3f'],
    ];
    const facades = palettes.map(([b, a]) => new THREE.MeshLambertMaterial({ map: facadeTexture(rng, b, a) }));
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x6a5a4e });
    const centers = [-150, -90, -30, 30, 90, 150];
    let shopIdx = 0, bbIdx = 0;
    for (const cx of centers) for (const cz of centers) {
      if (cz === 150 && rng.chance(0.5)) continue;
      const n = rng.int(1, 2);
      for (let i = 0; i < n; i++) {
        const w = rng.range(16, 24), d = rng.range(16, 24);
        const tall = cz < 60 && rng.chance(0.55);
        const h = tall ? rng.range(22, 52) : rng.range(9, 20);
        let ox = n === 1 ? rng.range(-6, 6) : (i === 0 ? -13 : 13);
        let oz = n === 1 ? rng.range(-6, 6) : rng.range(-8, 8);
        // Keep every footprint inside its block: never intrude on a road.
        ox = THREE.MathUtils.clamp(ox, -(23 - w / 2), 23 - w / 2);
        oz = THREE.MathUtils.clamp(oz, -(23 - d / 2), 23 - d / 2);
        const x = cx + ox, z = cz + oz;
        if (this.blocked(x, z, 16)) continue;
        const mat = facades[rng.int(0, facades.length - 1)];
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        b.position.set(x, h / 2, z); s.add(b);
        this.addCollider(x, z, w / 2, d / 2);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.7, d + 0.6), roofMat);
        roof.position.set(x, h + 0.35, z); s.add(roof);
        if (rng.chance(0.6)) {
          const prop = new THREE.Mesh(new THREE.BoxGeometry(rng.range(2, 4), rng.range(1.2, 2.6), rng.range(2, 4)), new THREE.MeshLambertMaterial({ color: 0x9aa2ac }));
          prop.position.set(x + rng.range(-w / 4, w / 4), h + 1.4, z + rng.range(-d / 4, d / 4)); s.add(prop);
        }
        if (rng.chance(0.3)) {
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 4.4, 8), new THREE.MeshLambertMaterial({ color: 0x8a6a4e }));
          tower.position.set(x - w / 4, h + 2.2, z - d / 4); s.add(tower);
        }
        // Ground-floor storefront facing the nearest road (south side)
        if (h < 30 && shopIdx < 60) {
          const neon = cz === 30 || cz === -30;
          const name = SHOP_NAMES[shopIdx % SHOP_NAMES.length]; shopIdx++;
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 0.86, 15), 2.6),
            new THREE.MeshBasicMaterial({ map: signTexture(name, neon ? '#1a0b2e' : '#274b63', neon ? (shopIdx % 2 ? '#ff5fd2' : '#54f0ff') : '#ffe9a8') }));
          sign.position.set(x, 4.6, z + d / 2 + 0.12); s.add(sign);
          const awn = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.9, 16), 0.25, 2.6), new THREE.MeshLambertMaterial({ color: neon ? 0xd63384 : 0x2e7d6b }));
          awn.position.set(x, 3.4, z + d / 2 + 1.1); awn.rotation.x = 0.35; s.add(awn);
          const glass = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 0.8, 14), 2.8), new THREE.MeshBasicMaterial({ color: neon ? 0xffd9f4 : 0xbfe8ff }));
          glass.position.set(x, 1.5, z + d / 2 + 0.1); s.add(glass);
          if (neon) {
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: shopIdx % 2 ? TEX.glowPink : TEX.glowCyan, transparent: true, opacity: 0.55, depthWrite: false }));
            glow.scale.set(20, 9, 1); glow.position.set(x, 4.6, z + d / 2 + 1.2); s.add(glow);
            this.neonSigns.push(glow);
          }
        }
        if (tall && rng.chance(0.4) && bbIdx < 10) {
          const bb = new THREE.Mesh(new THREE.PlaneGeometry(13, 5.5), new THREE.MeshBasicMaterial({ map: signTexture(BILLBOARDS[bbIdx % BILLBOARDS.length], '#141b38', bbIdx % 2 ? '#ffd94a' : '#54f0ff') }));
          bbIdx++;
          bb.position.set(x, h - 4, z + d / 2 + 0.15); s.add(bb);
          const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glowCyan, transparent: true, opacity: 0.3, depthWrite: false }));
          glow.scale.set(18, 9, 1); glow.position.set(x, h - 4, z + d / 2 + 1); s.add(glow);
        }
      }
    }
    // Street lights: instanced poles + emissive heads
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 5.4, 6);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a4149 });
    const spots = [];
    for (const l of this.roadLines) for (let t = -170; t <= 170; t += 42) { spots.push([l + 8.2, t]); spots.push([t, l + 8.2]); }
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, spots.length);
    const headGeo = new THREE.SphereGeometry(0.34, 8, 6);
    const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xffe2a0 }), spots.length);
    const m4 = new THREE.Matrix4();
    spots.forEach(([x, z], i) => { m4.makeTranslation(x, 2.7, z); poles.setMatrixAt(i, m4); m4.makeTranslation(x, 5.5, z); heads.setMatrixAt(i, m4); });
    s.add(poles); s.add(heads);
  }
  buildPalms() {
    const s = this.scene, rng = this.rng;
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6844 });
    const frondMat = new THREE.MeshLambertMaterial({ map: TEX.frond, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
    const spots = [];
    for (const l of this.roadLines) for (let t = -168; t <= 168; t += 48) { spots.push([l + rng.range(9.5, 11), t + rng.range(-6, 6)]); spots.push([t + rng.range(-6, 6), l - rng.range(9.5, 11)]); }
    for (let x = -170; x <= 170; x += 26) spots.push([x + rng.range(-4, 4), rng.range(158, 166)]);
    let count = 0;
    for (const [x, z] of spots) {
      if (count >= 64 || this.blocked(x, z, 2) || this.isRoad(x, z)) continue;
      count++;
      const h = rng.range(5.5, 8.5), lean = rng.range(0.6, 1.6), la = rng.range(0, Math.PI * 2);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.cos(la) * lean * 0.3, h * 0.5, Math.sin(la) * lean * 0.3),
        new THREE.Vector3(Math.cos(la) * lean, h, Math.sin(la) * lean),
      ]);
      const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 6, 0.22, 6), trunkMat);
      trunk.position.set(x, 0, z); s.add(trunk);
      const topX = x + Math.cos(la) * lean, topZ = z + Math.sin(la) * lean;
      const fan = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), frondMat);
      fan.position.set(topX, h + 0.7, topZ);
      fan.rotation.set(-Math.PI / 2 + 0.38, 0, rng.range(0, 3));
      s.add(fan);
      const fan2 = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 6.2), frondMat);
      fan2.position.set(topX, h + 0.45, topZ);
      fan2.rotation.set(-Math.PI / 2 + 0.95, 0, fan.rotation.z + 1.1);
      s.add(fan2);
      this.palms.push({ fan, fan2, trunk, phase: rng.range(0, 6.28), baseX: fan.rotation.x, baseX2: fan2.rotation.x });
      this.addCollider(x, z, 0.4, 0.4);
    }
  }
  buildBeach() {
    const s = this.scene, rng = this.rng;
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(440, 46), new THREE.MeshLambertMaterial({ map: TEX.sand }));
    TEX.sand.repeat.set(40, 5);
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.03, 186); s.add(sand);
    const board = new THREE.Mesh(new THREE.BoxGeometry(430, 0.35, 5), new THREE.MeshLambertMaterial({ color: 0x9a7350 }));
    board.position.set(0, 0.18, 166); s.add(board);
    this.waterMat = new THREE.MeshLambertMaterial({ map: TEX.water, transparent: true, opacity: 0.92 });
    TEX.water.repeat.set(18, 6);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(460, 150), this.waterMat);
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.12, 282); s.add(water);
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(440, 2.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 }));
    foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.14, 208); s.add(foam);
    this.foam = foam;
    const umbGeo = new THREE.ConeGeometry(2.2, 1, 8);
    const poleGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.4, 5);
    const cols = [0xff5f7a, 0x54c8ff, 0xffd94a, 0x7be495];
    for (let i = 0; i < 12; i++) {
      const x = rng.range(-190, 190), z = rng.range(176, 198);
      const u = new THREE.Mesh(umbGeo, new THREE.MeshLambertMaterial({ color: cols[i % 4] }));
      u.position.set(x, 2.5, z); s.add(u);
      const p = new THREE.Mesh(poleGeo, new THREE.MeshLambertMaterial({ color: 0xdddddd }));
      p.position.set(x, 1.2, z); s.add(p);
    }
    // Marina pier + a couple of simple boats at the east end
    const pier = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 42), new THREE.MeshLambertMaterial({ color: 0x7a5c40 }));
    pier.position.set(150, 0.4, 224); s.add(pier);
    for (const dx of [-14, 14]) {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 9), new THREE.MeshLambertMaterial({ color: dx < 0 ? 0xffffff : 0xff7a5f }));
      hull.position.y = 0.8; boat.add(hull);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 3), new THREE.MeshLambertMaterial({ color: 0xbfd9e8 }));
      cab.position.set(0, 2, -0.6); boat.add(cab);
      boat.position.set(150 + dx, 0.2, 232); s.add(boat);
    }
  }
  buildProps() {
    const s = this.scene, rng = this.rng;
    const crateGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    const crateMat = new THREE.MeshLambertMaterial({ color: 0xb08850 });
    const dumpGeo = new THREE.BoxGeometry(3.2, 1.8, 1.8);
    const dumpMat = new THREE.MeshLambertMaterial({ color: 0x2e7d5b });
    const hydGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.9, 8);
    const hydMat = new THREE.MeshLambertMaterial({ color: 0xe23b3b });
    const spots = [];
    for (let i = 0; i < 40; i++) spots.push([rng.range(-180, 180), rng.range(-180, 160)]);
    const crates = new THREE.InstancedMesh(crateGeo, crateMat, 14);
    const dumps = new THREE.InstancedMesh(dumpGeo, dumpMat, 10);
    const hyds = new THREE.InstancedMesh(hydGeo, hydMat, 12);
    const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler(); const one = new THREE.Vector3(1, 1, 1);
    let ci = 0, di = 0, hi = 0;
    for (const [x, z] of spots) {
      if (this.isRoad(x, z) || this.blocked(x, z, 2)) continue;
      e.set(0, rng.range(0, 3), 0); q.setFromEuler(e);
      if (ci < 14) { m4.compose(new THREE.Vector3(x, 0.7, z), q, one); crates.setMatrixAt(ci++, m4); this.addCollider(x, z, 0.8, 0.8); }
      else if (di < 10) { m4.compose(new THREE.Vector3(x, 0.9, z), q, one); dumps.setMatrixAt(di++, m4); this.addCollider(x, z, 1.7, 1); }
      else if (hi < 12) { m4.compose(new THREE.Vector3(x, 0.45, z), q, one); hyds.setMatrixAt(hi++, m4); }
    }
    crates.count = ci; dumps.count = di; hyds.count = hi;
    s.add(crates); s.add(dumps); s.add(hyds);
  }
  update(dt, t) {
    if (this.waterMat) this.waterMat.map.offset.set(Math.sin(t * 0.05) * 0.02, t * 0.012 % 1);
    if (this.foam) this.foam.material.opacity = 0.45 + Math.sin(t * 1.4) * 0.2;
    for (const p of this.palms) {
      const sway = Math.sin(t * 1.1 + p.phase) * 0.045;
      p.fan.rotation.x = p.baseX + sway; p.fan2.rotation.x = p.baseX2 - sway;
    }
    for (const c of this.clouds) { c.position.x += dt * 1.1; if (c.position.x > 420) c.position.x = -420; }
    const flick = 0.5 + Math.sin(t * 7) * 0.05 + Math.sin(t * 23) * 0.03;
    for (const g of this.neonSigns) g.material.opacity = flick;
  }
}
