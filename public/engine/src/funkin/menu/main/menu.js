class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenuScene" });
  }

  preload() {
    // Rutas de fondo
    this.load.image("menuBG", Path.menu + "bg/menuBG.png");
    this.load.image("menuBGMagenta", Path.menu + "bg/menuDesat.png");

    this.itemNames = ["freeplay", "multiplayer", 'options'];

    // Carga secuencial de Atlas
    this.itemNames.forEach((item) => {
      this.load.atlasXML(
        item,
        `${Path.menuMain}${item}.png`,
        `${Path.menuMain}${item}.xml`,
      );
    });

    // Audios de interfaz
    this.load.audio("scrollMenu", Path.sounds + "menu/scrollMenu.ogg");
    this.load.audio("confirmMenu", Path.sounds + "menu/confirmMenu.ogg");
    this.load.audio("cancelMenu", Path.sounds + "menu/cancelMenu.ogg");

    // Pista base
    this.load.audio("freakyMenu", Path.music + "freakyMenu.ogg");
  }

  create() {
    this.menuItems = [];
    this.canInteract = false;
    this.selectedIndex = window.MainMenuState_rememberedIndex || 0;

    // Lógica de música continua
    this.music = this.sound
      .getAllPlaying()
      .find((s) => ["introMusic", "freakyMenu"].includes(s.key));
    if (!this.music) {
      this.music = this.sound.add("freakyMenu", { loop: true });
    }
    if (!this.music.isPlaying) this.music.play();

    const { width: w, height: h } = this.scale;

    // Fondos
    this.bg = this.add
      .sprite(w / 2, h / 2, "menuBG")
      .setScrollFactor(0, 0.17)
      .setScale(1.2)
      .setOrigin(0.5);
    this.magenta = this.add
      .sprite(w / 2, h / 2, "menuBGMagenta")
      .setScrollFactor(0, 0.17)
      .setScale(1.2)
      .setOrigin(0.5)
      .setTint(0xfd719b)
      .setVisible(false);

    const spacing = 160;
    const top = (h - spacing * (this.itemNames.length - 1)) / 2;

    // Generación de ítems
    this.itemNames.forEach((name, i) => {
      this.createAnims(name);

      let item = this.add
        .sprite(w / 2, top + spacing * i, name)
        .setScrollFactor(0, 0.4)
        .setOrigin(0.5);
      item.nameID = name;
      this.menuItems.push(item);
    });

    // Configuración de cámara
    this.camFollow = this.add.zone(w / 2, h / 2, 1, 1);
    this.cameras.main.startFollow(this.camFollow, false, 0.06, 0.06);

    this.changeSelection(0, false);
    this.canInteract = true;

    // --- ENTRADAS ---

    // 1. Teclado / Gamepad
    this.inputListener = (e) => this.handleInput(e);
    window.addEventListener("keydown", this.inputListener);

    // 2. Rueda del ratón (Wheel)
    this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.canInteract) return;
      if (deltaY > 0) this.changeSelection(1);
      else if (deltaY < 0) this.changeSelection(-1);
    });

    // 3. Controles táctiles (Deslizar/Tap en Mobile)
    let startY = 0;
    this.input.on("pointerdown", (pointer) => {
      startY = pointer.y;
    });

    this.input.on("pointerup", (pointer) => {
      if (!this.canInteract || !window.isMobile) return;

      let diffY = pointer.y - startY;

      // Umbral de 30 píxeles para considerar que fue un deslizamiento
      if (diffY < -30) {
        this.changeSelection(1); // Deslizar arriba -> bajar en el menú
      } else if (diffY > 30) {
        this.changeSelection(-1); // Deslizar abajo -> subir en el menú
      } else if (Math.abs(diffY) < 10) {
        // Si no se movió casi nada, es un tap (toque) para confirmar
        this.confirmSelection();
      }
    });

    // Limpieza de eventos
    this.events.once("shutdown", this.cleanup, this);
  }

  update() {
    if (this.music?.isPlaying) Conductor.update(this.music.seek * 1000);
  }

  createAnims(key) {
    if (this.anims.exists(key + "_idle")) return;

    const frameNames = this.textures.get(key).getFrameNames();

    // Filtro flexible: extrae cualquier frame que contenga "idle" o "basic"
    const idleFrames = frameNames
      .filter(
        (f) =>
          f.toLowerCase().includes("idle") || f.toLowerCase().includes("basic"),
      )
      .sort()
      .map((f) => ({ key, frame: f }));

    // Filtro flexible: extrae cualquier frame que contenga "selected" o "white"
    const selectedFrames = frameNames
      .filter(
        (f) =>
          f.toLowerCase().includes("selected") ||
          f.toLowerCase().includes("white"),
      )
      .sort()
      .map((f) => ({ key, frame: f }));

    if (idleFrames.length > 0) {
      this.anims.create({
        key: key + "_idle",
        frames: idleFrames,
        frameRate: 24,
        repeat: -1,
      });
    }
    if (selectedFrames.length > 0) {
      this.anims.create({
        key: key + "_selected",
        frames: selectedFrames,
        frameRate: 24,
        repeat: -1,
      });
    }
  }

  handleInput(e) {
    if (!this.canInteract) return;

    if (Controls.UI_UP(e)) this.changeSelection(-1);
    else if (Controls.UI_DOWN(e)) this.changeSelection(1);
    else if (Controls.ACCEPT(e)) this.confirmSelection();
    else if (Controls.BACK(e)) this.goBack();

    if (window.isMobile || window.isReactNative) {
      let startY = 0;

      this.input.on("pointerdown", (pointer) => {
        startY = pointer.y;
      });

      this.input.on("pointerup", (pointer) => {
        let diffY = pointer.y - startY;

        // Margen de 60 píxeles para reconocer como scroll en lugar de tap
        if (Math.abs(diffY) > 60) {
          if (diffY > 0) {
            this.changeSelection(-1);
            this.dispatchSyntheticKey(38); // Tecla Arriba
          } else {
            this.changeSelection(1);
            this.dispatchSyntheticKey(40); // Tecla Abajo
          }
        } else {
          this.confirmSelection(); // Si el movimiento es muy corto, se toma como TAP
        }
      });
    }
  }

  changeSelection(change, playSound = true) {
    if (change !== 0 && playSound) this.sound.play("scrollMenu");

    this.selectedIndex = Phaser.Math.Wrap(
      this.selectedIndex + change,
      0,
      this.menuItems.length,
    );

    this.menuItems.forEach((item, i) => {
      const isSelected = i === this.selectedIndex;
      const animKey = item.nameID + (isSelected ? "_selected" : "_idle");

      if (this.anims.exists(animKey)) {
        item.play(animKey, true);
      } else {
        console.warn(
          `[MainMenu] Animación ${animKey} no encontrada para ${item.nameID}`,
        );
      }

      if (isSelected) this.camFollow.setPosition(item.x, item.y);
    });
  }

  confirmSelection() {
    this.canInteract = false;
    this.sound.play("confirmMenu");
    window.MainMenuState_rememberedIndex = this.selectedIndex;

    const selectedItem = this.menuItems[this.selectedIndex];

    this.flicker(this.magenta, 1100, 150, false);
    this.flicker(selectedItem, 1000, 60, true, () =>
      this.executeTransition(selectedItem.nameID),
    );

    this.menuItems.forEach((item, i) => {
      if (i !== this.selectedIndex) {
        this.tweens.add({
          targets: item,
          alpha: 0,
          duration: 400,
          ease: "Quad.Out",
        });
      }
    });
  }

  flicker(target, duration, interval, endVisible, onComplete) {
    if (!target) return;
    let count = Math.floor(duration / interval);

    this.time.addEvent({
      delay: interval,
      repeat: count,
      callback: () => {
        target.visible = !target.visible;
        if (count-- <= 0) {
          target.visible = endVisible;
          if (onComplete) onComplete();
        }
      },
    });
  }

  executeTransition(id) {
    const scenes = {
      storymode: "StoryMenuScene",
      multiplayer: "MultiplayerScene",
      freeplay: "FreeplayScene",
      options: "OptionsMenuScene",
      credits: "CreditsScene",
    };
    const nextScene = scenes[id] || id;

    if (window.transitionTo) {
      window.transitionTo(this, nextScene);
    } else {
      this.scene.start(nextScene);
    }
  }

  goBack() {
    this.canInteract = false;
    this.sound.play("cancelMenu");

    if (window.transitionTo) {
      window.transitionTo(this, "introDance");
    } else {
      this.scene.start("introDance");
    }
  }

  cleanup() {
    window.removeEventListener("keydown", this.inputListener);
  }
}

window.MainMenuScene = MainMenuScene;
if (window.game && window.game.scene) {
    try {
        window.game.scene.remove("MainMenuScene");
    } catch (e) {}
    window.game.scene.add("MainMenuScene", window.MainMenuScene);
}
