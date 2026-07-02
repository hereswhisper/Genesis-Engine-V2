// src/funkin/play/UI/pop/rating/renderer.js

class RatingSprite extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, textureKey, scaleVal) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);

    this.setOrigin(0.5, 0.5);
    this.setDepth(-10); // Asegura que quede debajo de las strumlines
    this.setScrollFactor(0);

    // Se usa el tamaño base directamente ya que la animación pop-in se quita
    this.setScale(scaleVal);
    this.setAlpha(1);

    // --- FÍSICAS (Basado en la lógica original de HaxeFlixel) ---
    // velocity.x -= FlxG.random.int(0, 10);
    this.velX = -Math.floor(Math.random() * 11); // Valor entre -10 y 0

    // velocity.y -= FlxG.random.int(140, 175);
    this.velY = -Math.floor(Math.random() * (175 - 140 + 1) + 140);

    // acceleration.y = 550;
    this.accelY = 550;

    // Escuchamos el evento de actualización para la física
    this.updateListener = (time, delta) => {
      const dt = delta / 1000; // Flixel usa delta en segundos

      this.velY += this.accelY * dt;
      this.x += this.velX * dt;
      this.y += this.velY * dt;
    };

    scene.events.on("update", this.updateListener);

    // --- ANIMACIÓN DE DESVANECIMIENTO (Fade Out) ---
    // Obtenemos el beatLength actual del conductor si existe (sino por defecto 500ms)
    const beatDelay = window.Conductor ? window.Conductor.beatLengthMs : 500;

    // Comprobar estilo pixel
    // (En phaser podemos usar un interpolador escalonado si es necesario)
    const isPixel = textureKey.toLowerCase().includes("pixel");

    scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: beatDelay, // En Phaser delay usa Milisegundos, así que beatLengthMs es perfecto
      duration: 200, // 0.2 segundos de duración
      ease: isPixel ? "Stepped" : "Linear",
      easeParams: isPixel ? [2] : undefined, // easeUtil.stepped(2) si es pixel
      onComplete: () => {
        this.destroySprite();
      },
    });

    // Evento de seguridad
    this.once("destroy", () => {
      scene.events.off("update", this.updateListener);
    });
  }

  // Método para limpiar memoria al ser interrumpido o terminar
  destroySprite() {
    if (this.scene) {
      this.scene.events.off("update", this.updateListener);
    }
    this.destroy();
  }
}

window.RatingSprite = RatingSprite;
