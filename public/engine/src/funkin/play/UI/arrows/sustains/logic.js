// src/funkin/play/UI/arrows/sustains/logic.js
class SustainLogic {
  constructor(scene) {
    this.scene = scene;
    this.strumlines = this.scene.referee.strumlines;
    this.activeSustains = [];
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

  spawnSustain(noteData) {
    if (!noteData.l || noteData.l <= 0) return;

    const isPlayer = noteData.p === "pl";
    const strumsGroup = isPlayer
      ? this.strumlines.playerStrums
      : this.strumlines.opponentStrums;
    const dirName = this.scene.referee.notesLogic.dirs[noteData.d];
    const targetStrum = strumsGroup
      .getChildren()
      .find((s) => s.direction === dirName);

    if (targetStrum) {
      const sustain = new window.SustainTrail(
        this.scene,
        noteData,
        targetStrum,
      );

      sustain.wasGoodHit = false;
      sustain.wasEverHit = false;
      sustain.isBeingHeld = false;
      sustain.missedNote = false;

      this.activeSustains.push(sustain);
    }
  }

  onNoteHit(note) {
    const sustain = this.activeSustains.find(
      (s) => s.noteData === note.noteData,
    );
    if (sustain) {
      sustain.wasGoodHit = true;
      sustain.wasEverHit = true;
      sustain.isBeingHeld = true;
    }
  }

  onNoteMiss(note) {
    const sustain = this.activeSustains.find(
      (s) => s.noteData === note.noteData,
    );
    if (sustain && !sustain.wasGoodHit) {
      sustain.isBeingHeld = false;
      sustain.missedNote = true;
      sustain.wasGoodHit = false;
      sustain.timeOfMiss =
        window.Conductor && window.Conductor.songPosition !== undefined
          ? window.Conductor.songPosition
          : 0;
      sustain.setAlpha(0.3);
    }
  }

  onKeyRelease(direction) {
    const sustain = this.activeSustains.find(
      (s) =>
        s.direction === direction && s.isBeingHeld && s.noteData.p === "pl",
    );
    if (sustain) {
      sustain.isBeingHeld = false;
      sustain.missedNote = true;
      sustain.wasGoodHit = false;
      sustain.timeOfMiss =
        window.Conductor && window.Conductor.songPosition !== undefined
          ? window.Conductor.songPosition
          : 0;
      sustain.setAlpha(0.3);

      if (sustain.sustainLength > 10) {
        if (window.Health) window.Health.applyMiss(false);
        this.scene.events.emit("noteMiss", {
          note: { noteData: sustain.noteData },
          direction: sustain.direction,
          isSustainDrop: true,
          health: window.Health ? window.Health.currentHealth : 1.0,
        });
      }
    }
  }

  onKeyReleaseOpponent(direction) {
    const sustain = this.activeSustains.find(
      (s) =>
        s.direction === direction && s.isBeingHeld && s.noteData.p === "op",
    );
    if (sustain) {
      sustain.isBeingHeld = false;
      sustain.missedNote = true;
      sustain.wasGoodHit = false;
      sustain.timeOfMiss =
        window.Conductor && window.Conductor.songPosition !== undefined
          ? window.Conductor.songPosition
          : 0;
      sustain.setAlpha(0.3);

      if (sustain.sustainLength > 10) {
        if (window.Health) window.Health.applyMiss(true);
        this.scene.events.emit("noteMiss", {
          note: { noteData: sustain.noteData },
          direction: sustain.direction,
          isSustainDrop: true,
          health: window.Health ? window.Health.currentHealth : 1.0,
        });
      }
    }
  }

  update(time, delta) {
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

    const scrollSpeed = Number(this.scene.playData.get("scrollSpeed", 2.0));
    const hitWindow = window.PlaySettings ? window.PlaySettings.hitWindow : 160;

    for (let i = this.activeSustains.length - 1; i >= 0; i--) {
      const sustain = this.activeSustains[i];
      const isOpponentSustain = sustain.noteData.p === "op";
      const isLocalSustain = this._isLocal(isOpponentSustain);

      let renderTime = this.interpolatedTime;
      if (!isLocalSustain && window.isMultiplayer) {
        renderTime -= window.NetworkLatency || 0;
      }

      const playerEnemy = window.Preferences
        ? window.Preferences.playerEnemy
        : false;
      const isAI = playerEnemy ? !isOpponentSustain : isOpponentSustain;

      if (isAI) {
        const isWithinDuration =
          realSongTime >= sustain.noteData.t - 100 &&
          !sustain.isCompleted &&
          !sustain.missedNote;

        if (isWithinDuration) {
          sustain.wasEverHit = true;
          sustain.wasGoodHit = true;
          sustain.isBeingHeld = true;
          sustain.missedNote = false;
          sustain.setAlpha(
            sustain.alphaVal !== undefined ? sustain.alphaVal : 1.0,
          );
        } else if (
          sustain.wasEverHit &&
          sustain.isBeingHeld &&
          (sustain.isCompleted ||
            realSongTime > sustain.noteData.t + sustain.noteData.l + 100)
        ) {
          sustain.isBeingHeld = false;
          sustain.wasGoodHit = false;
        }
      }

      sustain.updatePos(renderTime, scrollSpeed, delta);

      if (
        !sustain.wasEverHit &&
        realSongTime > sustain.noteData.t + hitWindow
      ) {
        if (!sustain.missedNote) {
          sustain.missedNote = true;
          sustain.isBeingHeld = false;
          sustain.wasGoodHit = false;
          sustain.timeOfMiss = realSongTime;
          sustain.setAlpha(0.3);
        }
      }

      if (sustain.isBeingHeld && !sustain.missedNote) {
        const canGlow = !isAI || (isAI && window.Preferences.opponentGlow);

        if (canGlow && sustain.strumTarget && sustain.strumTarget.anims) {
          if (
            !sustain.strumTarget.anims.currentAnim ||
            !sustain.strumTarget.anims.currentAnim.key.includes("confirm")
          ) {
            sustain.strumTarget.playAnim("confirm");
          }
        }

        if (window.Health) {
          window.Health.applyHold(delta, isOpponentSustain);
          this.scene.events.emit("healthUpdate", window.Health.currentHealth);
        }
      }

      let shouldDestroy = false;
      if (sustain.wasGoodHit && !sustain.missedNote && sustain.isCompleted) {
        shouldDestroy = true;
      } else {
        const timeToClearScreen = 1500;
        if (
          sustain.isOut ||
          realSongTime >
            sustain.noteData.t + sustain.noteData.l + timeToClearScreen
        ) {
          shouldDestroy = true;
        }
      }

      if (shouldDestroy) {
        sustain.destroy();
        this.activeSustains.splice(i, 1);
      }
    }
  }

  updatePreferences() {
    const realSongTime =
      window.Conductor && window.Conductor.songPosition !== undefined
        ? window.Conductor.songPosition
        : 0;
    const scrollSpeed = Number(this.scene.playData.get("scrollSpeed", 2.0));

    this.activeSustains.forEach((sustain) => {
      if (typeof sustain.recalculatePosition === "function") {
        sustain.recalculatePosition();
        sustain.updatePos(realSongTime, scrollSpeed, 0);
      }
    });
  }

  shutdown() {
    this.activeSustains.forEach((s) => s.destroy());
    this.activeSustains = [];
  }
}

window.SustainLogic = SustainLogic;
