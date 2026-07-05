// src/funkin/play/referee/init.js
class PlayReferee {
  constructor(scene) {
    this.scene = scene;
    this.scene.referee = this;

    this.cameras = new window.Cameras(this.scene);
    this.skins = new window.Skins(this.scene);
    this.charsData = new window.CharsData(this.scene);
    this.chart = new window.Chart(this.scene);
    this.stage = new window.Stage(this.scene);

    this.song = new window.Song(this.scene);

    this.strumlines = new window.StrumlineLogic(this.scene);
    this.notesLogic = new window.NoteLogic(this.scene);
    this.sustainLogic = new window.SustainLogic(this.scene);
    this.holdCoverLogic = new window.HoldCoverLogic(this.scene);

    this.splash = new window.NoteSplashLogic(this.scene);
    this.splashLogic = new window.NoteSplashLogic(this.scene);
    this.bot = new window.BotLogic(this.scene);

    this.pauseLogic = new window.PlayRefereePause(this.scene);
    this.countdown = new window.CountDownLogic(this.scene);

    if (
      window.isMultiplayer &&
      window.MultiplayerData &&
      window.MultiplayerData.active
    ) {
      this.waitingLogic = new window.PlayRefereeWaiting(this.scene);
    }

    this.ratingLogic = new window.RatingLogic(this.scene || this);
    this.comboLogic = new window.ComboLogic(this.scene || this);
    this.healthLogic = new window.HealthLogic(this.scene || this);
    this.scoreLogic = new window.ScoreLogic(this.scene || this);
  }

  updatePreferences() {
    const currentTime =
      window.Conductor && window.Conductor.songPosition !== undefined
        ? window.Conductor.songPosition
        : 0;

    if (
      this.strumlines &&
      typeof this.strumlines.updatePreferences === "function"
    ) {
      this.strumlines.updatePreferences();
    }
    if (this.strumlines && typeof this.strumlines.update === "function") {
      this.strumlines.update(currentTime, 0);
    }

    this.refreshStrumlineLanes();

    if (
      this.healthLogic &&
      typeof this.healthLogic.updatePreferences === "function"
    ) {
      this.healthLogic.updatePreferences();
    }
    if (this.healthLogic && typeof this.healthLogic.update === "function") {
      this.healthLogic.update(currentTime, 0);
    }
    if (this.healthLogic && typeof this.healthLogic.updateBar === "function") {
      this.healthLogic.updateBar();
    }

    if (
      this.notesLogic &&
      typeof this.notesLogic.updatePreferences === "function"
    ) {
      this.notesLogic.updatePreferences();
    }
    if (this.notesLogic && typeof this.notesLogic.update === "function") {
      this.notesLogic.update(currentTime, 0);
    }

    if (
      this.sustainLogic &&
      typeof this.sustainLogic.updatePreferences === "function"
    ) {
      this.sustainLogic.updatePreferences();
    }
    if (this.sustainLogic && typeof this.sustainLogic.update === "function") {
      this.sustainLogic.update(currentTime, 0);
    }

    if (
      this.scoreLogic &&
      typeof this.scoreLogic.updatePreferences === "function"
    ) {
      this.scoreLogic.updatePreferences();
    }
  }

  refreshStrumlineLanes() {
    const middleScroll = window.Preferences
      ? window.Preferences.middleScroll
      : "none";
    // Ahora recupera la opacidad global recién guardada sin errores
    const laneOpacity =
      window.Preferences && window.Preferences.laneOpacity !== undefined
        ? parseFloat(window.Preferences.laneOpacity)
        : 0.7;

    const applyToLanes = (children) => {
      if (!children) return;
      children.forEach((child) => {
        if (child.list) applyToLanes(child.list);

        const name = (child.name || "").toLowerCase();
        const key = (child.texture ? child.texture.key : "").toLowerCase();

        if (
          name.includes("lane") ||
          name.includes("strumlinebg") ||
          name.includes("underlay") ||
          name.includes("board") ||
          key.includes("lane") ||
          key.includes("underlay")
        ) {
          child.setAlpha(laneOpacity);

          if (
            name.includes("op") ||
            name.includes("enemy") ||
            name.includes("opponent")
          ) {
            child.setVisible(middleScroll === "none");
          }
        }
      });
    };

    if (this.scene && this.scene.children) {
      applyToLanes(this.scene.children.list);
    }

    // Esto abarca carriles adicionales introducidos por skins custom
    if (this.strumlines) {
      [
        "playerLane",
        "opponentLane",
        "lane",
        "laneBg",
        "bg",
        "laneBackground",
        "underlay",
        "playerUnderlay",
        "opponentUnderlay"
      ].forEach((prop) => {
        if (
          this.strumlines[prop] &&
          typeof this.strumlines[prop].setAlpha === "function"
        ) {
          this.strumlines[prop].setAlpha(laneOpacity);
          if (prop.toLowerCase().includes("opponent") || prop.toLowerCase().includes("op")) {
            this.strumlines[prop].setVisible(middleScroll === "none");
          }
        }
      });
    }
  }
}

window.PlayReferee = PlayReferee;