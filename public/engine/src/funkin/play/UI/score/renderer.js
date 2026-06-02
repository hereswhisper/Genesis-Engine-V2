// src/funkin/play/UI/score/renderer.js

class ScoreRenderer {
    constructor(scene) {
        this.scene = scene;

        const w = this.scene.scale.width;
        const h = this.scene.scale.height;

        const fontStyle = {
            fontFamily: '"VCR OSD Mono", "VCR", sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        };

        // Textos Separados por Pantalla
        this.textP2 = this.scene.add.text(w * 0.25, h * 0.95, "", fontStyle).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100).setVisible(false);
        this.textP1 = this.scene.add.text(w * 0.75, h * 0.95, "", fontStyle).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100).setVisible(false);
        this.textSingle = this.scene.add.text(w * 0.5, h * 0.95, "", fontStyle).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100).setVisible(true);

        if (this.scene.referee.cameras) {
            this.scene.referee.cameras.add(this.textP2, 'ui');
            this.scene.referee.cameras.add(this.textP1, 'ui');
            this.scene.referee.cameras.add(this.textSingle, 'ui');
        }
    }

    // Pantalla Dividida
    updateSplit(textRight, textLeft) {
        this.textSingle.setVisible(false);
        this.textP1.setVisible(true).setText(textRight);
        this.textP2.setVisible(true).setText(textLeft);
    }

    // Modo Normal / Un jugador
    updateSingle(text) {
        this.textP1.setVisible(false);
        this.textP2.setVisible(false);
        this.textSingle.setVisible(true).setText(text);
    }

    destroy() {
        if (this.textP1) this.textP1.destroy();
        if (this.textP2) this.textP2.destroy();
        if (this.textSingle) this.textSingle.destroy();
    }
}
window.ScoreRenderer = ScoreRenderer;
