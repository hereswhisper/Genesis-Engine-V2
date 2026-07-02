// src/funkin/play/PlayScene.js

class PlayScene extends Phaser.Scene {
  constructor() {
    super({ key: "PlayScene" });
  }

  init() {
    // Intento temprano para entornos web
    if (window.Preferences && typeof window.Preferences.init === "function") {
      window.Preferences.init();
    }
    this.playData = new window.PlayData(this);
  }

  preload() {
    window.PlayRefereePreload.execute(this);
  }

  create() {
    // FIX DE LOCALSTORAGE (NEUTRALINO):
    // Para el momento en que ocurre 'create', la sincronización asíncrona de
    // NeutralinoFS que arrojaba null en init ya terminó. Forzamos recarga.
    if (window.Preferences && typeof window.Preferences.init === "function") {
      window.Preferences.init();
    }

    this.sound.stopAll();

    this.referee = new window.PlayReferee(this);

    this.events.once("shutdown", () => {
      window.PlayRefereeShutdown.execute(this.referee);
    });
  }

  update(time, delta) {
    window.PlayRefereeUpdate.execute(this.referee, time, delta);
  }
}

window.PlayScene = PlayScene;
window.game.scene.add("PlayScene", window.PlayScene);
