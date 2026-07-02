// src/funkin/play/UI/arrows/splash/renderer.js

class NoteSplash extends Phaser.GameObjects.Sprite {
  constructor(scene) {
    const skins = scene.referee.skins;
    const atlasKey = skins.getKey("gameplay.noteSplashes.path") + "_XML";
    super(scene, 0, 0, atlasKey);

    this.setOrigin(0, 0);
    this.setDepth(200);
    this.scene.add.existing(this);

    this.strumTarget = null;
    this.splashOffsetX = 0;
    this.splashOffsetY = 0;

    if (this.scene.referee.cameras) {
      this.scene.referee.cameras.add(this, "ui");
    }

    this.on("animationcomplete", () => {
      this.setVisible(false);
      this.setActive(false);
    });
  }

  spawn(strumTarget, skinData) {
    const direction = strumTarget.direction;
    const anims = skinData.animations[direction];
    if (!anims) return;

    const animToPlay = anims[Math.floor(Math.random() * anims.length)];
    if (!this.scene.anims.exists(animToPlay)) return;

    this.setActive(true);
    this.setVisible(true);

    const jsonAlpha = skinData.alpha !== undefined ? skinData.alpha : 1;
    const targetAlpha =
      strumTarget.noteAlpha !== undefined ? strumTarget.noteAlpha : jsonAlpha;
    this.setAlpha(targetAlpha);

    if (targetAlpha <= 0) {
      this.setVisible(false);
      this.setActive(false);
      return;
    }

    const jsonScale = skinData.scale !== undefined ? skinData.scale : 1;
    const strumScale =
      strumTarget.scaleX !== undefined ? strumTarget.scaleX : 0.7;
    const baseStrumScale =
      this.scene.referee.skins.get("gameplay.strumline.scale") || 0.7;

    const amplificationRatio = strumScale / baseStrumScale;
    const finalScale = jsonScale * amplificationRatio;
    this.setScale(finalScale);

    if (skinData.chromaKey && window.StageProps) {
      window.StageProps.applyChromaKey(
        this,
        skinData.chromaKey.color || skinData.chromaKey,
      );
    }

    this.play(animToPlay);

    this.strumTarget = strumTarget;
    this.splashOffsetX =
      (skinData.Offset ? skinData.Offset[0] : 0) * amplificationRatio;
    this.splashOffsetY =
      (skinData.Offset ? skinData.Offset[1] : 0) * amplificationRatio;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    if (this.active && this.visible && this.strumTarget) {
      this.setRotation(this.strumTarget.rotation);

      const visualWidth = this.width * this.scaleX;
      const visualHeight = this.height * this.scaleY;

      // Restamos el offset de animación para que se centre en el verdadero punto original del strum
      const animOffX = this.strumTarget.animOffsetX || 0;
      const animOffY = this.strumTarget.animOffsetY || 0;

      const trueStrumX = this.strumTarget.x - animOffX;
      const trueStrumY = this.strumTarget.y - animOffY;

      this.setPosition(
        trueStrumX - visualWidth / 2 + this.splashOffsetX,
        trueStrumY - visualHeight / 2 + this.splashOffsetY,
      );
    }
  }
}

window.NoteSplash = NoteSplash;
