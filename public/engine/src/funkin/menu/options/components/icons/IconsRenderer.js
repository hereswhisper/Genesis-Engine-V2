class IconsRenderer {
  constructor(manager) {
    this.manager = manager;
    this.parent = manager.parent;
    this.scene = manager.parent.scene;
  }

  getIconHTML(iconName) {
    return `<div style="position: relative; width: 90px; height: 50px; margin-right: 5px; display: flex; align-items: center; justify-content: center;"><canvas id="canvas-icon-${iconName}" width="150" height="150" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 100;"></canvas></div>`;
  }

  getLastFrameName(texture, iconName) {
    if (this.manager.cachedLastFrames[iconName])
      return this.manager.cachedLastFrames[iconName];
    let lastValidFrame = "selected " + iconName + "0000";
    if (!texture.has(lastValidFrame)) return null;

    for (let i = 0; i < 100; i++) {
      let testFrame = "selected " + iconName + i.toString().padStart(4, "0");
      if (texture.has(testFrame)) lastValidFrame = testFrame;
      else break;
    }
    this.manager.cachedLastFrames[iconName] = lastValidFrame;
    return lastValidFrame;
  }

  drawIcons() {
    const p = this.parent;
    if (!p.domMenu || !p.domMenu.node) return;
    p.sections.forEach((sec, index) => {
      this.drawStaticFrame(sec.icon, index === p.selectedTabIndex);
    });
  }

  drawStaticFrame(iconName, isSelected = false) {
    const p = this.parent;
    const canvas = p.domMenu.node.querySelector(
      `[id="canvas-icon-${iconName}"]`,
    );
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const texture = this.scene.textures.get("optionsIcons");
    if (!texture || texture.key === "__MISSING") return;

    let frameName =
      isSelected && this.manager.iconStates[iconName]
        ? this.manager.iconStates[iconName]
        : this.getLastFrameName(texture, iconName) || iconName + "0000";

    if (texture.has(frameName)) {
      const frame = texture.get(frameName);
      if (frame && frame.name !== "__BASE") {
        const scale = 0.9;
        const tW = frame.cutWidth * scale,
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
    }
  }
}
window.IconsRenderer = IconsRenderer;
