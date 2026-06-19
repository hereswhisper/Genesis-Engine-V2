// src/funkin/play/UI/arrows/sustains/renderer.js

class SustainTrail {
  constructor(scene, noteData, strumTarget) {
    this.scene = scene;
    this.noteData = noteData;
    this.strumTarget = strumTarget;
    this.direction = strumTarget.direction;

    const skins = scene.referee.skins;
    this.skinData = skins.get("gameplay.sustains");
    this.atlasKey = skins.getKey("gameplay.sustains.path") + "_XML";

    this.fullSustainLength = Number(noteData.l) || 0;
    this.sustainLength = this.fullSustainLength;

    this.isBeingHeld = false;
    this.wasGoodHit = false;
    this.wasEverHit = false; 
    this.missedNote = false;
    this.timeOfMiss = 0;
    this.isCompleted = false;
    this.isOut = false;

    const jsonScale = Number(this.skinData.scale !== undefined ? this.skinData.scale : 0.6);
    const baseStrumScale = skins.get("gameplay.strumline.scale") || 0.7;
    const strumScale = this.strumTarget.scaleX !== undefined ? this.strumTarget.scaleX : baseStrumScale;
    const amplificationRatio = strumScale / baseStrumScale;

    this.scaleVal = jsonScale * amplificationRatio;

    const jsonAlpha = Number(this.skinData.alpha !== undefined ? this.skinData.alpha : 1.0);
    this.alphaVal = this.strumTarget.noteAlpha !== undefined ? this.strumTarget.noteAlpha : jsonAlpha;

    const ratio = this.scaleVal / jsonScale;
    this.offsetX = this.skinData.Offset ? Number(this.skinData.Offset[0] || 0) * ratio : 0;
    this.offsetY = this.skinData.Offset ? Number(this.skinData.Offset[1] || 0) * ratio : 0;

    const strumSkinData = skins.get("gameplay.strumline");
    const staticPrefix = strumSkinData.animations[this.direction].static;
    const strumAtlasKey = skins.getKey("gameplay.strumline.path") + "_XML";
    const strumTexture = scene.textures.get(strumAtlasKey);

    let staticWidth = 0;
    let staticHeight = 0;

    if (strumTexture && strumTexture.key !== "__MISSING") {
      const frames = strumTexture.getFrameNames();
      const staticFrameName = frames.find((f) => f.startsWith(staticPrefix));
      if (staticFrameName) {
        const frameData = strumTexture.get(staticFrameName);
        staticWidth = frameData.width * (this.strumTarget.scaleX || strumScale);
        staticHeight = frameData.height * (this.strumTarget.scaleY || strumScale);
      }
    }

    if (staticWidth === 0) {
      staticWidth = this.strumTarget.displayWidth;
      staticHeight = this.strumTarget.displayHeight;
    }

    const originX = this.strumTarget.originX !== undefined ? this.strumTarget.originX : 0.5;
    const originY = this.strumTarget.originY !== undefined ? this.strumTarget.originY : 0.5;

    const strumCenterX = this.strumTarget.baseX + (originX === 0 ? staticWidth / 2 : 0);
    const strumCenterY = this.strumTarget.baseY + (originY === 0 ? staticHeight / 2 : 0);

    this.fixedTargetX = strumCenterX + this.offsetX;
    this.fixedTargetY = strumCenterY + this.offsetY;

    this.bodyPieces = [];
    this.bodyFrameName = null;
    this.bodyFrameHeight = 0;

    this.endSprite = scene.add.sprite(0, 0, this.atlasKey).setDepth(20);

    if (scene.referee.cameras) {
      scene.referee.cameras.add(this.endSprite, "ui");
    }

    const anims = this.skinData.animations[this.direction];
    this.assignFrames(anims.body, anims.end);
  }

  assignFrames(bodyPrefix, endPrefix) {
    const texture = this.scene.textures.get(this.atlasKey);
    if (!texture) return;

    const frames = texture.getFrameNames();
    const bodyFrame = frames.find((f) => f.startsWith(bodyPrefix));
    const endFrame = frames.find((f) => f.startsWith(endPrefix));

    if (bodyFrame) {
      this.bodyFrameName = bodyFrame;
      const frameData = texture.get(bodyFrame);
      this.bodyFrameHeight = frameData.height;
    }

    if (endFrame) {
      this.endSprite.setFrame(endFrame);
      this.endSprite.setScale(this.scaleVal).setAlpha(this.alphaVal);
    }
  }

  updatePos(songTime, scrollSpeed, delta) {
    if (this.isCompleted || this.isOut) return;

    const strumDownscroll = this.strumTarget.downscroll;
    const dirMult = strumDownscroll ? -1 : 1;
    const rot = this.strumTarget.rotation;

    const animOffX = this.strumTarget.animOffsetX || 0;
    const animOffY = this.strumTarget.animOffsetY || 0;
    const deltaX = (this.strumTarget.x - animOffX) - this.strumTarget.baseX;
    const deltaY = (this.strumTarget.y - animOffY) - this.strumTarget.baseY;

    // --- AJUSTE VISUAL MANUAL ---
    // Desplaza todo (texturas y recortes) unos píxeles hacia abajo, igual que en la nota normal.
    const MANUAL_Y_OFFSET = 0;

    const targetX = this.fixedTargetX + deltaX;
    const targetY = this.fixedTargetY + deltaY + MANUAL_Y_OFFSET;

    // --- SOLUCIÓN DE RECORTE (CROP) FLUIDO SIN ESTIRAMIENTOS ---
    let visualStartTime = this.noteData.t;
    let isVisuallyHeld = this.isBeingHeld;

    if (this.strumTarget && this.strumTarget.anims && this.strumTarget.anims.currentAnim) {
        if (this.strumTarget.anims.currentAnim.key.includes('confirm')) {
            isVisuallyHeld = true;
            this.wasEverHit = true;
        }
    }

    if (this.wasEverHit) {
        if (!this.missedNote && isVisuallyHeld) {
            visualStartTime = songTime;
        } else {
            visualStartTime = this.timeOfMiss || this.noteData.t;
        }
    }

    // Clamp de seguridad
    if (visualStartTime < this.noteData.t) visualStartTime = this.noteData.t;
    if (visualStartTime > this.noteData.t + this.fullSustainLength) visualStartTime = this.noteData.t + this.fullSustainLength;

    let currentLengthMs = (this.noteData.t + this.fullSustainLength) - visualStartTime;
    if (currentLengthMs < 0) currentLengthMs = 0;
    this.sustainLength = currentLengthMs;

    if (this.sustainLength <= 10 && this.wasGoodHit && !this.missedNote) {
      this.isCompleted = true;
      this.setVisible(false);
      if (this.strumTarget.isHeld === false) this.strumTarget.playAnim("static");
      return;
    }

    const pixelsPerMs = 0.45 * scrollSpeed;
    
    // Generamos basándonos SIEMPRE en el tamaño total para no perder las proporciones
    let fullTopY = targetY + (this.noteData.t - songTime) * pixelsPerMs * dirMult;
    let fullBottomY = targetY + (this.noteData.t + this.fullSustainLength - songTime) * pixelsPerMs * dirMult;
    let visibleTopY = targetY + (visualStartTime - songTime) * pixelsPerMs * dirMult;

    let fullVisualHeight = this.fullSustainLength * pixelsPerMs;
    let isHidden = this.alphaVal <= 0 || fullVisualHeight <= 0 || currentLengthMs <= 0;

    if (isHidden) {
      this.bodyPieces.forEach((p) => p.setVisible(false));
      if (this.endSprite) {
          this.endSprite.setVisible(false);
          if (!strumDownscroll && visibleTopY < -300) this.isOut = true;
          else if (strumDownscroll && visibleTopY > this.scene.scale.height + 300) this.isOut = true;
      }
      return;
    }

    if (this.bodyFrameName && this.bodyFrameHeight > 0) {
      const basePieceH = this.bodyFrameHeight * this.scaleVal;
      const numPieces = Math.ceil(fullVisualHeight / basePieceH);

      while (this.bodyPieces.length < numPieces) {
        const sp = this.scene.add.sprite(0, 0, this.atlasKey, this.bodyFrameName);
        sp.setDepth(20);
        if (this.scene.referee.cameras) this.scene.referee.cameras.add(sp, "ui");
        this.bodyPieces.push(sp);
      }

      let curY = fullTopY;

      for (let i = 0; i < this.bodyPieces.length; i++) {
        const sp = this.bodyPieces[i];

        if (i < numPieces) {
          sp.setVisible(true);
          sp.setAlpha(this.alphaVal);
          sp.setFlipY(strumDownscroll);

          let startY = curY;
          let nextY = curY + (basePieceH * dirMult);

          if (!strumDownscroll) {
            // Lógica Upscroll
            if (nextY > fullBottomY) nextY = fullBottomY;
            let integerHeight = nextY - startY;
            sp.setOrigin(0.5, 0);

            const dist = startY - targetY;
            sp.setPosition(targetX - (dist * Math.sin(rot)), targetY + (dist * Math.cos(rot)));
            sp.setRotation(rot);
            sp.setScale(this.scaleVal, Math.max(0, integerHeight) / this.bodyFrameHeight);
            
            let fW = sp.frame ? sp.frame.width : sp.width;

            // Recortar lo que fue consumido
            if (nextY <= visibleTopY) {
                sp.setVisible(false); 
            } else if (startY >= visibleTopY) {
                sp.setCrop(); 
            } else {
                let hiddenRatio = (visibleTopY - startY) / (nextY - startY);
                let cropTop = this.bodyFrameHeight * hiddenRatio;
                sp.setCrop(0, cropTop, fW, this.bodyFrameHeight - cropTop);
            }

          } else {
            // Lógica Downscroll
            if (nextY < fullBottomY) nextY = fullBottomY;
            let integerHeight = startY - nextY;
            sp.setOrigin(0.5, 1);

            const dist = startY - targetY;
            sp.setPosition(targetX - (dist * Math.sin(rot)), targetY + (dist * Math.cos(rot)));
            sp.setRotation(rot);
            sp.setScale(this.scaleVal, Math.max(0, integerHeight) / this.bodyFrameHeight);

            let fW = sp.frame ? sp.frame.width : sp.width;

            // Recortar lo que fue consumido
            if (nextY >= visibleTopY) {
                sp.setVisible(false); 
            } else if (startY <= visibleTopY) {
                sp.setCrop(); 
            } else {
                let hiddenRatio = (startY - visibleTopY) / (startY - nextY);
                let visibleRatio = 1.0 - hiddenRatio;
                let cropHeight = this.bodyFrameHeight * visibleRatio;
                sp.setCrop(0, 0, fW, cropHeight);
            }
          }

          curY += (basePieceH * dirMult);
        } else {
          sp.setVisible(false);
        }
      }
    }

    if (this.endSprite) {
      this.endSprite.setVisible(true);
      this.endSprite.setFlipY(strumDownscroll);
      this.endSprite.setRotation(rot);
      this.endSprite.setScale(this.scaleVal);
      this.endSprite.setAlpha(this.alphaVal);
      
      let capH = this.endSprite.height * this.scaleVal;
      if (capH <= 0) capH = 1;
      let fW = this.endSprite.frame ? this.endSprite.frame.width : this.endSprite.width;

      const dist = fullBottomY - targetY;
      this.endSprite.setPosition(targetX - (dist * Math.sin(rot)), targetY + (dist * Math.cos(rot)));

      if (!strumDownscroll) {
        this.endSprite.setOrigin(0.5, 0);
        let endPosBottom = fullBottomY + capH;

        if (endPosBottom <= visibleTopY) {
            this.endSprite.setVisible(false);
        } else if (fullBottomY >= visibleTopY) {
            this.endSprite.setCrop();
        } else {
            let hiddenRatio = (visibleTopY - fullBottomY) / capH;
            let cropTop = this.endSprite.height * hiddenRatio;
            this.endSprite.setCrop(0, cropTop, fW, this.endSprite.height - cropTop);
        }

        if (this.endSprite.y < -500) this.isOut = true;
      } else {
        this.endSprite.setOrigin(0.5, 1);
        let endPosTop = fullBottomY - capH;

        if (endPosTop >= visibleTopY) {
            this.endSprite.setVisible(false);
        } else if (fullBottomY <= visibleTopY) {
            this.endSprite.setCrop();
        } else {
            let hiddenRatio = (fullBottomY - visibleTopY) / capH;
            let visibleRatio = 1.0 - hiddenRatio;
            let cropHeight = this.endSprite.height * visibleRatio;
            this.endSprite.setCrop(0, 0, fW, cropHeight);
        }

        if (this.endSprite.y > this.scene.scale.height + 500) this.isOut = true;
      }
    }
  }

  setAlpha(val) {
    this.alphaVal = val;
    this.bodyPieces.forEach((p) => p.setAlpha(val));
    if (this.endSprite) this.endSprite.setAlpha(val);
  }

  setVisible(val) {
    this.bodyPieces.forEach((p) => p.setVisible(val));
    if (this.endSprite) this.endSprite.setVisible(val);
  }

  destroy() {
    this.bodyPieces.forEach((p) => p.destroy());
    this.bodyPieces = [];
    if (this.endSprite) this.endSprite.destroy();
  }
}

window.SustainTrail = SustainTrail;