// src/funkin/play/referee/init.js

class PlayReferee {
  constructor(scene) {
    this.scene = scene;
    this.scene.referee = this;

    // 1. Entorno Gráfico Base
    this.cameras = new window.Cameras(this.scene);
    this.skins = new window.Skins(this.scene);
    this.chart = new window.Chart(this.scene);

    // 2. Stage y Entorno Musical
    this.stage = new window.Stage(this.scene);
    this.song = new window.Song(this.scene);

    // 3. Interfaz y Jugabilidad
    this.strumlines = new window.StrumlineLogic(this.scene);
    this.notesLogic = new window.NoteLogic(this.scene);
    this.sustainLogic = new window.SustainLogic(this.scene);
    this.holdCoverLogic = new window.HoldCoverLogic(this.scene);
    this.splash = new window.NoteSplashLogic(this.scene);
    this.splashLogic = new window.NoteSplashLogic(this.scene);
    this.bot = new window.BotLogic(this.scene);

    this.countdown = new window.CountDownLogic(this.scene);

    // Lógica Multijugador y de Espera (Se activa si estamos en modo Multi)
    if (window.isMultiplayer && window.MultiplayerData && window.MultiplayerData.active) {
        this.waitingLogic = new window.PlayRefereeWaiting(this.scene);
    }

    this.ratingLogic = new window.RatingLogic(this.scene || this);
    this.comboLogic = new window.ComboLogic(this.scene || this);
    this.healthLogic = new window.HealthLogic(this.scene || this);
    this.scoreLogic = new window.ScoreLogic(this.scene || this);
  }
}

window.PlayReferee = PlayReferee;
