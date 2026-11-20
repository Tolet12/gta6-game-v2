// Keyboard and mouse state: held keys plus one-shot pressed flags.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressedSet = new Set();
    this.mouseDX = 0; this.mouseDY = 0; this.dragging = false;
    addEventListener('keydown', (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressedSet.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    if (canvas) {
      canvas.addEventListener('pointerdown', (e) => { this.dragging = true; this._x = e.clientX; this._y = e.clientY; });
      addEventListener('pointerup', () => { this.dragging = false; });
      addEventListener('pointermove', (e) => {
        if (!this.dragging) return;
        this.mouseDX += e.clientX - this._x; this.mouseDY += e.clientY - this._y;
        this._x = e.clientX; this._y = e.clientY;
      });
    }
  }
  down(...codes) { return codes.some((c) => this.keys.has(c)); }
  pressed(code) { return this.pressedSet.has(code); }
  endFrame() { this.pressedSet.clear(); this.mouseDX = 0; this.mouseDY = 0; }
}
