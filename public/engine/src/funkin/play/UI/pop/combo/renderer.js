// src/funkin/play/UI/pop/combo/renderer.js

class ComboSprite extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, textureKey, scaleVal) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);

    this.setOrigin(0.5, 0.5);
    this.setDepth(-10); // Debajo de las strumlines
    this.setScrollFactor(0);

    this.setScale(scaleVal);
    this.setAlpha(1);

    // --- FÍSICAS DE LOS NÚMEROS (Basado en FNF) ---
    // velocity.x = FlxG.random.float(-5, 5);
    this.velX = Math.random() * 10 - 5;

    // velocity.y -= FlxG.random.int(130, 150);
    this.velY = -(Math.floor(Math.random() * (150 - 130 + 1)) + 130);

    // acceleration.y = FlxG.random.int(250, 300);
    this.accelY = Math.floor(Math.random() * (300 - 250 + 1)) + 250;

    // Escuchamos el evento de actualización para la física
    this.updateListener = (time, delta) => {
      const dt = delta / 1000;

      this.velY += this.accelY * dt;
      this.x += this.velX * dt;
      this.y += this.velY * dt;
    };

    scene.events.on("update", this.updateListener);

    // --- ANIMACIÓN DE DESVANECIMIENTO ---
    // FNF usa el doble de delay para el combo que para el rating
    // Rating era: Conductor.beatLengthMs. Combo será: Conductor.beatLengthMs * 2
    const beatDelay = window.Conductor
      ? window.Conductor.beatLengthMs * 2
      : 1000;
    const isPixel = textureKey.toLowerCase().includes("pixel");

    scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: beatDelay,
      duration: 200, // 0.2 segundos
      ease: isPixel ? "Stepped" : "Linear",
      easeParams: isPixel ? [2] : undefined,
      onComplete: () => {
        this.destroySprite();
      },
    });

    this.once("destroy", () => {
      scene.events.off("update", this.updateListener);
    });
  }

  destroySprite() {
    if (this.scene) {
      this.scene.events.off("update", this.updateListener);
    }
    this.destroy();
  }
}

window.ComboSprite = ComboSprite;
