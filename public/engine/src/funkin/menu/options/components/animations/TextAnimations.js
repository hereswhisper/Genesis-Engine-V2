class TextAnimations {
  constructor(manager) {
    this.manager = manager;
    this.animations = {};
  }

  clear() {
    for (let key in this.animations) {
      if (this.animations[key]) this.animations[key].cancel();
    }
    this.animations = {};
  }

  startMarquee(idx, canvas) {
    if (!this.animations[idx] && canvas && canvas.parentElement) {
      const tWidth = canvas.width;
      const pWidth = canvas.parentElement.clientWidth;

      if (tWidth > pWidth && pWidth > 0) {
        const speed = 100;
        const dur1 = (tWidth / speed) * 1000;
        const dur2 = (pWidth / speed) * 1000;
        const pauseTime = 1500;
        const totalDur = pauseTime + dur1 + dur2;

        const p1 = pauseTime / totalDur;
        const p2 = (pauseTime + dur1) / totalDur;
        const p3 = p2 + 0.001;

        this.animations[idx] = canvas.animate(
          [
            { transform: "translateX(0px)", offset: 0 },
            { transform: "translateX(0px)", offset: p1 },
            { transform: `translateX(-${tWidth}px)`, offset: p2 },
            { transform: `translateX(${pWidth}px)`, offset: p3 },
            { transform: "translateX(0px)", offset: 1 },
          ],
          { duration: totalDur, iterations: Infinity },
        );
      }
    }
  }

  stopMarquee(idx, canvas) {
    if (this.animations[idx]) {
      this.animations[idx].cancel();
      delete this.animations[idx];
    }
    if (canvas) canvas.style.transform = "translateX(0px)";
  }
}
window.TextAnimations = TextAnimations;
