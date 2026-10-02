export class Input {
  keys = new Set<string>();
  pressed = new Set<string>();
  dx = 0;
  dy = 0;
  wheel = 0;
  drag = false;
  active = true;
  constructor(readonly canvas: HTMLCanvasElement) {
    addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLElement && e.target.matches('input,select,textarea') && e.code !== 'Escape')
        return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.clear());
    canvas.addEventListener('pointerdown', (e) => {
      this.drag = true;
      canvas.setPointerCapture(e.pointerId);
    });
    addEventListener('pointerup', () => (this.drag = false));
    canvas.addEventListener('pointermove', (e) => {
      if (this.drag || document.pointerLockElement === canvas) {
        this.dx += e.movementX;
        this.dy += e.movementY;
      }
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        this.wheel += Math.sign(e.deltaY);
        e.preventDefault();
      },
      { passive: false },
    );
  }
  down(...k: string[]) {
    return this.active && k.some((x) => this.keys.has(x));
  }
  tap(k: string) {
    return this.pressed.has(k);
  }
  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.drag = false;
    this.dx = this.dy = this.wheel = 0;
  }
  endFrame() {
    this.pressed.clear();
    this.dx = this.dy = this.wheel = 0;
  }
}
