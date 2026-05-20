// src/core/phaser/config.js

window.GenesisConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    // Llamamos a la instancia para definir el ancho dinámicamente antes de que arranque el motor
    width: window.wide ? window.wide.calculatePanoramicWidth() : 1280,
    height: 720,
    dom: {
        createContainer: true,
    },
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
        pixelArt: false,
        antialias: true,
    },
    // Añadimos soporte para múltiples toques (más de 10 dedos simultáneos)
    input: {
        activePointers: 12
    }
};
