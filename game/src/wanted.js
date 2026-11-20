// Wanted level 0-5 and the heat rules.
export const CRIMES = { theft: 1, hitPed: 2, hitCop: 2, punch: 1, hitCar: 1 };
export class Wanted {
  constructor() { this.stars = 0; this.sinceSeen = 0; this.seen = false; }
  // A crime counts only when a witness (pedestrian or police) is within sight range.
  commit(kind, witnessed) {
    if (!witnessed) return false;
    const add = CRIMES[kind] || 1;
    this.stars = Math.min(5, this.stars + add);
    this.sinceSeen = 0;
    return true;
  }
  setStars(n) { this.stars = Math.max(0, Math.min(5, n)); this.sinceSeen = 0; }
  update(dt, seenByPolice) {
    this.seen = seenByPolice;
    if (seenByPolice) this.sinceSeen = 0;
    else {
      this.sinceSeen += dt;
      if (this.stars > 0 && this.sinceSeen > 12) { this.stars -= 1; this.sinceSeen = 4; }
    }
  }
}
