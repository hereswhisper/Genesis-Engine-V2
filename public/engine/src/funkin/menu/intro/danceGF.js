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
    // 1. Blindar creación de animaciones
    this.createAnimations();

    // 2. Blindar música base
    try {
      this.music = this.sound.getAllPlaying().find((s) => ["introMusic", "freakyMenu"].includes(s.key));
      if (!this.music && this.cache.audio.exists("freakyMenu")) {
        this.music = this.sound.add("freakyMenu", { loop: true });
      }
      if (this.music && !this.music.isPlaying) this.music.play();
    } catch(e) {
      console.warn("Fallo al reproducir música del menú:", e);
    }

    this.cameras.main.flash(1000, 255, 255, 255);

    const { width: w, height: h } = this.scale;

    // 3. Creador de sprites con tolerancia a fallos
    const makeSp = (key, anim, xPct, yPct) => {
      let s;
      if (this.textures.exists(key)) {
        s = this.add.sprite(0, 0, key);
        if (this.anims.exists(anim)) {
            s.play(anim);
        }
      } else {
        console.warn(`[IntroDance] Textura crítica ausente: ${key}. Generando dummy para evitar crash.`);
        s = this.add.sprite(0, 0, '__DEFAULT'); // Textura verde por defecto
        s.play = function() { return this; }; // Sobreescritura dummy
      }
      return s.setOrigin(0, 0).setPosition(w * xPct - s.displayWidth / 2, h * yPct - s.displayHeight / 2);
    };

    this.logo = makeSp("logoBumpin", "logoBump", 0.24, 0.35);
    this.gf = makeSp("gfDanceTitle", "gfDanceRight", 0.7, 0.5);

    // Validar Textos
    if (this.textures.exists("titleText")) {
        this.titleText = this.add.sprite(0, 0, "titleText");
        if (this.anims.exists("titleIdle")) this.titleText.play("titleIdle");
    } else {
        this.titleText = this.add.sprite(0, 0, "__DEFAULT");
        this.titleText.play = function() { return this; };
    }
    this.titleText.setOrigin(0, 0);

    this.updateTitlePos = () => {
      if (this.titleText && this.titleText.active) {
        this.titleText.setPosition(
          (w - this.titleText.displayWidth) / 2,
          h * 0.85 - this.titleText.displayHeight / 2,
        );
      }
    };

    this.updateTitlePos();
    if (this.textures.exists("titleText")) {
        this.titleText.on("animationupdate", this.updateTitlePos);
    }

    Conductor.events.on("beatHit", this.onBeatHit, this);

    this.inputListener = (e) => this.handleInput(e);
    window.addEventListener("keydown", this.inputListener);

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
      if (this.gfColorMatrix) this.gfColorMatrix.hue(this.hueAngle);
      if (this.logoColorMatrix) this.logoColorMatrix.hue(this.hueAngle);
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

    if (this.anims.exists("logoBump")) this.logo.play("logoBump", true);

    this.danceLeft = !this.danceLeft;
    const nextAnim = this.danceLeft ? "gfDanceLeft" : "gfDanceRight";
    if (this.anims.exists(nextAnim)) {
        this.gf.play(nextAnim, true);
    }
  }

  createAnimations() {
    const getFrames = (k, p) => {
        if (!this.textures.exists(k)) return false;
        return this.textures.get(k).getFrameNames().filter((f) => f.startsWith(p)).sort().map((f) => ({ key: k, frame: f }));
    };

    let framesLogo = getFrames("logoBumpin", "logo bumpin");
    if (framesLogo && framesLogo.length > 0 && !this.anims.exists("logoBump")) {
      this.anims.create({ key: "logoBump", frames: framesLogo, frameRate: 24 });
    }

    let framesTitle = getFrames("titleText", "Press Enter to Begin");
    if (framesTitle && framesTitle.length > 0 && !this.anims.exists("titleIdle")) {
      this.anims.create({ key: "titleIdle", frames: framesTitle, frameRate: 24, repeat: -1 });
    }

    let framesTitlePress = getFrames("titleText", "ENTER PRESSED");
    if (framesTitlePress && framesTitlePress.length > 0 && !this.anims.exists("titlePress")) {
      this.anims.create({ key: "titlePress", frames: framesTitlePress, frameRate: 24 });
    }

    if (this.textures.exists("gfDanceTitle")) {
      const texGf = this.textures.get("gfDanceTitle").getFrameNames().filter((f) => f.startsWith("gfDance")).sort();

      if (texGf.length > 0) {
        const mapIdx = (idxs) => idxs.map((i) => ({ key: "gfDanceTitle", frame: texGf[i] || texGf[0] }));

        if (!this.anims.exists("gfDanceLeft")) {
          this.anims.create({ key: "gfDanceLeft", frames: mapIdx([30, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]), frameRate: 24 });
        }
        if (!this.anims.exists("gfDanceRight")) {
          this.anims.create({ key: "gfDanceRight", frames: mapIdx([15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]), frameRate: 24 });
        }
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

    if (this.cache.audio.exists("confirmMenu")) {
        this.sound.play("confirmMenu");
    }

    if (this.gf && this.gf.postFX) this.gfColorMatrix = this.gf.postFX.addColorMatrix();
    if (this.logo && this.logo.postFX) this.logoColorMatrix = this.logo.postFX.addColorMatrix();

    // Solo cambiar scale si existe currentAnim (es un dummy o anim real)
    if (this.gf && this.gf.anims && this.gf.anims.currentAnim) {
        this.gf.anims.timeScale = 1.5;
    }

    this.sound.stopAll();

    if (this.cache.audio.exists("girlfriendsRingtone")) {
        this.music = this.sound.add("girlfriendsRingtone", { loop: true, volume: 0 });
        this.music.play();
        this.tweens.add({ targets: this.music, volume: 1.0, duration: 4000 });
    }

    Conductor.mapTimeChanges([new SongTimeChange(0, 160, 4, 4)]);
  }

  confirmSelection() {
    if (this.transitioning) return;
    this.transitioning = true;

    if (this.anims.exists("titlePress")) {
        this.titleText.play("titlePress");
    }
    this.cameras.main.flash(900, 255, 255, 255);

    if (this.cache.audio.exists("confirmMenu")) {
        this.sound.play("confirmMenu");
    }

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
