// src/funkin/play/UI/arrows/notes/logic.js
class NoteLogic {
  constructor(scene) {
    this.scene = scene;
    this.strumlines = this.scene.referee.strumlines;
    const rawNotes = this.scene.referee.chart.getNotes() || [];
    this.chartNotes = rawNotes
      .map((n) => ({
        ...n,
        t: Number(n.t),
        d: Number(n.d),
        l: Number(n.l || 0),
      }))
      .sort((a, b) => a.t - b.t);

    this.dirs = Object.keys(this.strumlines.animations);
    this.activeNotes = this.scene.add.group();
    this.noteIndex = 0;
    this.scrollSpeed = Number(this.scene.playData.get("scrollSpeed", 2.0));

    this.interpolatedTime = undefined;
  }

  _isLocal(isOpponentSide) {
    const isMultiplayer = window.isMultiplayer || false;
    const playerEnemy = isMultiplayer
      ? window.MultiplayerData && !window.MultiplayerData.isHost
      : window.Preferences
        ? window.Preferences.playerEnemy
        : false;
    return playerEnemy ? isOpponentSide : !isOpponentSide;
  }

  update(time, delta) {
    if (window.isMultiplayerWaiting) return;

    const realSongTime =
      window.Conductor && window.Conductor.songPosition !== undefined
        ? window.Conductor.songPosition
        : 0;

    if (
      this.interpolatedTime === undefined ||
      Math.abs(realSongTime - this.interpolatedTime) > 100
    ) {
      this.interpolatedTime = realSongTime;
    } else {
      const lerpFactor = 1.0 - Math.exp(-25 * (delta / 1000));
      this.interpolatedTime +=
        (realSongTime - this.interpolatedTime) * lerpFactor;
    }

    const spawnThreshold = 4500;

    while (this.noteIndex < this.chartNotes.length) {
      const noteData = this.chartNotes[this.noteIndex];
      if (noteData.t - realSongTime <= spawnThreshold) {
        this.spawnNote(noteData);
        this.noteIndex++;
      } else {
        break;
      }
    }

    if (!this.activeNotes || !this.activeNotes.scene) return;

    this.activeNotes.getChildren().forEach((note) => {
      const isOpponentSide = note.noteData.p === "op";
      const isLocalNote = this._isLocal(isOpponentSide);

      let renderTime = this.interpolatedTime;
      if (!isLocalNote && window.isMultiplayer) {
        renderTime -= window.NetworkLatency || 0;
      }

      note.updatePos(renderTime, this.scrollSpeed);

      const diff = realSongTime - note.noteData.t;
      const strumDownscroll = note.strumTarget
        ? note.strumTarget.downscroll
        : false;

      if (!note.isMissed && diff > window.Judgment.PBOT1_MISS_THRESHOLD) {
        if (!isLocalNote && window.isMultiplayer) {
          note.isMissed = true;
          note.setAlpha(0.3);

          const muteEnemy = window.Preferences
            ? window.Preferences.muteMissNoteEnemy
            : false;
          if (!muteEnemy && this.scene.scoreLogic) {
            this.scene.scoreLogic.playMissSound();
          }
          return;
        }

        if (window.Health) {
          window.Health.applyMiss(isOpponentSide);
          window.Health.checkGameOver(this.scene);
        }
        this.scene.events.emit("noteMiss", {
          note,
          health: window.Health ? window.Health.currentHealth : 1.0,
        });

        note.isMissed = true;
        note.setAlpha(0.3);
      }

      if (!strumDownscroll && note.y < -250) {
        note.destroy();
      } else if (strumDownscroll && note.y > this.scene.scale.height + 250) {
        note.destroy();
      }
    });
  }

  spawnNote(noteData) {
    const isPlayer = noteData.p === "pl";
    const strumsGroup = isPlayer
      ? this.strumlines.playerStrums
      : this.strumlines.opponentStrums;
    if (!strumsGroup || !strumsGroup.scene) return;

    const directionName = this.dirs[noteData.d];
    const targetStrum = strumsGroup
      .getChildren()
      .find((s) => s.direction === directionName);

    if (targetStrum) {
      const note = new window.Note(this.scene, noteData, targetStrum);
      if (this.scene.referee.cameras) {
        this.scene.referee.cameras.add(note, "ui");
      }
      this.activeNotes.add(note);

      if (noteData.l > 0 && this.scene.referee.sustainLogic) {
        this.scene.referee.sustainLogic.spawnSustain(noteData);
      }
    }
  }

  updatePreferences() {
    if (!this.activeNotes || !this.activeNotes.scene) return;

    const realSongTime =
      window.Conductor && window.Conductor.songPosition !== undefined
        ? window.Conductor.songPosition
        : 0;

    this.activeNotes.getChildren().forEach((note) => {
      if (typeof note.recalculatePosition === "function") {
        note.recalculatePosition();
        note.updatePos(realSongTime, this.scrollSpeed);
      }
    });
  }

  shutdown() {
    if (this.activeNotes && this.activeNotes.scene) {
      this.activeNotes.clear(true, true);
    }
    this.activeNotes = null;
  }
}

window.NoteLogic = NoteLogic;
