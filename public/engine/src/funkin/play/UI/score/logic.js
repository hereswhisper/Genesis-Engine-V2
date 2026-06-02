// src/funkin/play/UI/score/logic.js

class ScoreLogic {
    constructor(scene) {
        this.scene = scene;
        this.scene.scoreLogic = this; // <- Para poder accesar la lógica y datos desde MultiLogic

        this.renderer = new window.ScoreRenderer(this.scene);

        this.statsP1 = { score: 0, misses: 0, sicks: 0, goods: 0, bads: 0, shits: 0, totalHit: 0, totalNotes: 0 };
        this.statsP2 = { score: 0, misses: 0, sicks: 0, goods: 0, bads: 0, shits: 0, totalHit: 0, totalNotes: 0 };

        this.isMultiplayer = window.isMultiplayer || false;
        this.isTwoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;

        this.playerEnemy = this.isMultiplayer
            ? (window.MultiplayerData && !window.MultiplayerData.isHost)
            : (window.Preferences ? window.Preferences.playerEnemy : false);

        this.scene.events.on('noteHit', this.onNoteHit, this);
        this.scene.events.on('noteMiss', this.onNoteMiss, this);
        this.scene.events.on('ghostMiss', this.onGhostMiss, this);

        this.updateScoreText();
    }

    playMissSound() {
        let rnd = Math.floor(Math.random() * 3) + 1;
        let sndKey = `missnote${rnd}`;

        if (this.scene.cache.audio.exists(sndKey)) {
            this.scene.sound.play(sndKey, { volume: 0.5 });
        } else if (this.scene.cache.audio.exists('miss')) {
            this.scene.sound.play('miss', { volume: 0.5 });
        }
    }

    // --- FIX: MÉTODO PARA FORZAR LA SINCRONIZACIÓN EXACTA DEL ENEMIGO ---
    syncOpponentStats(stats) {
        if (!stats) return;
        this.statsP2.score = stats.score;
        this.statsP2.misses = stats.misses;
        this.statsP2.sicks = stats.sicks;
        this.statsP2.goods = stats.goods;
        this.statsP2.bads = stats.bads;
        this.statsP2.shits = stats.shits;
        this.statsP2.totalHit = stats.totalHit;
        this.statsP2.totalNotes = stats.totalNotes;
        this.updateScoreText();
    }

    onNoteHit(data) {
        if (!data) return;
        const isOpponent = data.note && data.note.noteData && data.note.noteData.p === 'op';
        const stats = isOpponent ? this.statsP2 : this.statsP1;

        // Si estamos en multijugador NO adivinamos el score del enemigo localmente,
        // porque de lo contrario divergerá. Dejamos que "syncOpponentStats" lo actualice.
        if (isOpponent && this.isMultiplayer) {
            return;
        }

        stats.score += data.score || 0;
        stats.totalNotes += 1;

        if (data.rating) {
            let r = data.rating.toLowerCase();
            if (r === 'killer' || r === 'sick' || r === 'perfect') stats.sicks++;
            else if (r === 'good') stats.goods++;
            else if (r === 'bad') stats.bads++;
            else if (r === 'shit') stats.shits++;
        }

        stats.totalHit += this.getRatingWeight(data.rating);
        this.updateScoreText();
    }

    onNoteMiss(data) {
        const isOpponent = data.note && data.note.noteData && data.note.noteData.p === 'op';
        const stats = isOpponent ? this.statsP2 : this.statsP1;

        if (isOpponent && this.isMultiplayer) return;

        stats.score -= 10;
        stats.misses += 1;
        stats.totalNotes += 1;
        this.updateScoreText();

        const isMainPlayerMiss = this.playerEnemy ? isOpponent : !isOpponent;
        if (isMainPlayerMiss || this.isTwoPlayers || this.isMultiplayer) {
            this.playMissSound();
        }
    }

    onGhostMiss(data) {
        const isOpponent = data.isOpponent;
        const stats = isOpponent ? this.statsP2 : this.statsP1;

        if (isOpponent && this.isMultiplayer) return;

        stats.score -= 10;
        stats.misses += 1;
        this.updateScoreText();

        const isMainPlayerMiss = this.playerEnemy ? isOpponent : !isOpponent;
        if (isMainPlayerMiss || this.isTwoPlayers || this.isMultiplayer) {
            this.playMissSound();
        }
    }

    getRatingWeight(rating) {
        if (!rating) return 0;
        switch(rating.toLowerCase()) {
            case 'perfect': return 1;
            case 'killer': return 1;
            case 'sick': return 1;
            case 'good': return 0.7;
            case 'bad': return 0.4;
            case 'shit': return 0.2;
            default: return 0;
        }
    }

    calculateAccuracy(stats) {
        if (stats.totalNotes === 0) return "0.00";
        return ((stats.totalHit / stats.totalNotes) * 100).toFixed(2);
    }

    getRatingName(acc) {
        if (acc === 100) return 'SFC';
        if (acc >= 90) return 'GFC';
        if (acc >= 80) return 'FC';
        if (acc >= 70) return 'SDCB';
        return 'Clear';
    }

    updateScoreText() {
        if (!this.renderer) return;

        const showOp = window.Preferences ? window.Preferences.showOpPopUp !== false : true;

        const accP1 = this.calculateAccuracy(this.statsP1);
        const rankP1 = this.getRatingName(parseFloat(accP1));
        const textP1 = `Score: ${this.statsP1.score} | Misses: ${this.statsP1.misses} | Accuracy: ${accP1}% [${rankP1}]`;

        const accP2 = this.calculateAccuracy(this.statsP2);
        const rankP2 = this.getRatingName(parseFloat(accP2));
        const textP2 = `Score: ${this.statsP2.score} | Misses: ${this.statsP2.misses} | Accuracy: ${accP2}% [${rankP2}]`;

        if ((this.isTwoPlayers || this.isMultiplayer) && showOp) {
            this.renderer.updateSplit(textP1, textP2);
        } else {
            if (this.playerEnemy) {
                this.renderer.updateSingle(textP2);
            } else {
                this.renderer.updateSingle(textP1);
            }
        }
    }

    update(time, delta) {}

    shutdown() {
        this.scene.events.off('noteHit', this.onNoteHit, this);
        this.scene.events.off('noteMiss', this.onNoteMiss, this);
        this.scene.events.off('ghostMiss', this.onGhostMiss, this);
        if (this.renderer) this.renderer.destroy();
    }
}
window.ScoreLogic = ScoreLogic;
