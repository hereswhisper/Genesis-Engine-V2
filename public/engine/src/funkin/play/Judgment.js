// src/funkin/play/Judgment.js

class Judgment {
    // Constantes de Umbral (Milisegundos)
    static PBOT1_PERFECT_THRESHOLD = 5.0;
    static PBOT1_KILLER_THRESHOLD = 12.5;
    static PBOT1_SICK_THRESHOLD = 45.0;
    static PBOT1_GOOD_THRESHOLD = 90.0;
    static PBOT1_BAD_THRESHOLD = 135.0;
    static PBOT1_SHIT_THRESHOLD = 160.0;
    static PBOT1_MISS_THRESHOLD = 160.0;

    // Constantes de Puntuación
    static PBOT1_MAX_SCORE = 500.0;
    static PBOT1_MIN_SCORE = 9.0;
    static PBOT1_MISS_SCORE = -100;

    // Constantes Matemáticas (Curva Sigmoide)
    static PBOT1_SCORING_OFFSET = 54.99;
    static PBOT1_SCORING_SLOPE = 0.080;

    // ==========================================
    // --- SISTEMA DE SALUD (VALORES BASE 2.0)---
    // ==========================================
    static HEALTH_MAX = 2.0;
    static HEALTH_INITIAL = 1.0;
    static HEALTH_MIN = 0.0;

    // Valores calculados en base a 2.0 (ej. 1.5% de 2.0 = 0.03)
    static HEALTH_SICK = 0.03;         // +1.5%
    static HEALTH_GOOD = 0.015;        // +0.75%
    static HEALTH_BAD = 0.0;           // Neutro
    static HEALTH_SHIT = -0.02;        // -1.0%
    static HEALTH_MISS = -0.08;        // -4.0%
    static HEALTH_GHOST_MISS = -0.08;  // -4.0%
    static HEALTH_HOLD_PER_SEC = 0.12; // +6.0% por segundo (1000ms)

    static currentHealth = 1.0;

    // Resetea la salud (llamar al inicio de la canción)
    static resetHealth() {
        this.currentHealth = this.HEALTH_INITIAL;
    }

    /**
     * Determina el rating (nombre del juicio) según la diferencia de tiempo.
     */
    static getRating(diff) {
        const absDiff = Math.abs(diff);

        if (absDiff < this.PBOT1_PERFECT_THRESHOLD) return 'perfect';
        if (absDiff <= this.PBOT1_KILLER_THRESHOLD) return 'killer';
        if (absDiff <= this.PBOT1_SICK_THRESHOLD) return 'sick';
        if (absDiff <= this.PBOT1_GOOD_THRESHOLD) return 'good';
        if (absDiff <= this.PBOT1_BAD_THRESHOLD) return 'bad';
        if (absDiff <= this.PBOT1_SHIT_THRESHOLD) return 'shit';

        return 'miss';
    }

    /**
     * Calcula la puntuación variable usando la curva sigmoide.
     */
    static calculateScore(diff) {
        const absDiff = Math.abs(diff);

        if (absDiff > this.PBOT1_MISS_THRESHOLD) {
            return this.PBOT1_MISS_SCORE;
        }

        const exponent = this.PBOT1_SCORING_SLOPE * (absDiff - this.PBOT1_SCORING_OFFSET);
        const score = (this.PBOT1_MAX_SCORE - this.PBOT1_MIN_SCORE) / (1 + Math.exp(exponent)) + this.PBOT1_MIN_SCORE;

        return Math.floor(score);
    }

    // --- MÉTODOS DE MANEJO DE SALUD ---

    static applyHit(rating) {
        let delta = 0;
        if (rating === 'perfect' || rating === 'killer' || rating === 'sick') delta = this.HEALTH_SICK;
        else if (rating === 'good') delta = this.HEALTH_GOOD;
        else if (rating === 'bad') delta = this.HEALTH_BAD;
        else if (rating === 'shit') delta = this.HEALTH_SHIT;

        this.currentHealth = Math.max(this.HEALTH_MIN, Math.min(this.HEALTH_MAX, this.currentHealth + delta));
        return this.currentHealth;
    }

    static applyMiss() {
        this.currentHealth = Math.max(this.HEALTH_MIN, this.currentHealth + this.HEALTH_MISS);
        return this.currentHealth;
    }

    static applyGhostMiss() {
        this.currentHealth = Math.max(this.HEALTH_MIN, this.currentHealth + this.HEALTH_GHOST_MISS);
        return this.currentHealth;
    }

    static applyHold(deltaMs) {
        // Delta se proporciona en milisegundos por el motor
        let delta = this.HEALTH_HOLD_PER_SEC * (deltaMs / 1000.0);
        this.currentHealth = Math.min(this.HEALTH_MAX, this.currentHealth + delta);
        return this.currentHealth;
    }

    static checkGameOver(scene) {
        if (this.currentHealth <= this.HEALTH_MIN) {
            // Emitimos evento global de derrota para que la escena lo procese
            scene.events.emit('gameOver');
        }
    }
}

window.Judgment = Judgment;
