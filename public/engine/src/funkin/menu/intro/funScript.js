window.funkin = window.funkin || {};
window.funkin.ui = window.funkin.ui || {};
window.funkin.ui.intro = window.funkin.ui.intro || {};

class FunScript {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.secretMusic = null;
    this.inputBuffer = [];
    this.hueOffset = 0;
    this.beatCounter = 0;

    this.sequence = [
      "LEFT",
      "RIGHT",
      "LEFT",
      "RIGHT",
      "UP",
      "DOWN",
      "UP",
      "DOWN",
    ];

    this.fnfBuffer = "";
    this.infinityActive = false;
    this.infinityTime = 0;
    this.originalWinPos = null;
    this.isMovingWindow = false;

    this.keyListener = (e) => this.handleTextCode(e);
    window.addEventListener("keydown", this.keyListener);

    // SOPORTE TÁCTIL (Swipe para meter el código en móvil)
    if (window.isMobile || window.isReactNative) {
      let startX = 0,
        startY = 0;
      this.scene.input.on("pointerdown", (p) => {
        startX = p.x;
        startY = p.y;
      });
      this.scene.input.on("pointerup", (p) => {
        let dx = p.x - startX;
        let dy = p.y - startY;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (Math.abs(dx) > 30) this.checkInput(dx > 0 ? "RIGHT" : "LEFT");
        } else {
          if (Math.abs(dy) > 30) this.checkInput(dy > 0 ? "DOWN" : "UP");
        }
      });
    }

    this.scene.events.on("update", this.updateInfinity, this);
    this.scene.events.once("shutdown", this.cleanup, this, this);
  }

  handleTextCode(e) {
    if (e.key) {
      this.fnfBuffer += e.key.toLowerCase();
      if (this.fnfBuffer.length > 3) this.fnfBuffer = this.fnfBuffer.slice(-3);
      if (this.fnfBuffer === "fnf") {
        this.toggleInfinityWindow();
        this.fnfBuffer = "";
      }
    }
  }

  async toggleInfinityWindow() {
    if (typeof Neutralino === "undefined") return;

    if (this.infinityActive) {
      this.infinityActive = false;
      if (this.originalWinPos) {
        Neutralino.window.move(this.originalWinPos.x, this.originalWinPos.y);
      }
    } else {
      try {
        this.originalWinPos = await Neutralino.window.getPosition();
        this.infinityTime = 0;
        this.infinityActive = true;
      } catch (e) {}
    }
  }

  updateInfinity(time, delta) {
    if (this.infinityActive && typeof Neutralino !== "undefined") {
      this.infinityTime += delta * 0.003;
      if (!this.isMovingWindow && this.originalWinPos) {
        this.isMovingWindow = true;
        const nx = this.originalWinPos.x + 200 * Math.sin(this.infinityTime);
        const ny =
          this.originalWinPos.y + 100 * Math.sin(2 * this.infinityTime);
        Neutralino.window.move(Math.round(nx), Math.round(ny)).finally(() => {
          this.isMovingWindow = false;
        });
      }
    }
  }

  cleanup() {
    window.removeEventListener("keydown", this.keyListener);
    this.scene.events.off("update", this.updateInfinity, this);
    if (
      this.infinityActive &&
      typeof Neutralino !== "undefined" &&
      this.originalWinPos
    ) {
      Neutralino.window.move(this.originalWinPos.x, this.originalWinPos.y);
    }
  }

  update() {
    if (this.active) return;
    if (Controls.UI_LEFT_P) this.checkInput("LEFT");
    else if (Controls.UI_RIGHT_P) this.checkInput("RIGHT");
    else if (Controls.UI_UP_P) this.checkInput("UP");
    else if (Controls.UI_DOWN_P) this.checkInput("DOWN");
  }

  checkInput(key) {
    this.inputBuffer.push(key);
    if (this.inputBuffer.length > this.sequence.length)
      this.inputBuffer.shift();

    if (this.checkBufferMatch()) {
      this.activateSecretMode();
      this.inputBuffer = [];
    }
  }

  checkBufferMatch() {
    if (this.inputBuffer.length !== this.sequence.length) return false;
    for (let i = 0; i < this.sequence.length; i++) {
      if (this.inputBuffer[i] !== this.sequence[i]) return false;
    }
    return true;
  }

  activateSecretMode() {
    this.active = true;

    try {
      if (navigator.vibrate) navigator.vibrate(70);
    } catch (e) {}

    this.scene.sound.stopAll();
    this.scene.sound.play("confirmMenu", { volume: 1.0 });
    this.scene.cameras.main.flash(1000, 255, 255, 255);

    this.hueOffset = 0.125;
    this.scene.registry.set("hueOffset", this.hueOffset);
    this.applyShader();

    if (this.scene.gf && this.scene.gf.anims) {
      this.scene.gf.anims.timeScale = 1.5;
    }

    this.secretMusic = this.scene.sound.add("girlfriendsRingtone", {
      loop: true,
      volume: 0,
    });
    this.secretMusic.play();
    this.scene.tweens.add({
      targets: this.secretMusic,
      volume: 1.0,
      duration: 4000,
    });

    this.scene.time.addEvent({
      delay: 60000 / 160,
      loop: true,
      callback: () => this.beatHit(),
    });
  }

  applyShader() {
    if (this.scene.game.renderer.type !== Phaser.WEBGL) return;

    const pipelineName = "RainbowShader";

    if (!this.scene.renderer.pipelines.has(pipelineName)) {
      const fragShader = this.scene.cache.text.get("rainbowShader");
      if (!fragShader) return;

      class RainbowPipeline
        extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline
      {
        constructor(game) {
          super({ game: game, renderTarget: true, fragShader: fragShader });
        }
        onPreRender() {
          this.set1f("uTime", this.game.registry.get("hueOffset") || 0);
        }
      }
      this.scene.renderer.pipelines.addPostPipeline(
        pipelineName,
        RainbowPipeline,
      );
    }

    if (this.scene.gf) this.scene.gf.setPostPipeline(pipelineName);
    if (this.scene.logo) this.scene.logo.setPostPipeline(pipelineName);
  }

  beatHit() {
    if (!this.active) return;
    this.beatCounter++;
    if (this.beatCounter % 4 === 0) {
      this.hueOffset += 0.125;
      this.scene.registry.set("hueOffset", this.hueOffset);
    }
  }
}

window.funkin.ui.intro.FunScript = FunScript;
