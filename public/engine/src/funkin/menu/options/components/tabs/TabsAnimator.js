class TabsAnimator {
  constructor(manager) {
    this.manager = manager;
    this.parent = manager.parent;
    this.scene = manager.parent.scene;

    this.scene.events.on("update", this.updateArrowsAnim, this);
  }

  updateArrowsAnim(time, delta) {
    const p = this.parent;
    if (!p.domMenu || !p.domMenu.node) {
      this.scene.events.off("update", this.updateArrowsAnim, this);
      return;
    }

    this.manager.arrowTimer += delta;
    if (this.manager.arrowTimer >= 1000 / 24) {
      this.manager.arrowTimer -= 1000 / 24;
      const cL = p.domMenu.node.querySelector("#canvas-arrow-left");
      const cR = p.domMenu.node.querySelector("#canvas-arrow-right");

      if (cL && cR) {
        const tex = this.scene.textures.get("tabSelector");
        if (tex && tex.key !== "__MISSING") {
          let fName =
            "arrow pointer loop" +
            this.manager.arrowFrame.toString().padStart(4, "0");
          if (tex.has(fName)) {
            const frame = tex.get(fName);
            const ctxL = cL.getContext("2d");
            ctxL.clearRect(0, 0, cL.width, cL.height);
            ctxL.drawImage(
              frame.source.image,
              frame.cutX,
              frame.cutY,
              frame.cutWidth,
              frame.cutHeight,
              0,
              0,
              frame.cutWidth,
              frame.cutHeight,
            );

            const ctxR = cR.getContext("2d");
            ctxR.clearRect(0, 0, cR.width, cR.height);
            ctxR.save();
            ctxR.scale(-1, 1);
            ctxR.drawImage(
              frame.source.image,
              frame.cutX,
              frame.cutY,
              frame.cutWidth,
              frame.cutHeight,
              -cR.width,
              0,
              frame.cutWidth,
              frame.cutHeight,
            );
            ctxR.restore();
          }
        }
      }
      this.manager.arrowFrame = (this.manager.arrowFrame + 1) % 15;
    }
  }

  destroy() {
    this.scene.events.off("update", this.updateArrowsAnim, this);
  }
}
window.TabsAnimator = TabsAnimator;
