// src/funkin/play/UI/score/renderer.js

class ScoreRenderer {
    constructor(scene, logic) {
        this.scene = scene;
        this.logic = logic;

        const posX = this.scene.scale.width / 2;

        // Determinar la posición inicial basándose en downscroll
        const isDownscroll = window.Preferences && window.Preferences.downscroll;
        const posY = this.scene.scale.height * (isDownscroll ? 0.155 : 0.935);

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
        this.scoreText.setDepth(100);

        if (this.scene.referee.cameras && typeof this.scene.referee.cameras.add === 'function') {
            this.scene.referee.cameras.add(this.scoreText, 'ui');
        }
    }

    update(time, delta) {
        // AJUSTE DINÁMICO: Cambiar la posición Y del texto según la preferencia de scroll
        const isDownscroll = window.Preferences && window.Preferences.downscroll;
        this.scoreText.y = this.scene.scale.height * (isDownscroll ? 0.155 : 0.935);

        // COMPROBACIÓN: Si Botplay está activo, mostrar únicamente el aviso y salir
        if (window.Preferences && window.Preferences.botplay) {
            const botplayStr = "BOTPLAY ENABLED";

            if (this.scoreText.text !== botplayStr) {
                this.scoreText.setText(botplayStr);
            }
            return;
        }

        // --- LÓGICA DE JUEGO NORMAL (BOTPLAY DESACTIVADO) ---
        const dataMap = {
            'score': `Score: ${this.logic.score}`,
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
