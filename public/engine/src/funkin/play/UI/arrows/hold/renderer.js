// src/funkin/play/UI/arrows/hold/renderer.js

class HoldCover extends Phaser.GameObjects.Sprite {
  constructor(scene, strumTarget) {
    const skins = scene.referee.skins;
    const holdData = skins.get("gameplay.holdCovers");

    if (
      !holdData ||
      !holdData.directions ||
      !holdData.directions[strumTarget.direction]
    ) {
      super(scene, 0, 0, "__MISSING");
      this.isValid = false;
      return;
    }

    const dirData = holdData.directions[strumTarget.direction];
    const jsonPath = `gameplay.holdCovers.directions.${strumTarget.direction}.path`;
    const atlasKey = skins.getKey(jsonPath) + "_XML";

    super(scene, 0, 0, atlasKey);
    scene.add.existing(this);

    this.strumTarget = strumTarget;
    this.direction = strumTarget.direction;
    this.isValid = true;

    // --- MAGIA DEL PROYECTO ANTIGUO: Arregla los recortes de Sparrow ---
    this.fixTextureTrims(atlasKey);

    // --- COMPORTAMIENTO HAXEFLIXEL ---
    // Se coloca en 0, 0 (Top Left) como en Flixel
    this.setOrigin(0, 0);
    this.setDepth(25);

    if (scene.referee.cameras) {
      scene.referee.cameras.add(this, "ui");
    }

    this.holdData = holdData;
    this.animData = dirData.animations;

    const jsonScale = holdData.scale !== undefined ? holdData.scale : 1;
    const strumScale =
      strumTarget.scaleX !== undefined ? strumTarget.scaleX : 0.7;
    const baseStrumScale = skins.get("gameplay.strumline.scale") || 0.7;
    const amplificationRatio = strumScale / baseStrumScale;

    this.finalScale = jsonScale * amplificationRatio;
    this.setScale(this.finalScale);
    this.setAlpha(holdData.alpha !== undefined ? holdData.alpha : 1.0);

    // Obtener tamaño base estático de la flecha
    const strumSkinData = skins.get("gameplay.strumline");
    const staticPrefix = strumSkinData.animations[this.direction].static;
    const strumAtlasKey = skins.getKey("gameplay.strumline.path") + "_XML";
    const strumTexture = scene.textures.get(strumAtlasKey);

    this.staticStrumWidth = 160;
    this.staticStrumHeight = 160;

    if (strumTexture && strumTexture.key !== "__MISSING") {
      const frames = strumTexture.getFrameNames();
      const staticFrameName = frames.find((f) => f.startsWith(staticPrefix));
      if (staticFrameName) {
        const frameData = strumTexture.get(staticFrameName);
        this.staticStrumWidth = frameData.sourceSize
          ? frameData.sourceSize.w
          : frameData.width;
        this.staticStrumHeight = frameData.sourceSize
          ? frameData.sourceSize.h
          : frameData.height;
      }
    }

    if (holdData.chromaKey && window.StageProps) {
      window.StageProps.applyChromaKey(
        this,
        holdData.chromaKey.color || holdData.chromaKey,
      );
    }
    if (holdData.blendMode) {
      this.setBlendMode(
        Phaser.BlendModes[holdData.blendMode.toUpperCase()] ||
          Phaser.BlendModes.NORMAL,
      );
    }

    this.createAnimations(atlasKey);

    this.setVisible(false);
    this.setActive(false);
    this.currentState = "inactive";

    // Escuchadores de animación (Vital para replicar el behavior de Flixel)
    this.on("animationcomplete", this.onAnimComplete, this);
    this.on("animationupdate", this.onAnimUpdate, this); // Recalcula los offsets en CADA frame
  }

  /**
   * Equivalente 1:1 al centerOffsets() de HaxeFlixel.
   * Al tener origin(0,0), forzamos que el ancla visual de la textura pivoté
   * desde su centro usando setDisplayOrigin. Así evitamos tirones de recorte.
   */
  centerOffsets() {
    if (!this.frame) return;

    const frameWidth = this.frame.width;
    const frameHeight = this.frame.height;

    this.setDisplayOrigin(frameWidth / 2, frameHeight / 2);
  }

  // SIMULA TU ANTIGUO SparrowParser.fixPhaserSparrow()
  fixTextureTrims(atlasKey) {
    const texture = this.scene.textures.get(atlasKey);
    if (!texture || texture.key === "__MISSING" || texture.customTrimFixed)
      return;

    Object.values(texture.frames).forEach((frame) => {
      if (frame.trimmed && frame.sourceSize) {
        frame.realWidth = frame.sourceSize.w;
        frame.realHeight = frame.sourceSize.h;
      }
    });
    texture.customTrimFixed = true;
  }

  createAnimations(atlasKey) {
    const anims = this.scene.anims;
    const texture = this.scene.textures.get(atlasKey);
    if (!texture || texture.key === "__MISSING") return;

    ["start", "hold", "end"].forEach((state) => {
      const prefix = this.animData[state];
      if (!prefix) return;

      const animKey = `${atlasKey}_holdcover_${this.direction}_${state}`;
      if (anims.exists(animKey)) return;

      const cleanPrefix = prefix.trim().toLowerCase().replace(/\s+/g, "");
      const validFrames = texture
        .getFrameNames()
        .filter(
          (f) =>
            f.startsWith(prefix) ||
            f.trim().toLowerCase().replace(/\s+/g, "").startsWith(cleanPrefix),
        )
        .sort();

      if (validFrames.length > 0) {
        anims.create({
          key: animKey,
          frames: validFrames.map((f) => ({ key: atlasKey, frame: f })),
          frameRate: 26,
          repeat: state === "hold" ? -1 : 0,
        });
      }
    });
  }

  playAnim(state) {
    if (!this.isValid || this.currentState === state) return;

    const jsonPath = `gameplay.holdCovers.directions.${this.direction}.path`;
    const atlasKey = this.scene.referee.skins.getKey(jsonPath) + "_XML";
    const animKey = `${atlasKey}_holdcover_${this.direction}_${state}`;

    if (this.scene.anims.exists(animKey)) {
      this.setVisible(true);
      this.setActive(true);
      this.play(animKey, true);
      this.centerOffsets(); // <- Centrar los offsets del primer frame inmediatamente
      this.currentState = state;
    } else {
      this.currentState = state;
      if (state === "end") {
        this.setVisible(false);
        this.setActive(false);
      } else {
        this.setVisible(true);
      }
    }
  }

  onAnimUpdate(animation, frame) {
    // En FNF, centerOffsets se aplica en cada actualización de frame por si la textura cambia de tamaño.
    this.centerOffsets();
  }

  onAnimComplete(animation) {
    if (this.currentState === "start") {
      this.playAnim("hold");
    } else if (this.currentState === "end") {
      this.setVisible(false);
      this.setActive(false);
      this.currentState = "inactive";
    }
  }

  syncPos() {
    if (!this.active || !this.visible || !this.strumTarget) return;

    this.setRotation(this.strumTarget.rotation);
    const strum = this.strumTarget;

    const currentScaleX =
      strum.staticScaleX !== undefined
        ? strum.staticScaleX
        : strum.scaleX !== undefined
          ? strum.scaleX
          : 1;
    const baseStrumScale =
      strum.baseScale ||
      this.scene.referee.skins.get("gameplay.strumline.scale") ||
      1;
    const relativeScale = currentScaleX / baseStrumScale;

    const baseCoverScale =
      this.holdData.scale !== undefined ? this.holdData.scale : 0.7;
    this.setScale(baseCoverScale * relativeScale);
    this.setAlpha(strum.alpha);

    // CORRECCIÓN: Usamos el targetX y targetY de la flecha que definen su centro absoluto del carril.
    // Esto evita que las dimensiones inconstantes de los frames (al cambiar a static/press/confirm)
    // causen desalineación en los HoldCovers.
    let strumCenterX = 0;
    let strumCenterY = 0;

    if (strum.targetX !== undefined && strum.targetY !== undefined) {
      strumCenterX = strum.targetX + (strum.animOffsetX || 0);
      strumCenterY = strum.targetY + (strum.animOffsetY || 0);
    } else {
      // Fallback genérico por si se trata de un Strum modificado que no usa targetX
      const originX = strum.originX !== undefined ? strum.originX : 0.5;
      const originY = strum.originY !== undefined ? strum.originY : 0.5;
      const fallbackW = strum.width || this.staticStrumWidth || 160;
      const fallbackH = strum.height || this.staticStrumHeight || 160;
      strumCenterX = strum.x + fallbackW * currentScaleX * (0.5 - originX);
      strumCenterY = strum.y + fallbackH * currentScaleX * (0.5 - originY);
    }

    const baseOffsetX = this.holdData.Offset ? this.holdData.Offset[0] || 0 : 0;
    const baseOffsetY = this.holdData.Offset ? this.holdData.Offset[1] || 0 : 0;

    const offsetX = baseOffsetX * relativeScale;
    const offsetY = baseOffsetY * relativeScale;

    // Como usamos centerOffsets() y setOrigin(0,0), el "displayOrigin" ya reside internamente
    // en el punto central de renderizado. Por tanto, x/y son directamente nuestra ancla.
    this.x = strumCenterX + offsetX;
    this.y = strumCenterY + offsetY;
  }

  destroy(fromScene) {
    this.off("animationcomplete", this.onAnimComplete, this);
    this.off("animationupdate", this.onAnimUpdate, this);
    super.destroy(fromScene);
  }
}

window.HoldCover = HoldCover;
