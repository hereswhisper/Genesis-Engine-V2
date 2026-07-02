// src/funkin/play/referee/pause.js

class PlayRefereePause {
  constructor(scene) {
    this.scene = scene;
    this.isPaused = false;

    this.onKeyDown = (e) => {
      if (e.repeat) return;

      // Lógica de seguridad: Solo pausar si el juego NO está pausado
      // y si la canción realmente ha empezado (instTrack existe y suena)
      const song = this.scene.referee.song;
      const songStarted = song && song.instTrack && song.hasStarted;

      if (
        !this.isPaused &&
        songStarted &&
        window.Controls &&
        window.Controls.PAUSE(e)
      ) {
        this.togglePause();
      }
    };

    window.addEventListener("keydown", this.onKeyDown);
    this.scene.events.once("shutdown", this.shutdown, this);
  }

  togglePause() {
    if (window.isMultiplayerWaiting) return;

    this.isPaused = !this.isPaused;
    window.isGamePaused = this.isPaused;

    if (this.isPaused) {
      // Pausar audios
      if (this.scene.referee.song) {
        if (this.scene.referee.song.instTrack)
          this.scene.referee.song.instTrack.pause();
        if (this.scene.referee.song.playerTrack)
          this.scene.referee.song.playerTrack.pause();
        if (this.scene.referee.song.opponentTrack)
          this.scene.referee.song.opponentTrack.pause();
      }

      this.scene.scene.pause();
      this.scene.events.emit("gamePaused");
      this.scene.scene.launch("PauseScene", { referee: this.scene.referee });
    } else {
      // Reanudar audios
      if (this.scene.referee.song) {
        if (this.scene.referee.song.instTrack)
          this.scene.referee.song.instTrack.resume();
        if (this.scene.referee.song.playerTrack)
          this.scene.referee.song.playerTrack.resume();
        if (this.scene.referee.song.opponentTrack)
          this.scene.referee.song.opponentTrack.resume();
      }

      this.scene.scene.resume();
      this.scene.events.emit("gameResumed");
    }
  }

  update(time, delta) {}

  shutdown() {
    window.isGamePaused = false;
    window.removeEventListener("keydown", this.onKeyDown);
  }
}

window.PlayRefereePause = PlayRefereePause;
