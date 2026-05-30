// src/funkin/play/UI/score/renderer.js

class ScoreRenderer {
    constructor(scene, logic) {
        this.scene = scene;
        this.logic = logic;

        const posX = this.scene.scale.width / 2;

        // POSICIÓN "DEBAJO" DE LAS NOTAS
        // Si upscroll (notas caen de arriba): texto abajo de la pantalla (0.92)
        // Si downscroll (notas suben de abajo): texto arriba de la pantalla (0.08)
        const isDownscroll = window.Preferences && window.Preferences.downscroll;
        const posY = this.scene.scale.height * (isDownscroll ? 0.08 : 0.92);

        this.scoreText = this.scene.add.text(posX, posY, '', {
            fontFamily: '"VCR OSD Mono", "VCR", sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        });

        this.scoreText.setOrigin(0.5, 0.5);
        this.scoreText.setScrollFactor(0);
        this.scoreText.setDepth(10);

        if (this.scene.referee.cameras && typeof this.scene.referee.cameras.add === 'function') {
            this.scene.referee.cameras.add(this.scoreText, 'ui');
        }
    }

    // Utilidad para agregar comas a los miles (ej. 1000 -> 1,000)
    formatScoreNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    update(time, delta) {
        // Mantener la posición dinámica
        const isDownscroll = window.Preferences && window.Preferences.downscroll;
        this.scoreText.y = this.scene.scale.height * (isDownscroll ? 0.08 : 0.92);

        if (window.Preferences && window.Preferences.botplay) {
            const botplayStr = "BOTPLAY ENABLED";

            if (this.scoreText.text !== botplayStr) {
                this.scoreText.setText(botplayStr);
            }
            return;
        }

        // Usamos el displayScore animado y aplicamos Math.floor para evitar números decimales en pantalla
        const visualScore = Math.floor(this.logic.displayScore);
        const formattedScore = this.formatScoreNumber(visualScore);

        const dataMap = {
            'score': `Score: ${formattedScore}`, // Agregada coma y animación
            'rating': `Rating: ${this.logic.getRatingName()}`,
            'accuracy': `Accuracy: ${this.logic.getAccuracy()}%`,
            'misses': `Misses: ${this.logic.misses}`,
            'combo': `Combo: ${this.logic.combo}`,
            'maxCombo': `Max Combo: ${this.logic.maxCombo}`,
            'cps': `CPS: ${this.logic.getCPS()}`
        };

        const formatArray = window.Preferences.scoreFormat || ['score', 'rating', 'accuracy', 'misses', 'combo', 'maxCombo', 'cps'];

        const textParts = formatArray
            .map(key => dataMap[key])
            .filter(part => part !== undefined);

        const textStr = textParts.join(' | ');

        if (this.scoreText.text !== textStr) {
            this.scoreText.setText(textStr);
        }
    }

    destroy() {
        if (this.scoreText) {
            this.scoreText.destroy();
        }
    }
}

window.ScoreRenderer = ScoreRenderer;
