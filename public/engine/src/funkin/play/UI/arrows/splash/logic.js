// src/funkin/play/UI/arrows/splash/logic.js

class NoteSplashLogic {
  constructor(scene) {
    this.scene = scene;
    this.skins = scene.referee.skins;
    this.skinData = this.skins.get("gameplay.noteSplashes");

    if (!this.skinData || !this.skinData.path) return;

    this.createAnimations();

    this.splashGroup = this.scene.add.group({
      classType: window.NoteSplash,
      runChildUpdate: false,
      maxSize: 30,
    });

    this.scene.events.on("noteHit", this.onNoteHit, this);
    this.scene.events.once("shutdown", this.destroy, this);
  }

  createAnimations() {
    const atlasKey = this.skins.getKey("gameplay.noteSplashes.path") + "_XML";
    const texture = this.scene.textures.get(atlasKey);

    if (!texture || texture.key === "__MISSING") return;

    const allFrames = texture.getFrameNames();
    const animsData = this.skinData.animations;

    for (let dir in animsData) {
      animsData[dir].forEach((animName) => {
        if (!this.scene.anims.exists(animName)) {
          const normalizedPrefix = animName.replace(/\s+/g, " ").trim();

          const validFrames = allFrames
            .filter((f) => {
              const normalizedFrame = f.replace(/\s+/g, " ").trim();
              return normalizedFrame.startsWith(normalizedPrefix);
            })
            .sort();

          if (validFrames.length > 0) {
            this.scene.anims.create({
              key: animName,
              frames: validFrames.map((f) => ({ key: atlasKey, frame: f })),
              frameRate: 24,
              hideOnComplete: false,
            });
          }
        }
      });
    }
  }

  onNoteHit(data) {
    if (!data || !data.note || !data.note.noteData || !window.Preferences.noteSplashes) return;

    if (data.note.isBotPlay) return;

    const isPlayer = data.note.noteData.p === "pl";

    if (isPlayer) {
      const absDiff = Math.abs(
        data.note.noteData.t - window.Conductor.songPosition,
      );
      if (absDiff <= window.Judgment.PBOT1_SICK_THRESHOLD) {
        this.showSplash(data.note.direction, true);
      }
    } else {
      this.showSplash(data.note.direction, false);
    }
  }

  showSplash(direction, isPlayer) {
    const strumLogic =
      this.scene.referee.strumlines || this.scene.referee.strumline;
    if (!strumLogic) return;

    const strumGroup = isPlayer
      ? strumLogic.playerStrums
      : strumLogic.opponentStrums;
    if (!strumGroup) return;

    const strums = strumGroup.getChildren();
    const targetStrum = strums.find((s) => s.direction === direction);

    if (targetStrum) {
      let splash = this.splashGroup.get();
      if (splash) {
        // Enviar solo la flecha entera y la skinData
        splash.spawn(targetStrum, this.skinData);
      }
    }
  }

  destroy() {
    this.scene.events.off("noteHit", this.onNoteHit, this);
    if (this.splashGroup) this.splashGroup.destroy(true);
  }
}

window.NoteSplashLogic = NoteSplashLogic;
