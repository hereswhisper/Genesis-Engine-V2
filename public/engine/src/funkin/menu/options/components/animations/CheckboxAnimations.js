class CheckboxAnimations {
  constructor(manager) {
    this.manager = manager;
    this.scene = manager.scene;
    this.timers = {};
    this.selectedCheckboxOffset = [0, -20];
    this.unselectedScale = 0.55;
    this.selectedScaleMultiplier = 0.7;
  }

  clear() {
    for (let key in this.timers) {
      if (this.timers[key]) this.scene.time.removeEvent(this.timers[key]);
    }
    this.timers = {};
  }

  drawFrame(canvas, frameName) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tex = this.scene.textures.get("checkboxThingie");
    if (!tex || tex.key === "__MISSING") return;
    const frame = tex.get(frameName);
    if (!frame) return;

    const img = tex.getSourceImage();
    const isUnselected = frameName.includes("unselected");

    let scale = isUnselected
      ? this.unselectedScale
      : Math.min(canvas.width / 140, canvas.height / 225) *
        this.selectedScaleMultiplier;
    let extX = isUnselected ? 0 : this.selectedCheckboxOffset[0];
    let extY = isUnselected ? 0 : this.selectedCheckboxOffset[1];

    const cW = frame.cutWidth,
      cH = frame.cutHeight;
    const rW = frame.realWidth || cW,
      rH = frame.realHeight || cH;
    const offX = (canvas.width - rW * scale) / 2 + extX;
    const offY = (canvas.height - rH * scale) / 2 + extY;

    let trimX = frame.trim ? frame.spriteSourceSize?.x || frame.x || 0 : 0;
    let trimY = frame.trim ? frame.spriteSourceSize?.y || frame.y || 0 : 0;

    try {
      ctx.drawImage(
        img,
        frame.cutX,
        frame.cutY,
        cW,
        cH,
        offX + trimX * scale,
        offY + trimY * scale,
        cW * scale,
        cH * scale,
      );
    } catch (e) {}
  }

  playBlink(itemId, canvas) {
    if (!canvas) return;
    if (this.timers[itemId]) this.scene.time.removeEvent(this.timers[itemId]);
    this.drawFrame(canvas, "Check Box Selected Static0000");
    canvas.style.transition = "none";

    let toggles = 0;
    canvas.style.opacity = "0";
    this.timers[itemId] = this.scene.time.addEvent({
      delay: 50,
      repeat: 8,
      callback: () => {
        toggles++;
        canvas.style.opacity = toggles % 2 === 0 ? "0" : "1";
      },
    });
  }

  playAnimation(itemId, canvas) {
    let frameIdx = 0;
    if (this.timers[itemId]) this.scene.time.removeEvent(this.timers[itemId]);
    this.timers[itemId] = this.scene.time.addEvent({
      delay: 24,
      repeat: 10,
      callback: () => {
        const fStr = (frameIdx < 10 ? "0" : "") + frameIdx;
        this.drawFrame(canvas, "Check Box selecting animation00" + fStr);
        frameIdx++;
        if (frameIdx > 10)
          this.drawFrame(canvas, "Check Box Selected Static0000");
      },
    });
  }

  playUnselect(itemId, canvas) {
    let frameIdx = 10;
    if (this.timers[itemId]) this.scene.time.removeEvent(this.timers[itemId]);
    canvas.style.opacity = "1";
    this.timers[itemId] = this.scene.time.addEvent({
      delay: 24,
      repeat: 11,
      callback: () => {
        if (frameIdx >= 0) {
          const fStr = (frameIdx < 10 ? "0" : "") + frameIdx;
          this.drawFrame(canvas, "Check Box selecting animation00" + fStr);
          frameIdx--;
        } else {
          this.drawFrame(canvas, "Check Box unselected0000");
        }
      },
    });
  }
}
window.CheckboxAnimations = CheckboxAnimations;
