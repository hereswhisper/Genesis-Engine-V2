// src/funkin/play/UI/score/logic.js

class ScoreLogic {
    constructor(scene) {
        this.scene = scene;
        this.scene.scoreLogic = this; // <- Para poder accesar la lógica y datos desde MultiLogic

        this.renderer = new window.ScoreRenderer(this.scene);

        // statsP1 AHORA SIEMPRE representa al JUGADOR LOCAL
        // statsP2 AHORA SIEMPRE representa al OPONENTE / JUGADOR DE RED
        this.statsP1 = { score: 0, misses: 0, sicks: 0, goods: 0, bads: 0, shits: 0, totalHit: 0, totalNotes: 0 };
        this.statsP2 = { score: 0, misses: 0, sicks: 0, goods: 0, bads: 0, shits: 0, totalHit: 0, totalNotes: 0 };

        this.isMultiplayer = window.isMultiplayer || false;
        this.isTwoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;

        // Determina si el jugador local controla el lado izquierdo ('op')
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

    // Sincroniza EXACTAMENTE las stats del oponente que llegan por la red
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

    /**
     * FIX: Método clave para separar la red del cliente local.
     * Evalúa dinámicamente si la nota o evento le pertenece al jugador en la PC.
     */
    _isLocal(data) {
        if (!data) return true; // Asumir local por defecto como fallback preventivo

        let isOpSide = false;

        // Intentamos deducir de qué lado proviene el evento
        if (data.note && data.note.noteData) {
            isOpSide = (data.note.noteData.p === 'op');
        } else if (data.isOpponent !== undefined) {
            isOpSide = data.isOpponent;
        } else if (data.strumline) {
            isOpSide = data.strumline.isOpponent;
        }

        // Si soy el cliente (playerEnemy = true), mi lado es 'op' (izquierdo).
        // Si soy el host (playerEnemy = false), mi lado es 'bf' (derecho).
        return this.playerEnemy ? isOpSide : !isOpSide;
    }

    onNoteHit(data) {
        if (!data) return;

        const isLocal = this._isLocal(data);

        // En multijugador ignoramos CUALQUIER cálculo del oponente, 
        // porque sus estadísticas exactas llegarán por syncOpponentStats()
        if (!isLocal && this.isMultiplayer) {
            return;
        }

        const stats = isLocal ? this.statsP1 : this.statsP2;

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
        const isLocal = this._isLocal(data);

        // Bloqueo total a simulaciones erróneas de red
        if (!isLocal && this.isMultiplayer) return;

        const stats = isLocal ? this.statsP1 : this.statsP2;

        stats.score -= 10;
        stats.misses += 1;
        stats.totalNotes += 1;
        this.updateScoreText();

        if (isLocal || this.isTwoPlayers || this.isMultiplayer) {
            this.playMissSound();
        }
    }

    onGhostMiss(data) {
        const isLocal = this._isLocal(data);

        // Evita que los fallos vacíos o simulados del oponente te penalicen
        if (!isLocal && this.isMultiplayer) return;

        const stats = isLocal ? this.statsP1 : this.statsP2;

        stats.score -= 10;
        stats.misses += 1;
        this.updateScoreText();

        if (isLocal || this.isTwoPlayers || this.isMultiplayer) {
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
            // Aseguramos mantener el formato visual correcto de la UI (Derecha / Izquierda)
            if (this.playerEnemy) {
                // El cliente juega como 'op'. Así que enviamos P2 como la UI base y P1 al lado opuesto.
                this.renderer.updateSplit(textP2, textP1);
            } else {
                // El host juega normal. P1 va a su lugar por defecto.
                this.renderer.updateSplit(textP1, textP2);
            }
        } else {
            // En un jugador, garantizamos que imprima SIEMPRE la puntuación local real
            this.renderer.updateSingle(textP1);
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