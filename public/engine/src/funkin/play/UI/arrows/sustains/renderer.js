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
    this.missedNote = false;
    this.timeOfMiss = 0;
    this.isCompleted = false;
    this.isOut = false;

    // SOLUCIÓN: Preservar y respetar la escala del JSON multiplicándola por el ratio de amplificación
    const jsonScale = Number(this.skinData.scale !== undefined ? this.skinData.scale : 0.6);
    const baseStrumScale = skins.get("gameplay.strumline.scale") || 0.7;
    const strumScale = this.strumTarget.scaleX !== undefined ? this.strumTarget.scaleX : baseStrumScale;
    const amplificationRatio = strumScale / baseStrumScale;

    this.scaleVal = jsonScale * amplificationRatio;

    const jsonAlpha = Number(this.skinData.alpha !== undefined ? this.skinData.alpha : 1.0);
    this.alphaVal = this.strumTarget.noteAlpha !== undefined ? this.strumTarget.noteAlpha : jsonAlpha;

    // Se calcula usando jsonScale local para evitar separaciones extremas en offsets
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

    const animOffX = this.strumTarget.animOffsetX || 0;
    const animOffY = this.strumTarget.animOffsetY || 0;

    const deltaX = (this.strumTarget.x - animOffX) - this.strumTarget.baseX;
    const deltaY = (this.strumTarget.y - animOffY) - this.strumTarget.baseY;
    const rot = this.strumTarget.rotation;

    const targetX = this.fixedTargetX + deltaX;
    const targetY = this.fixedTargetY + deltaY;

    let currentLengthMs = this.fullSustainLength;
    if (this.wasGoodHit && !this.missedNote) {
      currentLengthMs = this.noteData.t + this.fullSustainLength - songTime;
    } else if (this.missedNote) {
      currentLengthMs = this.noteData.t + this.fullSustainLength - this.timeOfMiss;
    }

    this.sustainLength = currentLengthMs;

    if (this.sustainLength <= 10 && this.wasGoodHit) {
      this.isCompleted = true;
      this.setVisible(false);
      if (this.strumTarget.isHeld === false) this.strumTarget.playAnim("static");
      return;
    }

    const pixelsPerMs = 0.45 * scrollSpeed;
    let visualHeight = this.sustainLength * pixelsPerMs;

    let noteY = targetY + (this.noteData.t - songTime) * pixelsPerMs * dirMult;

    if (this.wasGoodHit && !this.missedNote) {
      noteY = targetY;
    }

    const isHidden = this.alphaVal <= 0;

    if (visualHeight <= 0 || isHidden) {
      this.bodyPieces.forEach((p) => p.setVisible(false));

      if (isHidden && this.endSprite) {
          this.endSprite.setVisible(false);
          let endPosDist = noteY + (visualHeight * dirMult) - targetY;
          this.endSprite.setPosition(
              targetX - (endPosDist * Math.sin(rot)),
              targetY + (endPosDist * Math.cos(rot))
          );
          if (!strumDownscroll && this.endSprite.y < -300) this.isOut = true;
          else if (strumDownscroll && this.endSprite.y > this.scene.scale.height + 300) this.isOut = true;
      }
      return;
    }

    if (this.bodyFrameName && this.bodyFrameHeight > 0) {
      const basePieceH = this.bodyFrameHeight * this.scaleVal;
      const numPieces = Math.ceil(visualHeight / basePieceH);

      while (this.bodyPieces.length < numPieces) {
        const sp = this.scene.add.sprite(0, 0, this.atlasKey, this.bodyFrameName);
        sp.setDepth(20);
        if (this.scene.referee.cameras) this.scene.referee.cameras.add(sp, "ui");
        this.bodyPieces.push(sp);
      }

      const exactPieceH = visualHeight / numPieces;
      let curY = noteY;

      for (let i = 0; i < this.bodyPieces.length; i++) {
        const sp = this.bodyPieces[i];

        if (i < numPieces) {
          sp.setVisible(true);
          sp.setAlpha(this.alphaVal);
          sp.setFlipY(strumDownscroll);

          let startY = curY;
          let nextY = curY + (exactPieceH * dirMult) + (strumDownscroll ? -1 : 1);
          let endVisualY = noteY + (visualHeight * dirMult);
          let fW = sp.frame ? sp.frame.width : sp.width;

          if (!strumDownscroll) {
            if (nextY > endVisualY) nextY = endVisualY;
            let integerHeight = nextY - startY;
            sp.setOrigin(0.5, 0);

            const dist = startY - targetY;
            sp.setPosition(targetX - (dist * Math.sin(rot)), targetY + (dist * Math.cos(rot)));
            sp.setRotation(rot);
            sp.setScale(this.scaleVal, Math.max(0, integerHeight) / this.bodyFrameHeight);

            if (nextY <= targetY) {
                sp.setVisible(false);
            } else if (startY >= targetY) {
                sp.setCrop();
            } else {
                let hiddenRatio = (targetY - startY) / (nextY - startY);
                let cropTop = this.bodyFrameHeight * hiddenRatio;
                sp.setCrop(0, cropTop, fW, this.bodyFrameHeight - cropTop);
            }

          } else {
            if (nextY < endVisualY) nextY = endVisualY;
            let integerHeight = startY - nextY;
            sp.setOrigin(0.5, 1);

            const dist = startY - targetY;
            sp.setPosition(targetX - (dist * Math.sin(rot)), targetY + (dist * Math.cos(rot)));
            sp.setRotation(rot);
            sp.setScale(this.scaleVal, Math.max(0, integerHeight) / this.bodyFrameHeight);

            if (nextY >= targetY) {
                sp.setVisible(false);
            } else if (startY <= targetY) {
                sp.setCrop();
            } else {
                let hiddenRatio = (startY - targetY) / (startY - nextY);
                let visibleRatio = 1.0 - hiddenRatio;
                let cropHeight = this.bodyFrameHeight * visibleRatio;
                sp.setCrop(0, 0, fW, cropHeight);
            }
          }

          curY += (exactPieceH * dirMult);
        } else {
          sp.setVisible(false);
        }
      }
    }

    if (this.endSprite) {
      this.endSprite.setVisible(true);
      this.endSprite.setFlipY(strumDownscroll);

      let endPosDist = noteY + (visualHeight * dirMult) - targetY;
      this.endSprite.setPosition(
          targetX - (endPosDist * Math.sin(rot)),
          targetY + (endPosDist * Math.cos(rot))
      );
      this.endSprite.setRotation(rot);

      let capH = this.endSprite.height * this.scaleVal;
      if (capH <= 0) capH = 1;
      let fW = this.endSprite.frame ? this.endSprite.frame.width : this.endSprite.width;

      if (!strumDownscroll) {
        this.endSprite.setOrigin(0.5, 0);
        let endPos = noteY + visualHeight;
        let endPosBottom = endPos + capH;

        if (endPosBottom <= targetY) {
            this.endSprite.setVisible(false);
        } else if (endPos >= targetY) {
            this.endSprite.setCrop();
        } else {
            let hiddenRatio = (targetY - endPos) / capH;
            let cropTop = this.endSprite.height * hiddenRatio;
            this.endSprite.setCrop(0, cropTop, fW, this.endSprite.height - cropTop);
        }

        if (this.endSprite.y < -300) this.isOut = true;
      } else {
        this.endSprite.setOrigin(0.5, 1);
        let endPos = noteY - visualHeight;
        let endPosTop = endPos - capH;

        if (endPosTop >= targetY) {
            this.endSprite.setVisible(false);
        } else if (endPos <= targetY) {
            this.endSprite.setCrop();
        } else {
            let hiddenRatio = (endPos - targetY) / capH;
            let visibleRatio = 1.0 - hiddenRatio;
            let cropHeight = this.endSprite.height * visibleRatio;
            this.endSprite.setCrop(0, 0, fW, cropHeight);
        }

        if (this.endSprite.y > this.scene.scale.height + 300) this.isOut = true;
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
