// src/funkin/play/UI/countDown/logic.js

class CountDownLogic {
  constructor(scene) {
    this.scene = scene;

    const bpm = this.scene.referee.song.bpm || 100;
    this.crochet = (60 / bpm) * 1000;

    this.renderer = new window.CountDownRenderer(this.scene, this.crochet);
    this.currentStep = 0;

    // Variable para permitir o bloquear el inicio del conteo.
    // Por defecto es true. Otros archivos pueden cambiarla a false.
    this.allowCountdown = true;

    // Retrasamos el inicio 1 frame (0 delay) para dar tiempo a otros
    // scripts o eventos de cambiar `allowCountdown` a false antes de que inicie.
    this.scene.time.delayedCall(0, () => {
      if (this.allowCountdown) {
        this.start();
      }
    });
  }

  start() {
    this.tick();
    this.timer = this.scene.time.addEvent({
      delay: this.crochet,
      callback: this.tick,
      callbackScope: this,
      repeat: 4,
    });
  }

  tick() {
    if (this.currentStep < 4) {
      this.renderer.render(this.currentStep);
    } else if (this.currentStep === 4) {
      this.scene.events.emit("startSong");
      console.log("[CountDown] Conteo finalizado. Arrancando canción.");
    }
    this.currentStep++;
  }

  // Método útil para que otros archivos arranquen el conteo manualmente
  // una vez que sus eventos previos (ej. cinemáticas) hayan terminado.
  startManual() {
    if (!this.allowCountdown) {
      this.allowCountdown = true;
      this.start();
    }
  }
}

window.CountDownLogic = CountDownLogic;
