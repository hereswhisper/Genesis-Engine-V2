class IconsAnimator {
  constructor(manager) {
    this.manager = manager;
    this.parent = manager.parent;
    this.scene = manager.parent.scene;
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.fps = 24;

    this.scene.events.on("update", this.update, this);
  }

  playAnimation(iconName) {
    this.manager.activeIcon = iconName;
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.manager.iconStates[iconName] = "selected " + iconName + "0000";

    this.parent.sections.forEach((sec) => {
      if (sec.icon !== iconName) delete this.manager.iconStates[sec.icon];
    });
    this.manager.renderer.drawIcons();
  }

  update(time, delta) {
    if (
      !this.manager.activeIcon ||
      !this.parent.domMenu ||
      !this.parent.domMenu.node
    )
      return;
    this.frameTimer += delta;

    if (this.frameTimer >= 1000 / this.fps) {
      this.frameTimer -= 1000 / this.fps;
      const canvas = this.parent.domMenu.node.querySelector(
        `[id="canvas-icon-${this.manager.activeIcon}"]`,
      );
      if (!canvas) return;
      const texture = this.scene.textures.get("optionsIcons");
      if (!texture || texture.key === "__MISSING") return;

      let frameName =
        "selected " +
        this.manager.activeIcon +
        this.currentFrame.toString().padStart(4, "0");
      if (!texture.has(frameName)) {
        this.manager.activeIcon = null;
        return;
      }
      this.manager.iconStates[this.manager.activeIcon] = frameName;

      const frame = texture.get(frameName);
      if (frame && frame.name !== "__BASE") {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale = 0.9,
          tW = frame.cutWidth * scale,
          tH = frame.cutHeight * scale;
        ctx.drawImage(
          frame.source.image,
          frame.cutX,
          frame.cutY,
          frame.cutWidth,
          frame.cutHeight,
          (canvas.width - tW) / 2,
          (canvas.height - tH) / 2,
          tW,
          tH,
        );
      }
      this.currentFrame++;
    }
  }

  destroy() {
    this.scene.events.off("update", this.update, this);
  }
}
window.IconsAnimator = IconsAnimator;
