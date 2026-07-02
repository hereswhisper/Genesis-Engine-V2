// src/funkin/play/UI/pause/PauseScene.js
class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: "PauseScene" });
  }

  init(data) {
    this.referee = data.referee;
    // Comprobar si la escena actual corre bajo modo multijugador
    this.isMultiplayer =
      data.isMultiplayer ||
      (data.referee &&
        data.referee.scene &&
        data.referee.scene.isMultiplayer) ||
      window.isMultiplayer ||
      false;
  }

  preload() {
    if (!this.textures.exists("checkboxThingie")) {
      const pathOptions =
        window.Path && window.Path.menuOptions
          ? window.Path.menuOptions
          : "assets/images/menu/options/";
      this.load.atlasXML(
        "checkboxThingie",
        pathOptions + "checkboxThingie.png",
        pathOptions + "checkboxThingie.xml",
      );
    }

    // Cargar dinámicamente el audio estructurado en el JSON desde Path.music
    this.logic = new window.PauseMenuLogic(this);
    const musicData = this.logic.menuStructure.music;
    if (musicData && musicData.path) {
      const musicPath =
        (window.Path && window.Path.music
          ? window.Path.music
          : "assets/music/") + musicData.path;
      this.load.audio(musicData.id, musicPath);
    }
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.bg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0);
    this.tweens.add({
      targets: this.bg,
      fillAlpha: 0.6,
      duration: 400,
      ease: "Quarter.easeInOut",
    });

    this.renderer = new window.PauseMenuRenderer(this);
    this.renderer.buildMenu(
      this.logic.currentMenu.options,
      this.logic.curSelected,
      0,
    );

    // Reproducción en bucle a 0.8 volumen inicial
    const musicData = this.logic.menuStructure.music;
    if (musicData && musicData.id && this.cache.audio.exists(musicData.id)) {
      this.sound.stopByKey(musicData.id);
      this.pauseMusic = this.sound.add(musicData.id, {
        loop: musicData.loop !== undefined ? musicData.loop : true,
        volume: 0.8,
      });
      this.pauseMusic.play();
    }

    // Si es partida multijugador, forzar la continuidad visual del PlayScene en segundo plano
    if (this.isMultiplayer && this.referee && this.referee.scene) {
      this.referee.scene.scene.resume();
      window.isGamePaused = false;
      if (this.referee.pauseLogic) this.referee.pauseLogic.isPaused = false;
    }

    this.events.on("pauseAction", this.handleAction, this);

    this.inputListener = (e) => this.handleInput(e);
    setTimeout(() => {
      window.addEventListener("keydown", this.inputListener);
    }, 300);

    this.input.on("wheel", (pointer, gameObjects, dx, dy) => {
      if (dy > 0) this.doChangeSelection(1);
      else if (dy < 0) this.doChangeSelection(-1);
    });
  }

  updateMusicEffect() {
    if (!this.pauseMusic) return;
    // Si hay historial de navegación, significa que estamos dentro de una subopción (efecto ahogado)
    if (this.logic.history.length > 0) {
      this.pauseMusic.setVolume(0.25);
      if (typeof this.pauseMusic.setRate === "function")
        this.pauseMusic.setRate(0.75);
    } else {
      this.pauseMusic.setVolume(0.8);
      if (typeof this.pauseMusic.setRate === "function")
        this.pauseMusic.setRate(1.0);
    }
  }

  handleInput(e) {
    if (e.repeat || !window.Controls) return;

    if (window.Controls.UI_UP(e)) {
      this.doChangeSelection(-1);
    } else if (window.Controls.UI_DOWN(e)) {
      this.doChangeSelection(1);
    } else if (window.Controls.UI_LEFT(e) || window.Controls.UI_RIGHT(e)) {
      const opt = this.logic.currentMenu.options[this.logic.curSelected];
      if (opt.action === "selector") {
        const change = window.Controls.UI_LEFT(e) ? -1 : 1;
        const newVal = this.logic.changeSelectorPreference(
          opt.pref,
          opt.options,
          change,
        );

        if (this.cache.audio.exists("scrollMenu"))
          this.sound.play("scrollMenu");
        this.renderer.updateSelector(this.logic.curSelected, opt.label, newVal);

        if (
          this.referee &&
          typeof this.referee.updatePreferences === "function"
        ) {
          this.referee.updatePreferences();
        }
      }
    } else if (window.Controls.ACCEPT(e)) {
      const opt = this.logic.currentMenu.options[this.logic.curSelected];

      if (opt.action === "submenu") {
        const dir = this.logic.navigateForward(opt.submenu);
        this.rebuildUI(dir);
        this.updateMusicEffect();
      } else if (opt.action === "back") {
        const dir = this.logic.navigateBack();
        if (dir !== 0) this.rebuildUI(dir);
        this.updateMusicEffect();
      } else if (opt.action === "toggle" && opt.type === "check") {
        const isNowTrue = this.logic.togglePreference(opt.pref);

        if (isNowTrue) {
          if (this.cache.audio.exists("confirmMenu"))
            this.sound.play("confirmMenu");
        } else {
          if (this.cache.audio.exists("cancelMenu"))
            this.sound.play("cancelMenu");
        }
        this.renderer.updateCheckbox(this.logic.curSelected, isNowTrue);

        if (
          this.referee &&
          typeof this.referee.updatePreferences === "function"
        ) {
          this.referee.updatePreferences();
        }
      } else {
        this.logic.executeAction(opt.action, opt);
      }
    } else if (window.Controls.PAUSE(e) || window.Controls.BACK(e)) {
      const dir = this.logic.navigateBack();
      if (dir !== 0) {
        this.rebuildUI(dir);
        this.updateMusicEffect();
      }
    }
  }

  doChangeSelection(change) {
    this.logic.changeSelection(change);
    this.renderer.updateSelection(this.logic.curSelected);
    if (change !== 0 && this.cache.audio.exists("scrollMenu"))
      this.sound.play("scrollMenu");
  }

  rebuildUI(dir) {
    this.renderer.buildMenu(
      this.logic.currentMenu.options,
      this.logic.curSelected,
      dir,
    );
    if (this.cache.audio.exists("scrollMenu")) this.sound.play("scrollMenu");
  }

  update(time, delta) {
    if (this.renderer) this.renderer.update(delta);
  }

  handleAction(action) {
    switch (action) {
      case "resume":
        this.closePauseMenu();
        break;
      case "restart":
        this.cleanupInputs();
        window.isGamePaused = false;
        if (this.referee.pauseLogic) this.referee.pauseLogic.isPaused = false;
        if (this.referee.song) this.referee.song.shutdown();
        this.scene.stop();
        this.referee.scene.scene.restart();
        break;
      case "exit":
        this.cleanupInputs();
        window.isGamePaused = false;
        if (this.referee.pauseLogic) this.referee.pauseLogic.isPaused = false;
        if (this.referee.song) this.referee.song.shutdown();
        this.scene.stop();
        const target =
          this.referee.scene.playData.origin === "freeplay"
            ? "FreeplayScene"
            : "MainMenuScene";
        window.transitionTo
          ? window.transitionTo(this.referee.scene, target)
          : this.referee.scene.scene.start(target);
        break;
    }
  }

  cleanupInputs() {
    window.removeEventListener("keydown", this.inputListener);
    this.input.off("wheel");
    this.events.off("pauseAction");
    if (this.pauseMusic) {
      this.pauseMusic.stop();
      this.pauseMusic.destroy();
      this.pauseMusic = null;
    }
  }

  closePauseMenu() {
    this.cleanupInputs();
    // Si es multijugador, no llamamos a togglePause() para evitar alterar los estados de sincronización remotos
    if (!this.isMultiplayer && this.referee && this.referee.pauseLogic) {
      this.referee.pauseLogic.togglePause();
    }
    this.scene.stop();
  }
}

window.PauseScene = PauseScene;
if (window.game) window.game.scene.add("PauseScene", window.PauseScene);
