// src/funkin/play/characters/renderer.js
class CharacterRenderer extends Phaser.GameObjects.Sprite {
  constructor(scene, charId, role) {
    const cacheKey = `char_atlas_${charId}`;
    super(scene, 0, 0, cacheKey);
    scene.add.existing(this);
    this.charId = charId;
    this.role = role;
    this.charData = window.dataChars[charId] || scene.cache.json.get(`charData_${charId}`);
    if (!this.charData) {
        this.charData = { scale: 1, animations: [] };
    }
    this.danceDir = false;
    this.holdTimer = 0;
    
    window.CharacterAnimations.generate(scene, charId);
    
    const texture = scene.textures.get(cacheKey);
    if (texture && texture.key !== "__MISSING") {
      const firstFrame = texture.getFrameNames()[0];
      if (firstFrame) this.setFrame(firstFrame);
    }
    
    this.setOrigin(0, 0);
    this.stageConfig = this.getStageConfig(scene, role);
    this.baseX = 0;
    this.baseY = 0;
    this.applyStageConfig();
    
    let fw = 0;
    let fh = 0;
    if (this.frame) {
        fw = this.frame.sourceSize ? this.frame.sourceSize.w : this.frame.width;
        fh = this.frame.sourceSize ? this.frame.sourceSize.h : this.frame.height;
    }
    
    this.anchorX = this.baseX - (fw * this.scaleX / 2);
    this.anchorY = this.baseY - (fh * this.scaleY);
    
    if (scene.referee && scene.referee.cameras) {
      scene.referee.cameras.add(this, "game");
    }
    
    this.dance();
  }

  getStageConfig(scene, role) {
    const stageName = scene.playData.get("stage", "mainStage");
    const stageData = scene.cache.json.get("stageData_" + stageName);
    if (stageData && stageData.stage) {
      for (const item of stageData.stage) {
        if (item[role]) return item[role];
      }
    }
    return { position: [0, 0], scale: 1, flip_x: false, layer: 5, scrollFactor: 1, opacity: 1, visible: true };
  }

  applyStageConfig() {
    const cfg = this.stageConfig;
    this.baseX = cfg.position ? cfg.position[0] : 0;
    this.baseY = cfg.position ? cfg.position[1] : 0;
    
    let charScale = (this.charData && this.charData.scale !== undefined) ? this.charData.scale : 1;
    let stageScale = cfg.scale !== undefined ? cfg.scale : 1;
    if (Array.isArray(charScale)) charScale = charScale[0];
    if (Array.isArray(stageScale)) stageScale = stageScale[0];
    
    this.setScale(charScale * stageScale);
    
    const charFlip = (this.charData && this.charData.image && this.charData.image.flip_x) === true;
    const stageFlip = cfg.flip_x === true;
    const isPlayer = this.role === "players";
    this.setFlipX((charFlip !== stageFlip) !== isPlayer);
    
    if (cfg.layer !== undefined) this.setDepth(cfg.layer);
    if (cfg.scrollFactor !== undefined) this.setScrollFactor(cfg.scrollFactor);
    if (cfg.opacity !== undefined) this.setAlpha(cfg.opacity);
    if (cfg.visible !== undefined) this.setVisible(cfg.visible);
  }

  playAnim(animName, force = false) {
    const animKey = `${this.charId}_${animName}`;
    if (!this.scene.anims.exists(animKey)) return;
    
    this.play(animKey, !force);
    
    const animConfig = this.charData.animations.find(a => a.anim === animName);
    let offX = animConfig && animConfig.offsets ? animConfig.offsets[0] : 0;
    let offY = animConfig && animConfig.offsets ? animConfig.offsets[1] : 0;
    
    if (this.flipX) {
        offX = -offX;
    }
    this.x = this.anchorX - offX;
    this.y = this.anchorY - offY;
  }

  playSingAnim(direction, isMiss = false, sustainLength = 0) {
    const dirUpper = direction.toUpperCase();
    let animName = `sing${dirUpper}${isMiss ? "miss" : ""}`;
    
    // Priorizamos la animación de loop si estamos manteniendo una nota (sustain)
    if (!isMiss && sustainLength > 0) {
        const loopAnimName = `sing${dirUpper}-loop`;
        if (this.charData.animations.some(a => a.anim === loopAnimName)) {
            animName = loopAnimName;
        }
    }
    
    // Fallback a sing normal si el loop no existe
    if (!this.charData.animations.some(a => a.anim === animName)) {
        animName = `sing${dirUpper}`;
    }
    
    this.playAnim(animName, true);
    
    // Cálculo estricto del temporizador: Longitud de la nota + duración extra en Beats.
    // 4 steps = 1 beat. En FNF, las animaciones duran X cantidad de steps después de cantar.
    const stepMs = window.Conductor ? window.Conductor.stepLengthMs : 125;
    const singDurationSteps = (this.charData.sing_duration !== undefined && this.charData.sing_duration !== null)
                           ? Number(this.charData.sing_duration)
                           : 4; // Por defecto dura 4 steps (1 beat completo)
                           
    this.holdTimer = sustainLength + (stepMs * singDurationSteps);
  }

  dance() {
    // Si sigue presionado o en pleno periodo de sing_duration, no interrumpir con bailes
    if (this.holdTimer > 0) return;
    
    // Si está en un bucle infinito (como GF en algunas semanas), no interrumpir
    if (this.anims.currentAnim && this.anims.currentAnim.repeat === -1) return;

    // LÓGICA DE REPOSO: No interrumpir las animaciones de reposo para que
    // terminen su ciclo natural y mantengan la coordinación en personajes lentos.
    if (this.anims.isPlaying) {
      const curKey = this.anims.currentAnim ? this.anims.currentAnim.key : "";
      if (curKey.endsWith("_idle") || curKey.endsWith("_danceLeft") || curKey.endsWith("_danceRight")) {
        return; 
      }
    }

    const anims = this.charData.animations || [];
    const hasLeft = anims.some(a => a.anim === "danceLeft");
    const hasRight = anims.some(a => a.anim === "danceRight");
    
    // Alternar izquierda a derecha si tiene ambas (Spooky Kids, GF, etc)
    if (hasLeft && hasRight) {
      this.danceDir = !this.danceDir;
      if (this.danceDir) {
        this.playAnim("danceRight", true);
      } else {
        this.playAnim("danceLeft", true);
      }
    } else {
      // Baile estándar
      this.playAnim("idle", true);
    }
  }

  update(time, delta) {
    if (this.holdTimer > 0) {
      this.holdTimer -= delta;
      
      // En cuanto se agota el tiempo de canto + la tolerancia de beats,
      // obligamos al personaje a ejecutar el baile para cortar la pose de cantar.
      if (this.holdTimer <= 0) {
        this.dance();
      }
    }
  }
}
window.CharacterRenderer = CharacterRenderer;