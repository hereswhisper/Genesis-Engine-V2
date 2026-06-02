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

    // CORRECCIÓN: Asignación estricta para Host = false, Cliente = true
    if (window.isMultiplayer && window.MultiplayerData) {
        this.playerEnemy = !window.MultiplayerData.isHost;
        this.twoPlayers = false;
    } else {
        this.playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;
        this.twoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;
    }

    if (this.twoPlayers) {
        this.middleScroll = 'none';
    } else {
        this.middleScroll = window.Preferences.middleScroll;
    }

    this.mobileStrums = window.isMobile || window.isReactNative || false;
    this.visibleHitboxes = true;

    if (window.Health) window.Health.resetHealth();

    this.createStrumlines();

    this.onKeyDown = (e) => this.handleInput(e, true);
    this.onKeyUp = (e) => this.handleInput(e, false);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);

    this.onNetworkData = (data) => {
        if (data && data.type === 'KEY_ACTION') {
            this.processInput(data.dir, data.isDown, data.side, true, data.songTime, data.ghostTapping);
        }
    };
    this.scene.events.on('receiveMultiplayerData', this.onNetworkData);

    this.scene.events.once("shutdown", this.shutdown, this);
  }

  createStrumlines() {
    const baseScale = this.skins.get("gameplay.strumline.scale") || 0.7;
    const baseSpacing = this.skins.get("gameplay.strumline.spacing") || (160 * baseScale);
    const offsets = this.skins.get("gameplay.strumline.offsets.static") || [0, 0];

    const positioner = new window.ClassicalPosition(this.scene);

    let hideOppStrums = false;
    let hideOppNotes = false;
    let hidePlyStrums = false;
    let hidePlyNotes = false;

    if (!this.twoPlayers) {
        if (this.playerEnemy) {
            hidePlyStrums = window.Preferences.hideOpStrums;
            hidePlyNotes = window.Preferences.hideOpNotes;
        } else {
            hideOppStrums = window.Preferences.hideOpStrums;
            hideOppNotes = window.Preferences.hideOpNotes;
        }
    }

    let posIsPlayerForOpp = false;
    let posIsPlayerForPly = true;

    if (this.playerEnemy && this.middleScroll !== 'none') {
        posIsPlayerForOpp = true;
        posIsPlayerForPly = false;
    }

    const bgOpacity = window.Preferences && window.Preferences.strumBackgroundOpacity !== undefined ? window.Preferences.strumBackgroundOpacity : 0;
    const screenHeight = this.scene.sys.game.config.height || 720;
    const bgOffsetX = 25;

    let drawPlyBg = false;
    let drawOppBg = false;

    if (this.middleScroll === 'none') {
        drawPlyBg = !hidePlyStrums;
        drawOppBg = !hideOppStrums;
    } else {
        if (this.playerEnemy) {
            drawOppBg = !hideOppStrums;
            drawPlyBg = false;
        } else {
            drawPlyBg = !hidePlyStrums;
            drawOppBg = false;
        }
    }

    if (bgOpacity > 0 && this.dirs.length > 0) {
        const lastIdx = this.dirs.length - 1;

        if (drawPlyBg) {
            const firstPly = positioner.getPos(0, posIsPlayerForPly, baseSpacing, baseScale, this.downscroll, offsets, this.middleScroll, this.mobileStrums, hidePlyStrums, hidePlyNotes);
            const lastPly = positioner.getPos(lastIdx, posIsPlayerForPly, baseSpacing, baseScale, this.downscroll, offsets, this.middleScroll, this.mobileStrums, hidePlyStrums, hidePlyNotes);
            const centerX = (firstPly.x + lastPly.x) / 2;
            const totalWidth = Math.abs(lastPly.x - firstPly.x) + baseSpacing + 10;
            let bgPly = this.scene.add.rectangle(centerX + bgOffsetX, 0, totalWidth, screenHeight, 0x000000);
            bgPly.setOrigin(0.5, 0).setAlpha(bgOpacity).setDepth(-100);
            if (this.scene.referee.cameras) this.scene.referee.cameras.add(bgPly, "ui");
        }

        if (drawOppBg) {
            const firstOpp = positioner.getPos(0, posIsPlayerForOpp, baseSpacing, baseScale, this.downscroll, offsets, this.middleScroll, this.mobileStrums, hideOppStrums, hideOppNotes);
            const lastOpp = positioner.getPos(lastIdx, posIsPlayerForOpp, baseSpacing, baseScale, this.downscroll, offsets, this.middleScroll, this.mobileStrums, hideOppStrums, hideOppNotes);
            const centerX = (firstOpp.x + lastOpp.x) / 2;
            const totalWidth = Math.abs(lastOpp.x - firstOpp.x) + baseSpacing + 10;
            let bgOpp = this.scene.add.rectangle(centerX + bgOffsetX, 0, totalWidth, screenHeight, 0x000000);
            bgOpp.setOrigin(0.5, 0).setAlpha(bgOpacity).setDepth(-100);
            if (this.scene.referee.cameras) this.scene.referee.cameras.add(bgOpp, "ui");
        }
    }

    this.dirs.forEach((dir, i) => {
      const pOpp = positioner.getPos(i, posIsPlayerForOpp, baseSpacing, baseScale, this.downscroll, offsets, this.middleScroll, this.mobileStrums, hideOppStrums, hideOppNotes);
      const pPly = positioner.getPos(i, posIsPlayerForPly, baseSpacing, baseScale, this.downscroll, offsets, this.middleScroll, this.mobileStrums, hidePlyStrums, hidePlyNotes);

      const opp = new window.Strum(this.scene, pOpp.x, pOpp.y, dir, i);
      opp.applyScale(pOpp.scale);
      opp.setAlpha(pOpp.strumAlpha);
      opp.noteAlpha = pOpp.noteAlpha;
      opp.downscroll = pOpp.downscroll;

      const ply = new window.Strum(this.scene, pPly.x, pPly.y, dir, i);
      ply.applyScale(pPly.scale);
      ply.setAlpha(pPly.strumAlpha);
      ply.noteAlpha = pPly.noteAlpha;
      ply.downscroll = pPly.downscroll;

      if (this.mobileStrums) ply.createMobileHitbox(this.visibleHitboxes);

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

    this.dirs.forEach((dir) => {
        let isP1 = false;
        let isP2 = false;

        const actionP1 = `NOTE_${dir.toUpperCase()}`;
        const actionP2 = `P2_NOTE_${dir.toUpperCase()}`;

        if (e.keyCode !== undefined) {
            const bindsP1 = window.Controls.PCKeyBinds[actionP1] || [];
            const bindsP2 = window.Controls.PCKeyBinds[actionP2] || [];
            if (this.twoPlayers) {
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
                if (this.twoPlayers) {
                    if (bindsP1.length > 0 && btnIndex === bindsP1[0]) isP1 = true;
                    if (bindsP2.length > 0 && btnIndex === bindsP2[0]) isP2 = true;
                } else {
                    if (bindsP1.includes(btnIndex)) isP1 = true;
                }
            }
        }

        if (this.playerEnemy) {
            if (isP1) this.processInput(dir, isDown, true);
            if (isP2 && this.twoPlayers) this.processInput(dir, isDown, false);
        } else {
            if (isP1) this.processInput(dir, isDown, false);
            if (isP2 && this.twoPlayers) this.processInput(dir, isDown, true);
        }
    });
  }

  processInput(dir, isDown, isOpponentSide, fromNetwork = false, networkTime = null, networkGhostTapping = null) {
    const actionTime = networkTime !== null ? networkTime : window.Conductor.songPosition;
    const currentGhostTapping = networkGhostTapping !== null ? networkGhostTapping : this.ghostTapping;

    if (window.isMultiplayer && !fromNetwork) {
        this.scene.events.emit('sendMultiplayerData', {
            type: 'KEY_ACTION',
            dir: dir,
            isDown: isDown,
            side: isOpponentSide,
            songTime: actionTime,
            ghostTapping: currentGhostTapping
        });
    }

    let isBottingThisSide = false;

    if (window.isMultiplayer) {
        if (this.playerEnemy) {
            isBottingThisSide = isOpponentSide ? (window.Preferences ? window.Preferences.botplay : false) : false;
        } else {
            isBottingThisSide = (!isOpponentSide) ? (window.Preferences ? window.Preferences.botplay : false) : false;
        }
    } else if (!this.twoPlayers) {
        if (isOpponentSide) {
            isBottingThisSide = this.playerEnemy ? (window.Preferences ? window.Preferences.botplay : false) : true;
        } else {
            isBottingThisSide = this.playerEnemy ? true : (window.Preferences ? window.Preferences.botplay : false);
        }
    }

    if (isBottingThisSide && !fromNetwork) return;

    const strumsGroup = isOpponentSide ? this.opponentStrums : this.playerStrums;
    if (!strumsGroup) return;

    const strum = strumsGroup.getChildren().find((s) => s.direction === dir);
    if (!strum) return;

    strum.isHeld = isDown;

    if (isDown) {
        const note = this.findHitNote(dir, isOpponentSide, actionTime);

        if (note) {
            const diff = note.noteData.t - actionTime;
            if (Math.abs(diff) <= window.Judgment.PBOT1_MISS_THRESHOLD) {
                this.processHit(note, diff, strum, isOpponentSide, actionTime, fromNetwork);
            } else {
                if (!currentGhostTapping) {
                    this.processGhostMiss(strum, isOpponentSide, fromNetwork);
                } else {
                    strum.playAnim("press");
                }
            }
        } else {
            let holdingSustain = false;
            if (this.scene.referee.sustainLogic) {
                const pType = isOpponentSide ? 'op' : 'pl';
                holdingSustain = this.scene.referee.sustainLogic.activeSustains.some(s =>
                    s.direction === dir && s.noteData.p === pType && s.isBeingHeld && !s.missedNote
                );
            }

            if (!holdingSustain) {
                if (!currentGhostTapping) {
                    this.processGhostMiss(strum, isOpponentSide, fromNetwork);
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
            if (!isOpponentSide) {
                this.scene.referee.sustainLogic.onKeyRelease(dir);
            } else {
                if(this.scene.referee.sustainLogic.onKeyReleaseOpponent) {
                    this.scene.referee.sustainLogic.onKeyReleaseOpponent(dir);
                }
            }
        }
    }
  }

  findHitNote(direction, isOpponent, timeOverride) {
    if (!this.scene.referee.notesLogic || !this.scene.referee.notesLogic.activeNotes) return null;
    const pType = isOpponent ? 'op' : 'pl';

    const notes = this.scene.referee.notesLogic.activeNotes
        .getChildren()
        .filter((n) => n.noteData.p === pType && n.direction === direction && !n.isMissed);

    if (notes.length === 0) return null;

    return notes.sort((a, b) =>
        Math.abs(a.noteData.t - timeOverride) - Math.abs(b.noteData.t - timeOverride)
    )[0];
  }

  processHit(note, diff, strum, isOpponentSide, actionTime, fromNetwork = false) {
    const rating = window.Judgment.getRating(diff);
    const score = window.Judgment.calculateScore(diff);

    if (window.Health) {
        window.Health.applyHit(rating, isOpponentSide);
        window.Health.checkGameOver(this.scene);
    }

    const packet = {
        note: note,
        rating: rating,
        score: score,
        health: window.Health ? window.Health.currentHealth : 1.0,
        playerId: isOpponentSide ? "p2" : "p1",
        isOpponent: isOpponentSide,
        isPlayer: !isOpponentSide,
        action: "hit",
        timestamp: performance.now(),
        songTime: actionTime,
        direction: strum.direction,
        difference: diff,
        scoreAdded: score,
        noteData: note.noteData,
        isLocal: !fromNetwork
    };

    this.scene.events.emit("noteHit", packet);

    const isMainPlayer = this.playerEnemy ? isOpponentSide : !isOpponentSide;
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

  processGhostMiss(strum, isOpponentSide, fromNetwork = false) {
    strum.playAnim("press");

    if (window.Health) {
        window.Health.applyGhostMiss(isOpponentSide);
        window.Health.checkGameOver(this.scene);
    }

    const packet = {
        direction: strum.direction,
        isOpponent: isOpponentSide,
        isPlayer: !isOpponentSide,
        health: window.Health ? window.Health.currentHealth : 1.0,
        playerId: isOpponentSide ? "p2" : "p1",
        action: "ghostMiss",
        timestamp: performance.now(),
        songTime: window.Conductor.songPosition,
        isGhost: true,
        isLocal: !fromNetwork
    };

    this.scene.events.emit("ghostMiss", packet);
  }

  update(time, delta) {
    if (!this.opponentStrums || !this.playerStrums || !this.opponentStrums.scene) return;
    this.opponentStrums.getChildren().forEach((s) => s.update(time, delta));
    this.playerStrums.getChildren().forEach((s) => s.update(time, delta));
  }

  shutdown() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    if (this.onNetworkData) {
        this.scene.events.off('receiveMultiplayerData', this.onNetworkData);
    }
  }
}

window.StrumlineLogic = StrumlineLogic;
