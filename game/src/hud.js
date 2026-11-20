// DOM HUD: bars, stars, money, objective, banners, damage vignette, minimap.
import { WORLD } from './config.js';

export class HUD {
  constructor() {
    this.el = {};
    for (const id of ['money', 'rep', 'stars', 'healthFill', 'speed', 'objective', 'dist', 'timer', 'bannerTitle', 'bannerSub', 'banner', 'bustWrap', 'bustFill', 'vignette', 'missionName'])
      this.el[id] = document.getElementById(id);
    this.map = document.getElementById('minimap');
    this.mctx = this.map.getContext('2d');
    this.bannerT = 0;
    this.vigT = 0;
  }
  banner(title, sub = '', dur = 2.6) {
    this.el.bannerTitle.textContent = title;
    this.el.bannerSub.textContent = sub;
    this.el.banner.style.opacity = '1';
    this.bannerT = dur;
  }
  flashDamage() { this.vigT = 0.45; }
  update(dt, info) {
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.el.banner.style.opacity = '0'; }
    if (this.vigT > 0) { this.vigT -= dt; this.el.vignette.style.opacity = String(Math.max(0, this.vigT)); }
    this.el.money.textContent = '$' + info.money.toLocaleString('en-US');
    this.el.rep.textContent = 'REP ' + info.rep;
    this.el.stars.textContent = '★'.repeat(info.stars) + '☆'.repeat(5 - info.stars);
    this.el.stars.style.color = info.stars > 0 ? '#ffd94a' : 'rgba(255,255,255,0.35)';
    this.el.healthFill.style.width = Math.max(0, info.health) + '%';
    this.el.healthFill.style.background = info.health > 35 ? '#7be495' : '#ff5f6d';
    this.el.speed.textContent = info.driving ? Math.round(Math.abs(info.speed) * 3.6) + ' km/h' : '';
    this.el.objective.textContent = info.objective || '';
    this.el.missionName.textContent = info.missionName || '';
    this.el.dist.textContent = info.targetDist != null ? Math.round(info.targetDist) + ' m' : '';
    this.el.timer.textContent = info.timer != null ? Math.ceil(info.timer) + 's' : '';
    this.el.timer.style.color = info.timer != null && info.timer < 15 ? '#ff5f6d' : '#fff';
    this.el.bustWrap.style.display = info.bust > 0.02 ? 'block' : 'none';
    this.el.bustFill.style.width = Math.round(info.bust * 100) + '%';
    this.drawMap(info);
  }
  drawMap(info) {
    const g = this.mctx, S = this.map.width;
    const mx = (x) => ((x + 205) / 410) * S;
    const mz = (z) => ((z + 205) / 465) * S;
    g.fillStyle = '#20303f'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#c9b083'; g.fillRect(0, mz(164), S, S - mz(164));
    g.fillStyle = '#1d6f96'; g.fillRect(0, mz(210), S, S - mz(210));
    g.strokeStyle = '#4d6070'; g.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      g.beginPath(); g.moveTo(mx(i * WORLD.block), 0); g.lineTo(mx(i * WORLD.block), S); g.stroke();
      g.beginPath(); g.moveTo(0, mz(i * WORLD.block)); g.lineTo(S, mz(i * WORLD.block)); g.stroke();
    }
    g.fillStyle = '#31465a';
    for (let i = -3; i < 3; i++) for (let j = -3; j < 3; j++) g.fillRect(mx(i * 60 + 9), mz(j * 60 + 9), (42 / 410) * S, (42 / 465) * S);
    if (info.target) {
      g.fillStyle = '#ffd94a';
      g.beginPath(); g.arc(mx(info.target.x), mz(info.target.z), 4.5, 0, 7); g.fill();
    }
    g.fillStyle = '#cfd6dd';
    for (const c of info.traffic) { g.fillRect(mx(c.x) - 1.5, mz(c.z) - 1.5, 3, 3); }
    const flash = Math.floor(performance.now() / 300) % 2 === 0;
    for (const c of info.police) {
      g.fillStyle = flash ? '#ff3344' : '#3388ff';
      g.beginPath(); g.arc(mx(c.x), mz(c.z), 3.4, 0, 7); g.fill();
    }
    // player arrow
    const px = mx(info.pos.x), pz = mz(info.pos.z);
    g.save(); g.translate(px, pz); g.rotate(info.angle);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(0, 2.5); g.lineTo(-4, 5); g.closePath(); g.fill();
    g.restore();
  }
}
