// src/funkin/play/UI/score/logic.js

class ScoreLogic {
    // Formato estático solicitado para un solo jugador o uso de Renderers externos
    static scoreFormat = ['score', 'rating', 'accuracy', 'misses', 'combo', 'maxCombo', 'cps'];

    constructor(scene) {
        this.scene = scene;
        this.scene.scoreLogic = this;

        this.renderer = new window.ScoreRenderer(this.scene);

        // Añadidas las métricas de combo, maxCombo y cps al estado oficial
        this.statsP1 = { score: 0, misses: 0, sicks: 0, goods: 0, bads: 0, shits: 0, totalHit: 0, totalNotes: 0, combo: 0, maxCombo: 0, cps: 0 };
        this.statsP2 = { score: 0, misses: 0, sicks: 0, goods: 0, bads: 0, shits: 0, totalHit: 0, totalNotes: 0, combo: 0, maxCombo: 0, cps: 0 };

        // Arrays para calcular los Clicks Por Segundo (CPS)
        this.clicksP1 = [];
        this.clicksP2 = [];

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

    // Calcula los CPS (limpiando los clicks que tengan más de 1000ms de antigüedad)
    getCPS(isLocal) {
        const now = Date.now();
        if (isLocal) {
            this.clicksP1 = this.clicksP1.filter(t => now - t < 1000);
            return this.clicksP1.length;
        } else {
            this.clicksP2 = this.clicksP2.filter(t => now - t < 1000);
            return this.clicksP2.length;
        }
    }

    // Registra un evento de pulsación para el calculo del CPS
    registerClick(isLocal) {
        const now = Date.now();
        if (isLocal) {
            this.clicksP1.push(now);
        } else {
            this.clicksP2.push(now);
        }
    }

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
        this.statsP2.combo = stats.combo || 0;
        this.statsP2.maxCombo = stats.maxCombo || 0;
        this.statsP2.cps = stats.cps || 0;

        // Sincronizar visualmente el Combo remoto
        if (this.scene.comboLogic) {
            let remoteComboVar = this.playerEnemy ? 'currentComboP1' : 'currentComboP2';
            let oldCombo = this.scene.comboLogic[remoteComboVar];

            this.scene.comboLogic[remoteComboVar] = this.statsP2.combo;

            if (this.statsP2.combo === 0 && oldCombo > 0) {
                let isOpponentSide = !this.playerEnemy;
                this.scene.comboLogic.spawnCombo(0, isOpponentSide);
            }
        }

        this.updateScoreText();
    }

    _isLocal(data) {
        if (!data) return true;

        let isOpSide = false;
        if (data.note && data.note.noteData) {
            isOpSide = (data.note.noteData.p === 'op');
        } else if (data.isOpponent !== undefined) {
            isOpSide = data.isOpponent;
        } else if (data.strumline) {
            isOpSide = data.strumline.isOpponent;
        }

        return this.playerEnemy ? isOpSide : !isOpSide;
    }

    onNoteHit(data) {
        if (!data) return;
        const isLocal = this._isLocal(data);

        this.registerClick(isLocal); // Sumar presión de tecla para CPS

        if (!isLocal && this.isMultiplayer) return;

        const stats = isLocal ? this.statsP1 : this.statsP2;

        stats.score += data.score || 0;
        stats.totalNotes += 1;
        stats.combo += 1; // Actualizar Combo

        // Evaluar Max Combo
        if (stats.combo > stats.maxCombo) {
            stats.maxCombo = stats.combo;
        }

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
        
        // Si entra por un evento general y el rival falla, respetamos muteMissNoteEnemy
        if (!isLocal && this.isMultiplayer) {
            const muteEnemy = window.Preferences ? window.Preferences.muteMissNoteEnemy : false;
            if (!muteEnemy) this.playMissSound();
            return;
        }

        const stats = isLocal ? this.statsP1 : this.statsP2;

        stats.score -= 10;
        stats.misses += 1;
        stats.totalNotes += 1;
        stats.combo = 0; // Romper Combo
        this.updateScoreText();

        if (isLocal || this.isTwoPlayers || this.isMultiplayer) {
            this.playMissSound();
        }
    }

    onGhostMiss(data) {
        const isLocal = this._isLocal(data);

        this.registerClick(isLocal); // Un miss fantasma cuenta como click en CPS

        // Escuchar el click fallido del rival online si no está silenciado
        if (!isLocal && this.isMultiplayer) {
            const muteEnemy = window.Preferences ? window.Preferences.muteMissNoteEnemy : false;
            if (!muteEnemy) this.playMissSound();
            return;
        }

        const stats = isLocal ? this.statsP1 : this.statsP2;

        stats.score -= 10;
        stats.misses += 1;
        stats.combo = 0; // Romper Combo
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
        
        // Verifica si estamos usando el layout dividido o normal
        const isSplit = (this.isTwoPlayers || this.isMultiplayer) && showOp;
        
        // Si el texto está a los lados, se usa un salto de línea. Si está abajo al centro, un separador horizontal.
        const separator = isSplit ? '\n' : ' | ';

        const accP1 = this.calculateAccuracy(this.statsP1);
        const rankP1 = this.getRatingName(parseFloat(accP1));
        const cpsP1 = this.getCPS(true);

        const accP2 = this.calculateAccuracy(this.statsP2);
        const rankP2 = this.getRatingName(parseFloat(accP2));
        const cpsP2 = this.getCPS(false);

        // Nuevo formato que se ajusta a columnas si está en modo dividido
        const textP1 = `Score: ${this.statsP1.score}${separator}Rating: ${rankP1}${separator}Accuracy: ${accP1}%${separator}Misses: ${this.statsP1.misses}${separator}Combo: ${this.statsP1.combo}${separator}Max Combo: ${this.statsP1.maxCombo}${separator}CPS: ${cpsP1}`;
        const textP2 = `Score: ${this.statsP2.score}${separator}Rating: ${rankP2}${separator}Accuracy: ${accP2}%${separator}Misses: ${this.statsP2.misses}${separator}Combo: ${this.statsP2.combo}${separator}Max Combo: ${this.statsP2.maxCombo}${separator}CPS: ${cpsP2}`;

        if (isSplit) {
            if (this.playerEnemy) {
                this.renderer.updateSplit(textP2, textP1);
            } else {
                this.renderer.updateSplit(textP1, textP2);
            }
        } else {
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