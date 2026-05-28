// src/funkin/play/UI/score/logic.js

class ScoreLogic {
    static preload(scene) {}

    constructor(scene) {
        this.scene = scene;

        // Variables de estadísticas
        this.score = 0;
        this.misses = 0;
        this.combo = 0;
        this.maxCombo = 0;

        // Variables para la precisión (Accuracy)
        this.totalNotesHit = 0;
        this.totalHitsWeight = 0;

        // Clics por segundo (CPS)
        this.clickTimestamps = [];

        window.Score = this;
        this.renderer = new window.ScoreRenderer(this.scene, this);

        // Identificador del jugador principal
        const playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;
        this.mainPlayerId = playerEnemy ? "p2" : "p1";

        // Escuchar eventos de teclado
        this.onKeyDown = (e) => this.handleCPSInput(e);
        window.addEventListener("keydown", this.onKeyDown);

        // Escuchar eventos globales del juego
        this.scene.events.on("noteHit", this.onNoteHit, this);
        this.scene.events.on("noteMiss", this.onNoteMiss, this);
        this.scene.events.on("ghostMiss", this.onGhostMiss, this);

        this.scene.events.once("shutdown", this.shutdown, this);
    }

    handleCPSInput(e) {
        if (!window.Controls || e.repeat) return;

        const isNoteKey =
            window.Controls.NOTE_UP(e) || window.Controls.NOTE_DOWN(e) ||
            window.Controls.NOTE_LEFT(e) || window.Controls.NOTE_RIGHT(e) ||
            window.Controls.P2_NOTE_UP(e) || window.Controls.P2_NOTE_DOWN(e) ||
            window.Controls.P2_NOTE_LEFT(e) || window.Controls.P2_NOTE_RIGHT(e);

        if (isNoteKey) {
            this.clickTimestamps.push(performance.now());
        }
    }

    onNoteHit(packet) {
        // 1. IDENTIFICACIÓN BLINDADA: Averiguar de quién es la nota incluso si viene del BotLogic antiguo
        let isMainPlayer = true;

        if (packet && packet.playerId) {
            // Nuevo sistema
            isMainPlayer = (packet.playerId === this.mainPlayerId);
        } else if (packet && packet.note && packet.note.noteData) {
            // Sistema antiguo (usado por el Bot)
            const expectedP = this.mainPlayerId === "p2" ? "op" : "pl";
            isMainPlayer = (packet.note.noteData.p === expectedP);
        }

        // Si NO es el jugador principal, ignoramos todo para que el enemigo no suba el combo/accuracy
        if (!isMainPlayer) return;

        // 2. ACTUALIZAR COMBO
        this.combo++;
        if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
        }

        this.totalNotesHit++;

        // 3. ACTUALIZAR SCORE (Filtro Anti-NaN)
        let points = 350; // Valor seguro por defecto
        if (packet && packet.scoreAdded !== undefined && !isNaN(packet.scoreAdded)) {
            points = packet.scoreAdded;
        } else if (packet && packet.score !== undefined && !isNaN(packet.score)) {
            points = packet.score;
        }
        this.score += points;

        // 4. ACTUALIZAR PRECISIÓN (ACCURACY)
        let weight = 1.0;
        const ratingName = (packet && packet.rating) ? packet.rating.toLowerCase() : 'sick';

        switch (ratingName) {
            case 'killer':
            case 'perfect': weight = 1.0; break;
            case 'sick':    weight = 1.0; break;
            case 'good':    weight = 0.75; break;
            case 'bad':     weight = 0.5; break;
            case 'shit':    weight = 0.25; break;
            default:        weight = 1.0; break; // Prevención de errores si no hay rating
        }

        this.totalHitsWeight += weight;
    }

    onNoteMiss(packet) {
        let isMainPlayer = true;

        if (packet && packet.playerId) {
            isMainPlayer = (packet.playerId === this.mainPlayerId);
        } else if (packet && packet.note && packet.note.noteData) {
            const expectedP = this.mainPlayerId === "p2" ? "op" : "pl";
            isMainPlayer = (packet.note.noteData.p === expectedP);
        }

        if (!isMainPlayer) return;

        this.combo = 0;
        this.misses++;
        this.score -= 10;
        this.totalNotesHit++;
    }

    onGhostMiss(packet) {
        let isMainPlayer = true;

        if (packet && packet.playerId) {
            isMainPlayer = (packet.playerId === this.mainPlayerId);
        } else if (packet && packet.isOpponent !== undefined) {
            const expectedOpponent = this.mainPlayerId === "p2";
            isMainPlayer = (packet.isOpponent === expectedOpponent);
        }

        if (!isMainPlayer) return;

        this.combo = 0;
        this.misses++;
        this.score -= 10;
    }

    getAccuracy() {
        if (this.totalNotesHit === 0) return "0.00";

        // Cálculo con protección extra contra NaN
        let acc = (this.totalHitsWeight / this.totalNotesHit) * 100;
        if (isNaN(acc)) return "0.00";

        return acc.toFixed(2);
    }

    getRatingName() {
        if (this.totalNotesHit === 0) return "?";
        const acc = parseFloat(this.getAccuracy());

        if (isNaN(acc)) return "?";

        if (acc === 100) return "SFC";
        if (acc >= 90) return "Sick!";
        if (acc >= 80) return "Good";
        if (acc >= 70) return "Meh";
        if (acc >= 60) return "Bad";
        return "Shit";
    }

    getCPS() {
        const now = performance.now();
        this.clickTimestamps = this.clickTimestamps.filter(t => now - t < 1000);
        return this.clickTimestamps.length;
    }

    update(time, delta) {
        if (this.renderer && typeof this.renderer.update === 'function') {
            this.renderer.update(time, delta);
        }
    }

    shutdown() {
        window.removeEventListener("keydown", this.onKeyDown);
        this.scene.events.off("noteHit", this.onNoteHit, this);
        this.scene.events.off("noteMiss", this.onNoteMiss, this);
        this.scene.events.off("ghostMiss", this.onGhostMiss, this);

        if (this.renderer && typeof this.renderer.destroy === 'function') {
            this.renderer.destroy();
        }
    }
}

window.ScoreLogic = ScoreLogic;
