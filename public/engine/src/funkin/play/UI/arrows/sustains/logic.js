// src/funkin/play/UI/arrows/sustains/logic.js

class SustainLogic {
    constructor(scene) {
        this.scene = scene;
        this.strumlines = this.scene.referee.strumlines;
        this.activeSustains = [];
    }

    spawnSustain(noteData) {
        if (!noteData.l || noteData.l <= 0) return;

        const isPlayer = noteData.p === 'pl';
        const strumsGroup = isPlayer ? this.strumlines.playerStrums : this.strumlines.opponentStrums;
        const dirName = this.scene.referee.notesLogic.dirs[noteData.d];
        const targetStrum = strumsGroup.getChildren().find(s => s.direction === dirName);

        if (targetStrum) {
            const sustain = new window.SustainTrail(this.scene, noteData, targetStrum);
            this.activeSustains.push(sustain);
        }
    }

    onNoteHit(note) {
        const sustain = this.activeSustains.find(s => s.noteData === note.noteData);
        if (sustain) {
            sustain.wasGoodHit = true;
            sustain.isBeingHeld = true;
        }
    }

    onKeyRelease(direction) {
        const sustain = this.activeSustains.find(s => s.direction === direction && s.isBeingHeld && s.noteData.p === 'pl');
        if (sustain) {
            sustain.isBeingHeld = false;
            sustain.missedNote = true;
            sustain.timeOfMiss = (window.Conductor && window.Conductor.songPosition !== undefined) ? window.Conductor.songPosition : 0;
            sustain.setAlpha(0.3);

            if (sustain.sustainLength > 10) {
                if (window.Health) window.Health.applyMiss(false); // Castigo al soltar la sustain P1

                this.scene.events.emit('noteMiss', {
                    note: { noteData: sustain.noteData },
                    direction: sustain.direction,
                    isSustainDrop: true,
                    health: window.Health ? window.Health.currentHealth : 1.0
                });
            }
        }
    }

    onKeyReleaseOpponent(direction) {
        const sustain = this.activeSustains.find(s => s.direction === direction && s.isBeingHeld && s.noteData.p === 'op');
        if (sustain) {
            sustain.isBeingHeld = false;
            sustain.missedNote = true;
            sustain.timeOfMiss = (window.Conductor && window.Conductor.songPosition !== undefined) ? window.Conductor.songPosition : 0;
            sustain.setAlpha(0.3);

            if (sustain.sustainLength > 10) {
                if (window.Health) window.Health.applyMiss(true); // Castigo al soltar la sustain P2

                this.scene.events.emit('noteMiss', {
                    note: { noteData: sustain.noteData },
                    direction: sustain.direction,
                    isSustainDrop: true,
                    health: window.Health ? window.Health.currentHealth : 1.0
                });
            }
        }
    }

    update(time, delta) {
        const songTime = (window.Conductor && window.Conductor.songPosition !== undefined) ? window.Conductor.songPosition : 0;
        const scrollSpeed = Number(this.scene.playData.get('scrollSpeed', 2.0));

        for (let i = this.activeSustains.length - 1; i >= 0; i--) {
            const sustain = this.activeSustains[i];

            sustain.updatePos(songTime, scrollSpeed, delta);

            if (sustain.isBeingHeld && !sustain.missedNote) {

                const playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;
                const isOpponentSustain = sustain.noteData.p === 'op';

                const isAI = playerEnemy ? !isOpponentSustain : isOpponentSustain;
                const canGlow = !isAI || (isAI && window.Preferences.opponentGlow);

                if (canGlow) {
                    if (!sustain.strumTarget.anims.currentAnim || !sustain.strumTarget.anims.currentAnim.key.includes('confirm')) {
                        sustain.strumTarget.playAnim("confirm");
                    }
                }

                // AHORA USA HEALTH NATIVO (Soporta multijugador enviando el isOpponent param)
                if (window.Health) {
                    window.Health.applyHold(delta, isOpponentSustain);
                    this.scene.events.emit('healthUpdate', window.Health.currentHealth);
                }
            }

            if (sustain.isCompleted || sustain.isOut) {
                sustain.destroy();
                this.activeSustains.splice(i, 1);
            }
        }
    }

    shutdown() {
        this.activeSustains.forEach(s => s.destroy());
        this.activeSustains = [];
    }
}

window.SustainLogic = SustainLogic;
