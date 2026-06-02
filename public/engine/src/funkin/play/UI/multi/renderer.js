// src/funkin/play/UI/multi/renderer.js
class MultiRenderer {
    constructor(scene) {
        this.scene = scene;
        const w = scene.scale.width;
        const h = scene.scale.height;

        // Fondo oscuro semitransparente
        this.bg = scene.add.rectangle(w/2, h/2, w, h, 0x000000, 0.7);

        // Texto de estado
        this.statusText = scene.add.text(w/2, h/2, 'CARGANDO...', {
            fontFamily: '"VCR OSD Mono", "VCR", sans-serif',
            fontSize: '64px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5, 0.5);

        // Añadir a la cámara UI para que no se mueva con el Stage
        if (scene.referee && scene.referee.cameras && scene.referee.cameras.uiCamera) {
            this.bg.setScrollFactor(0).setCameras([scene.referee.cameras.uiCamera]);
            this.statusText.setScrollFactor(0).setCameras([scene.referee.cameras.uiCamera]);

            // Forzamos un depth súper alto para que tape todo en la UI
            this.bg.setDepth(9998);
            this.statusText.setDepth(9999);
        }

        this.setVisible(false);
    }

    setVisible(visible) {
        this.bg.setVisible(visible);
        this.statusText.setVisible(visible);
    }

    setText(text) {
        this.statusText.setText(text);
    }
}
window.MultiRenderer = MultiRenderer;
