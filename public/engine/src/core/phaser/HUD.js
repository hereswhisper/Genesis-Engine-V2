// src/core/phaser/HUD.js

class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: "HUDScene" });
  }

  create() {
    this.scene.bringToTop();
    window.HUD = this;

    // Instanciar el monitor nativo de Phaser
    if (typeof DebugMonitor !== "undefined") {
      this.debugMonitor = new DebugMonitor(this);
    } else {
      console.warn("DebugMonitor no está definido.");
    }
  }

  injectElement(element) {
    if (!this.children.exists(element)) {
      this.add.existing(element);
    }
  }

  removeElement(element) {
    if (this.children.exists(element)) {
      this.children.remove(element);
    }
  }
}

window.HUDScene = HUDScene;

window.game.scene.add("HUDScene", window.HUDScene, true);
