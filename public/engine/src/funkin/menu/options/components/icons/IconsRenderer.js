class IconsRenderer {
  constructor(manager) {
    this.manager = manager;
    this.parent = manager.parent;
    this.scene = manager.parent.scene;
  }

  getIconHTML(iconName) {
    // AÑADIDO: Ahora hay 2 canvas separados. Uno para el círculo (z-index: 90) y otro para el ícono (z-index: 100).
    return `<div style="position: relative; width: 90px; height: 50px; margin-right: 5px; display: flex; align-items: center; justify-content: center;">
      <canvas id="canvas-circle-${iconName}" width="150" height="150" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 90;"></canvas>
      <canvas id="canvas-icon-${iconName}" width="150" height="150" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 100;"></canvas>
    </div>`;
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
    const canvasIcon = p.domMenu.node.querySelector(
      `[id="canvas-icon-${iconName}"]`,
    );
    const canvasCircle = p.domMenu.node.querySelector(
      `[id="canvas-circle-${iconName}"]`,
    );
    if (!canvasIcon || !canvasCircle) return;

    // Tenemos dos contextos diferentes para no interferir con las animaciones
    const ctxI = canvasIcon.getContext("2d");
    const ctxC = canvasCircle.getContext("2d");

    ctxI.clearRect(0, 0, canvasIcon.width, canvasIcon.height);
    ctxC.clearRect(0, 0, canvasCircle.width, canvasCircle.height);

    const texture = this.scene.textures.get("optionsIcons");
    if (!texture || texture.key === "__MISSING") return;

    let frameName =
      isSelected && this.manager.iconStates[iconName]
        ? this.manager.iconStates[iconName]
        : this.getLastFrameName(texture, iconName) || iconName + "0000";

    let iconFrame = texture.has(frameName) ? texture.get(frameName) : null;
    const scale = 0.9;

    let tW = iconFrame ? iconFrame.cutWidth * scale : 80;
    let tH = iconFrame ? iconFrame.cutHeight * scale : 80;

    let circleScaleFactor = 0.8;
    let circleSize = Math.max(tW, tH) * circleScaleFactor;

    // 1. DIBUJAR CÍRCULO EN SU PROPIO CANVAS
    if (texture.has("circle0000")) {
      const circleFrame = texture.get("circle0000");
      if (circleFrame && circleFrame.name !== "__BASE") {
        ctxC.drawImage(
          circleFrame.source.image,
          circleFrame.cutX,
          circleFrame.cutY,
          circleFrame.cutWidth,
          circleFrame.cutHeight,
          (canvasCircle.width - circleSize) / 2,
          (canvasCircle.height - circleSize) / 2,
          circleSize,
          circleSize,
        );
      }
    }

    // 2. DIBUJAR EL ICONO PRINCIPAL EN SU CANVAS
    if (iconFrame && iconFrame.name !== "__BASE") {
      ctxI.drawImage(
        iconFrame.source.image,
        iconFrame.cutX,
        iconFrame.cutY,
        iconFrame.cutWidth,
        iconFrame.cutHeight,
        (canvasIcon.width - tW) / 2,
        (canvasIcon.height - tH) / 2,
        tW,
        tH,
      );
    }
  }
}
window.IconsRenderer = IconsRenderer;
