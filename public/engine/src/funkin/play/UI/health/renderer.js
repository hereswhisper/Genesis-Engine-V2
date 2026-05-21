// src/funkin/play/UI/health/renderer.js

class HealthRenderer {
    constructor(scene, logic) {
        this.scene = scene;
        this.logic = logic;

        this.skins = scene.referee.skins;
        const uniqueSkinId = this.scene.playData.uniqueSkinId || this.skins.uniqueId;
        this.textureKey = `health_bar_${uniqueSkinId}`;

        this.posPercent = [50, 89];

        const posX = this.scene.scale.width * (this.posPercent[0] / 100);
        const posY = this.scene.scale.height * (this.posPercent[1] / 100);

        // 1. Gráficos dinámicos para el relleno de colores
        this.barFillGraphics = this.scene.add.graphics();
        this.barFillGraphics.setScrollFactor(0);
        this.barFillGraphics.setDepth(-19); // Colores encima del marco

        // 2. Imagen del marco de la barra
        this.frameSprite = this.scene.add.sprite(posX, posY, this.textureKey);
        this.frameSprite.setOrigin(0.5, 0.5);
        this.frameSprite.setScrollFactor(0);
        this.frameSprite.setDepth(-20); // Marco por debajo de los colores

        this.barWidth = 601;
        this.barHeight = 19;

        if (this.scene.textures.exists(this.textureKey)) {
            this.barWidth = this.frameSprite.width;
            this.barHeight = this.frameSprite.height;
        } else {
            this.frameSprite.setVisible(false);
        }

        if (this.scene.referee.cameras && typeof this.scene.referee.cameras.add === 'function') {
            this.scene.referee.cameras.add(this.barFillGraphics, 'ui');
            this.scene.referee.cameras.add(this.frameSprite, 'ui');
        }
    }

    update(time, delta) {
        if (!this.frameSprite.visible && this.scene.textures.exists(this.textureKey)) {
            this.frameSprite.setTexture(this.textureKey);
            this.frameSprite.setVisible(true);
            this.barWidth = this.frameSprite.width;
            this.barHeight = this.frameSprite.height;
        }

        const posX = this.scene.scale.width * (this.posPercent[0] / 100);
        const posY = this.scene.scale.height * (this.posPercent[1] / 100);

        this.frameSprite.setPosition(posX, posY);
        this.barFillGraphics.clear();

        const padding = 4;
        const innerWidth = this.barWidth - (padding * 2);
        const innerHeight = this.barHeight - (padding * 2);

        if (innerWidth <= 0 || innerHeight <= 0) return;

        const innerX = posX - (innerWidth / 2);
        const innerY = posY - (innerHeight / 2);

        // Seguridad matemática del porcentaje
        let p1Percent = this.logic.healthLerp / 2;
        if (isNaN(p1Percent)) p1Percent = 0.5;
        p1Percent = Phaser.Math.Clamp(p1Percent, 0, 1);

        const redColor = 0xFF0000;
        const greenColor = 0x66FF33;

        // 1. Dibujar Barra Roja (Enemigo - Fondo Completo)
        this.barFillGraphics.fillStyle(redColor, 1);
        this.barFillGraphics.fillRect(innerX, innerY, innerWidth, innerHeight);

        // 2. Dibujar Barra Verde (Jugador - Sobre la Roja de derecha a izquierda)
        const greenWidth = innerWidth * p1Percent;
        const greenX = innerX + innerWidth - greenWidth;

        if (greenWidth > 0) {
            this.barFillGraphics.fillStyle(greenColor, 1);
            this.barFillGraphics.fillRect(greenX, innerY, greenWidth, innerHeight);
        }
    }

    destroy() {
        if (this.barFillGraphics) this.barFillGraphics.destroy();
        if (this.frameSprite) this.frameSprite.destroy();
    }
}

window.HealthRenderer = HealthRenderer;
