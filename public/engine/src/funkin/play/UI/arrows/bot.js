// src/funkin/play/UI/arrows/bot.js

class BotLogic {
  constructor(scene) {
    this.scene = scene;
    this.enemyBot = true;
    this.playerBot = false;

    // Si desde el inicio detectamos que es multijugador, apagamos los bots
    if (window.isMultiplayer) {
      this.enemyBot = false;
      this.playerBot = false;
    }
  }

  update(time, delta) {
    const notesLogic = this.scene.referee.notesLogic;
    const sustainLogic = this.scene.referee.sustainLogic;
    const strumlines = this.scene.referee.strumlines;

    if (!notesLogic || !strumlines) return;

    const isPlayerEnemy = window.Preferences
      ? window.Preferences.playerEnemy
      : false;
    const isTwoPlayers = window.Preferences
      ? window.Preferences.twoPlayers
      : false;
    const isBotPlayActive = window.Preferences
      ? window.Preferences.botplay
      : false;

    // Validamos si estamos en una partida multijugador en línea
    const isMultiplayer = window.isMultiplayer || false;

    // LÓGICA DE BOTS INTELIGENTE
    if (isTwoPlayers || isMultiplayer) {
      this.enemyBot = false;
      this.playerBot = false;
    } else {
      if (isPlayerEnemy) {
        // Juegas como el Enemigo
        this.enemyBot = isBotPlayActive; // Si activas botplay, la IA te controla a ti (enemigo)
        this.playerBot = true; // El jugador original pasa a ser controlado por IA
      } else {
        // Juegas como el Jugador normal
        this.enemyBot = true; // El enemigo original es IA
        this.playerBot = isBotPlayActive; // Si activas botplay, la IA te controla a ti
      }
    }

    const songTime =
      window.Conductor && window.Conductor.songPosition !== undefined
        ? window.Conductor.songPosition
        : 0;

    if (notesLogic.activeNotes) {
      notesLogic.activeNotes.getChildren().forEach((note) => {
        const diff = note.noteData.t - songTime;
        if (diff <= 0) {
          if (note.noteData.p === "op" && this.enemyBot) {
            this.hitOpponent(note, strumlines);
          } else if (note.noteData.p === "pl" && this.playerBot) {
            this.hitPlayer(note, strumlines);
          }
        }
      });
    }

    if (sustainLogic && sustainLogic.activeSustains) {
      sustainLogic.activeSustains.forEach((sustain) => {
        const isBottingPlayer = sustain.noteData.p === "pl" && this.playerBot;
        const isBottingOpponent = sustain.noteData.p === "op" && this.enemyBot;

        if (isBottingPlayer || isBottingOpponent) {
          // CORRECCIÓN: Mantener presionada la nota hasta que el motor visual la complete.
          // Esto evita que la IA la suelte matemáticamente antes de que se recorte el sprite.
          if (
            songTime >= sustain.noteData.t &&
            !sustain.isCompleted &&
            !sustain.missedNote
          ) {
            sustain.wasGoodHit = true;
            sustain.isBeingHeld = true;

            // Restricción de glow dinámico para las IA
            const isAI = isPlayerEnemy
              ? sustain.noteData.p === "pl"
              : sustain.noteData.p === "op";
            const canGlow = !isAI || (isAI && window.Preferences.opponentGlow);

            if (canGlow) {
              if (
                !sustain.strumTarget.anims.currentAnim ||
                !sustain.strumTarget.anims.currentAnim.key.includes("confirm")
              ) {
                sustain.strumTarget.playAnim("confirm");
              }
            }
          } else if (
            sustain.isCompleted ||
            songTime > sustain.noteData.t + sustain.fullSustainLength + 100
          ) {
            // Solo soltamos cuando el renderer termina de consumirla, o con un margen de seguridad de 100ms.
            sustain.isBeingHeld = false;
            if (sustain.strumTarget.currentState !== "static") {
              sustain.strumTarget.playAnim("static");
            }
          }
        }
      });
    }
  }

  hitOpponent(note, strumlines) {
    const strum = strumlines.opponentStrums
      .getChildren()
      .find((s) => s.direction === note.direction);
    if (strum) {
      note.isBotPlay = true;
      this.scene.events.emit("noteHit", { note: note });

      const isPlayerEnemy = window.Preferences
        ? window.Preferences.playerEnemy
        : false;
      const isAI = !isPlayerEnemy;
      const canGlow = !isAI || (isAI && window.Preferences.opponentGlow);

      if (canGlow) {
        strum.playAnim("confirm");
      }
    }
    note.destroy();
  }

  hitPlayer(note, strumlines) {
    const strum = strumlines.playerStrums
      .getChildren()
      .find((s) => s.direction === note.direction);
    if (strum) {
      note.isBotPlay = true;
      strumlines.processHit(note, 0, strum, false);
    } else {
      note.destroy();
    }
  }

  shutdown() {
    this.scene = null;
  }
}

window.BotLogic = BotLogic;
