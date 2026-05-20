class IntroDanceScene extends Phaser.Scene {
  constructor() {
    super({ key: "introDance" });
  }

  init() {
    Object.assign(this, {
      logo: null,
      gf: null,
      titleText: null,
      danceLeft: false,
      transitioning: false,
      music: null,
      cheatActive: false,
      secretBuffer: [],
      secretSequence: [
        "UI_LEFT",
        "UI_RIGHT",
        "UI_LEFT",
        "UI_RIGHT",
        "UI_UP",
        "UI_DOWN",
        "UI_UP",
        "UI_DOWN",
      ],
      hueAngle: 0,
      gfColorMatrix: null,
      logoColorMatrix: null,
      confirmTimer: null,
      startedTransition: false,
      fnfBuffer: "",
      infinityActive: false,
      infinityTime: 0,
      originalWinPos: null,
      isMovingWindow: false,
    });
  }

  create() {
    this.createAnimations();

    this.music = this.sound.getAllPlaying().find((s) => ["introMusic", "freakyMenu"].includes(s.key)) || this.sound.add("freakyMenu", { loop: true });
    if (!this.music.isPlaying) this.music.play();

    this.cameras.main.flash(1000, 255, 255, 255);

    const { width: w, height: h } = this.scale;

    const makeSp = (key, anim, xPct, yPct) => {
      let s = this.add.sprite(0, 0, key).play(anim).setOrigin(0, 0);
      return s.setPosition(w * xPct - s.displayWidth / 2, h * yPct - s.displayHeight / 2);
    };

    this.logo = makeSp("logoBumpin", "logoBump", 0.24, 0.35);
    this.gf = makeSp("gfDanceTitle", "gfDanceRight", 0.7, 0.5);

    this.titleText = this.add.sprite(0, 0, "titleText").play("titleIdle").setOrigin(0, 0);

    this.updateTitlePos = () => {
      if (this.titleText && this.titleText.active) {
        this.titleText.setPosition(
          (w - this.titleText.displayWidth) / 2,
          h * 0.85 - this.titleText.displayHeight / 2,
        );
      }
    };
    this.updateTitlePos();
    this.titleText.on("animationupdate", this.updateTitlePos);

    Conductor.events.on("beatHit", this.onBeatHit, this);

    this.inputListener = (e) => this.handleInput(e);
    window.addEventListener("keydown", this.inputListener);

    // SOPORTE TÁCTIL (Tap en cualquier parte de la pantalla)
    if (window.isMobile || window.isReactNative) {
        this.input.on('pointerdown', () => {
            if (this.transitioning) {
                this.skipConfirmDelay();
            } else {
                this.confirmSelection();
            }
        });
    }

    this.events.once("shutdown", this.shutdown, this);
  }

  update(time, delta) {
    if (this.music?.isPlaying) Conductor.update(this.music.seek * 1000);

    if (this.cheatActive) {
      this.hueAngle = (this.hueAngle + delta * 0.1) % 360;
      this.gfColorMatrix?.hue(this.hueAngle);
      this.logoColorMatrix?.hue(this.hueAngle);
    }

    if (this.infinityActive && typeof Neutralino !== "undefined") {
      this.infinityTime += delta * 0.003;
      if (!this.isMovingWindow && this.originalWinPos) {
        this.isMovingWindow = true;
        const nx = this.originalWinPos.x + 200 * Math.sin(this.infinityTime);
        const ny = this.originalWinPos.y + 100 * Math.sin(2 * this.infinityTime);
        Neutralino.window.move(Math.round(nx), Math.round(ny)).finally(() => {
          this.isMovingWindow = false;
        });
      }
    }
  }

  onBeatHit() {
    if (!this.logo || !this.logo.active) return;
    this.logo.play("logoBump", true);
    this.gf.play((this.danceLeft = !this.danceLeft) ? "gfDanceLeft" : "gfDanceRight", true);
  }

  createAnimations() {
    const getFrames = (k, p) => this.textures.get(k).getFrameNames().filter((f) => f.startsWith(p)).sort().map((f) => ({ key: k, frame: f }));

    if (!this.anims.exists("logoBump")) {
      this.anims.create({ key: "logoBump", frames: getFrames("logoBumpin", "logo bumpin"), frameRate: 24 });
    }
    if (!this.anims.exists("titleIdle")) {
      this.anims.create({ key: "titleIdle", frames: getFrames("titleText", "Press Enter to Begin"), frameRate: 24, repeat: -1 });
    }
    if (!this.anims.exists("titlePress")) {
      this.anims.create({ key: "titlePress", frames: getFrames("titleText", "ENTER PRESSED"), frameRate: 24 });
    }

    if (!this.anims.exists("gfDanceLeft") || !this.anims.exists("gfDanceRight")) {
      const texGf = this.textures.get("gfDanceTitle").getFrameNames().filter((f) => f.startsWith("gfDance")).sort();
      const mapIdx = (idxs) => idxs.map((i) => ({ key: "gfDanceTitle", frame: texGf[i] || texGf[0] }));

      if (!this.anims.exists("gfDanceLeft")) {
        this.anims.create({ key: "gfDanceLeft", frames: mapIdx([30, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]), frameRate: 24 });
      }
      if (!this.anims.exists("gfDanceRight")) {
        this.anims.create({ key: "gfDanceRight", frames: mapIdx([15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]), frameRate: 24 });
      }
    }
  }

  handleInput(e) {
    if (this.transitioning) return Controls.ACCEPT(e) && this.skipConfirmDelay();

    if (e.key) {
      this.fnfBuffer += e.key.toLowerCase();
      if (this.fnfBuffer.length > 3) this.fnfBuffer = this.fnfBuffer.slice(-3);
      if (this.fnfBuffer === "fnf") {
        this.toggleInfinityWindow();
        this.fnfBuffer = "";
      }
    }

    ["UI_LEFT", "UI_RIGHT", "UI_UP", "UI_DOWN"].forEach((k) => Controls[k](e) && this.checkSecretCode(k));

    if (Controls.ACCEPT(e)) this.confirmSelection();
    if (Controls.BACK(e)) this.gotoback();
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
      } catch (err) {}
    }
  }

  gotoback() {
    if (typeof Neutralino !== "undefined") {
      Neutralino.app.exit();
    }
  }

  checkSecretCode(key) {
    this.secretBuffer.push(key);
    if (this.secretBuffer.length > 8) this.secretBuffer.shift();
    if (!this.cheatActive && this.secretBuffer.join() === this.secretSequence.join()) this.activateSecret();
  }

  activateSecret() {
    this.cheatActive = true;
    this.cameras.main.flash(1000, 255, 255, 255);
    this.sound.play("confirmMenu");

    this.gfColorMatrix = this.gf.postFX?.addColorMatrix();
    this.logoColorMatrix = this.logo.postFX?.addColorMatrix();
    if (this.gf.anims) this.gf.anims.timeScale = 1.5;

    this.sound.stopAll();
    this.music = this.sound.add("girlfriendsRingtone", { loop: true, volume: 0 });
    this.music.play();
    this.tweens.add({ targets: this.music, volume: 1.0, duration: 4000 });
    Conductor.mapTimeChanges([new SongTimeChange(0, 160, 4, 4)]);
  }

  confirmSelection() {
    if (this.transitioning) return;
    this.transitioning = true;

    this.titleText.play("titlePress");
    this.cameras.main.flash(900, 255, 255, 255);
    this.sound.play("confirmMenu");

    if (this.cheatActive && this.music) {
      this.tweens.add({ targets: this.music, volume: 0, duration: 2500 });
    }

    this.confirmTimer = this.time.delayedCall(2500, () => this.goToMainMenu());
  }

  skipConfirmDelay() {
    if (this.confirmTimer) {
      this.confirmTimer.remove();
      this.confirmTimer = null;
      this.goToMainMenu();
    }
  }

  goToMainMenu() {
    if (this.startedTransition) return;
    this.startedTransition = true;
    window.transitionTo(this, "MainMenuScene");
  }

  shutdown() {
    Conductor.events.off("beatHit", this.onBeatHit, this);
    window.removeEventListener("keydown", this.inputListener);
    if (this.confirmTimer) {
      this.confirmTimer.remove();
      this.confirmTimer = null;
    }
    if (this.infinityActive && typeof Neutralino !== "undefined" && this.originalWinPos) {
      this.infinityActive = false;
      Neutralino.window.move(this.originalWinPos.x, this.originalWinPos.y);
    }

    if (this.gf) this.gf.postFX?.clear();
    if (this.logo) this.logo.postFX?.clear();

    this.cameras.main?.fadeEffect?.reset();
    this.cameras.main?.flashEffect?.reset();
    this.cameras.main?.clearFX();
    this.tweens.killAll();
  }
}

window.IntroDanceScene = IntroDanceScene;
window.game.scene.add("introDance", window.IntroDanceScene);
