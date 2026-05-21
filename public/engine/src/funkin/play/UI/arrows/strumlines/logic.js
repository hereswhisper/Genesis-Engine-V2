// src/funkin/play/UI/arrows/strumlines/logic.js

class StrumlineLogic {
  constructor(scene) {
    this.scene = scene;
    this.skins = scene.referee.skins;
    this.animations = this.skins.get("gameplay.strumline.animations");
    this.dirs = Object.keys(this.animations);

    this.opponentStrums = this.scene.add.group();
    this.playerStrums = this.scene.add.group();

    this.ghostTapping = window.Preferences.ghostTapping;
    this.downscroll = window.Preferences.downscroll;

    const isTwoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;

    if (isTwoPlayers) {
        this.middleScroll = 'none';
    } else {
        this.middleScroll = window.Preferences.middleScroll;
    }

    this.mobileStrums = window.isMobile || window.isReactNative || false;
    this.visibleHitboxes = true;

    // AHORA USA HEALTH (Reinicia al montar)
    if (window.Health) window.Health.resetHealth();

    this.createStrumlines();

    this.onKeyDown = (e) => this.handleInput(e, true);
    this.onKeyUp = (e) => this.handleInput(e, false);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);

    this.scene.events.once("shutdown", this.shutdown, this);
  }

  createStrumlines() {
    const baseScale = this.skins.get("gameplay.strumline.scale") || 0.7;
    const baseSpacing = this.skins.get("gameplay.strumline.spacing") || (160 * baseScale);
    const offsets = this.skins.get("gameplay.strumline.offsets.static") || [0, 0];

    const positioner = new window.ClassicalPosition(this.scene);

    const isTwoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;
    const playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;

    let hideOppStrums = false;
    let hideOppNotes = false;
    let hidePlyStrums = false;
    let hidePlyNotes = false;

    if (!isTwoPlayers) {
        if (playerEnemy) {
            hidePlyStrums = window.Preferences.hideOpStrums;
            hidePlyNotes = window.Preferences.hideOpNotes;
        } else {
            hideOppStrums = window.Preferences.hideOpStrums;
            hideOppNotes = window.Preferences.hideOpNotes;
        }
    }

    let posIsPlayerForOpp = false;
    let posIsPlayerForPly = true;

    if (playerEnemy && this.middleScroll !== 'none') {
        posIsPlayerForOpp = true;
        posIsPlayerForPly = false;
    }

    this.dirs.forEach((dir, i) => {
      const pOpp = positioner.getPos(i, posIsPlayerForOpp, baseSpacing, baseScale, this.downscroll, offsets, this.middleScroll, this.mobileStrums, hideOppStrums, hideOppNotes);
      const opp = new window.Strum(this.scene, pOpp.x, pOpp.y, dir, i);
      opp.applyScale(pOpp.scale);
      opp.setAlpha(pOpp.strumAlpha);
      opp.noteAlpha = pOpp.noteAlpha;
      opp.downscroll = pOpp.downscroll;

      const pPly = positioner.getPos(i, posIsPlayerForPly, baseSpacing, baseScale, this.downscroll, offsets, this.middleScroll, this.mobileStrums, hidePlyStrums, hidePlyNotes);
      const ply = new window.Strum(this.scene, pPly.x, pPly.y, dir, i);
      ply.applyScale(pPly.scale);
      ply.setAlpha(pPly.strumAlpha);
      ply.noteAlpha = pPly.noteAlpha;
      ply.downscroll = pPly.downscroll;

      if (this.mobileStrums) {
          ply.createMobileHitbox(this.visibleHitboxes);
      }

      if (this.scene.referee.cameras) {
        this.scene.referee.cameras.add(opp, "ui");
        this.scene.referee.cameras.add(ply, "ui");
      }
      this.opponentStrums.add(opp);
      this.playerStrums.add(ply);
    });
  }

  handleInput(e, isDown) {
    if (e.repeat || !this.playerStrums || !this.playerStrums.scene) return;

    const twoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;
    const playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;

    this.dirs.forEach((dir, i) => {
        let isP1 = false;
        let isP2 = false;

        const actionP1 = `NOTE_${dir.toUpperCase()}`;
        const actionP2 = `P2_NOTE_${dir.toUpperCase()}`;

        if (e.keyCode !== undefined) {
            const bindsP1 = window.Controls.PCKeyBinds[actionP1] || [];
            const bindsP2 = window.Controls.PCKeyBinds[actionP2] || [];

            if (twoPlayers) {
                if (bindsP1.length > 0 && e.keyCode === bindsP1[0]) isP1 = true;
                if (bindsP2.length > 0 && e.keyCode === bindsP2[0]) isP2 = true;
            } else {
                if (bindsP1.includes(e.keyCode)) isP1 = true;
            }
        } else {
            let btnIndex = e.button !== undefined ? e.button : e.index;
            if (btnIndex !== undefined) {
                const bindsP1 = window.Controls.GamepadBinds[actionP1] || [];
                const bindsP2 = window.Controls.GamepadBinds[actionP2] || [];

                if (twoPlayers) {
                    if (bindsP1.length > 0 && btnIndex === bindsP1[0]) isP1 = true;
                    if (bindsP2.length > 0 && btnIndex === bindsP2[0]) isP2 = true;
                } else {
                    if (bindsP1.includes(btnIndex)) isP1 = true;
                }
            }
        }

        if (playerEnemy) {
            if (isP1) this.processInput(dir, isDown, true);
            if (isP2 && twoPlayers) this.processInput(dir, isDown, false);
        } else {
            if (isP1) this.processInput(dir, isDown, false);
            if (isP2 && twoPlayers) this.processInput(dir, isDown, true);
        }
    });
  }

  processInput(dir, isDown, isOpponent) {
    const isTwoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;
    const isPlayerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;
    const isBotPlayActive = window.Preferences ? window.Preferences.botplay : false;

    let isBottingThisSide = false;

    if (!isTwoPlayers) {
        if (isOpponent) {
            isBottingThisSide = isPlayerEnemy ? isBotPlayActive : true;
        } else {
            isBottingThisSide = isPlayerEnemy ? true : isBotPlayActive;
        }
    }

    if (isBottingThisSide) return;

    const strumsGroup = isOpponent ? this.opponentStrums : this.playerStrums;
    if (!strumsGroup) return;

    const strum = strumsGroup.getChildren().find((s) => s.direction === dir);
    if (!strum) return;

    strum.isHeld = isDown;

    if (isDown) {
        const note = this.findHitNote(dir, isOpponent);

        if (note) {
            const diff = note.noteData.t - window.Conductor.songPosition;
            if (Math.abs(diff) <= window.Judgment.PBOT1_MISS_THRESHOLD) {
                this.processHit(note, diff, strum, isOpponent);
            } else {
                if (!this.ghostTapping) {
                    this.processGhostMiss(strum, isOpponent);
                } else {
                    strum.playAnim("press");
                }
            }
        } else {
            let holdingSustain = false;
            if (this.scene.referee.sustainLogic) {
                const pType = isOpponent ? 'op' : 'pl';
                holdingSustain = this.scene.referee.sustainLogic.activeSustains.some(s =>
                    s.direction === dir && s.noteData.p === pType && s.isBeingHeld && !s.missedNote
                );
            }

            if (!holdingSustain) {
                if (!this.ghostTapping) {
                    this.processGhostMiss(strum, isOpponent);
                } else {
                    strum.playAnim("press");
                }
            } else {
                strum.playAnim("confirm");
            }
        }
    } else {
        strum.playAnim("static");
        if (this.scene.referee.sustainLogic) {
            if (!isOpponent) {
                this.scene.referee.sustainLogic.onKeyRelease(dir);
            } else {
                if(this.scene.referee.sustainLogic.onKeyReleaseOpponent) {
                    this.scene.referee.sustainLogic.onKeyReleaseOpponent(dir);
                }
            }
        }
    }
  }

  findHitNote(direction, isOpponent) {
    if (!this.scene.referee.notesLogic || !this.scene.referee.notesLogic.activeNotes) return null;

    const pType = isOpponent ? 'op' : 'pl';

    const notes = this.scene.referee.notesLogic.activeNotes
        .getChildren()
        .filter((n) => n.noteData.p === pType && n.direction === direction && !n.isMissed);

    if (notes.length === 0) return null;

    return notes.sort((a, b) =>
        Math.abs(a.noteData.t - window.Conductor.songPosition) -
        Math.abs(b.noteData.t - window.Conductor.songPosition)
    )[0];
  }

  processHit(note, diff, strum, isOpponent) {
    const rating = window.Judgment.getRating(diff);
    const score = window.Judgment.calculateScore(diff);

    // AHORA USA HEALTH directamente sobre el módulo (Soporte Multi Jugador / Player Enemy nativo)
    if (window.Health) {
        window.Health.applyHit(rating, isOpponent);
        window.Health.checkGameOver(this.scene);
    }

    this.scene.events.emit("noteHit", { note, rating, score, health: window.Health ? window.Health.currentHealth : 1.0 });

    const playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;
    const isMainPlayer = playerEnemy ? isOpponent : !isOpponent;

    const isAI = !isMainPlayer;
    const canGlow = !isAI || (isAI && window.Preferences.opponentGlow);

    if (canGlow) {
        strum.playAnim("confirm");
    }

    if (this.scene.referee.sustainLogic) {
        this.scene.referee.sustainLogic.onNoteHit(note);
    }

    note.destroy();
  }

  processGhostMiss(strum, isOpponent) {
    strum.playAnim("press");

    // AHORA USA HEALTH (Soporte Multi Jugador)
    if (window.Health) {
        window.Health.applyGhostMiss(isOpponent);
        window.Health.checkGameOver(this.scene);
    }

    this.scene.events.emit("ghostMiss", { direction: strum.direction, isOpponent, health: window.Health ? window.Health.currentHealth : 1.0 });
  }

  update(time, delta) {
    if (!this.opponentStrums || !this.playerStrums || !this.opponentStrums.scene) return;
    this.opponentStrums.getChildren().forEach((s) => s.update(time, delta));
    this.playerStrums.getChildren().forEach((s) => s.update(time, delta));
  }

  shutdown() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}

window.StrumlineLogic = StrumlineLogic;
