// src/funkin/play/UI/arrows/notes/renderer.js

class Note extends Phaser.GameObjects.Sprite {
    constructor(scene, noteData, strumTarget) {
        const skins = scene.referee.skins;
        const atlasKey = skins.getKey('gameplay.notes.path') + '_XML';

        super(scene, 0, 0, atlasKey);
        scene.add.existing(this);

        this.noteData = noteData;
        this.strumTarget = strumTarget;
        this.direction = strumTarget.direction;

        this.skinData = skins.get('gameplay.notes');
        this.animPrefix = this.skinData.animations[this.direction];

        this.setOrigin(0, 0);
        this.setDepth(30);

        const jsonScale = Number(this.skinData.scale !== undefined ? this.skinData.scale : 0.7);
        const finalScale = this.strumTarget.scaleX !== undefined ? this.strumTarget.scaleX : jsonScale;
        this.setScale(finalScale);

        const jsonAlpha = Number(this.skinData.alpha !== undefined ? this.skinData.alpha : 1.0);
        const targetAlpha = this.strumTarget.noteAlpha !== undefined ? this.strumTarget.noteAlpha : jsonAlpha;
        this.setAlpha(targetAlpha);

        if (targetAlpha <= 0) this.setVisible(false);

        this.createAnimations(atlasKey);

        const animKey = `${atlasKey}_note_${this.direction}`;
        if (this.scene.anims.exists(animKey)) {
            const firstFrame = this.scene.anims.get(animKey).frames[0].frame.name;
            this.setFrame(firstFrame);
        }

        this.baseOffsetX = this.strumTarget.baseX;
        this.targetY = this.strumTarget.baseY;

        if (this.skinData.Offset) {
            const ratio = finalScale / jsonScale;
            this.baseOffsetX += Number(this.skinData.Offset[0] || 0) * ratio;
            this.targetY += Number(this.skinData.Offset[1] || 0) * ratio;
        }

        this.playAnim(animKey);

        const initialSongTime = (window.Conductor && window.Conductor.songPosition) ? window.Conductor.songPosition : 0;
        const scrollSpeed = Number(scene.playData.get('scrollSpeed', 2.0));
        this.updatePos(initialSongTime, scrollSpeed);
    }

    createAnimations(atlasKey) {
        const anims = this.scene.anims;
        const texture = this.scene.textures.get(atlasKey);
        if (!texture || texture.key === '__MISSING' || !this.animPrefix) return;

        const animKey = `${atlasKey}_note_${this.direction}`;
        if (anims.exists(animKey)) return;

        const allFrames = texture.getFrameNames();
        const validFrames = allFrames.filter(f => f.startsWith(this.animPrefix) || f.includes(this.animPrefix)).sort();

        if (validFrames.length > 0) {
            anims.create({
                key: animKey,
                frames: validFrames.map(f => ({ key: atlasKey, frame: f })),
                frameRate: 24,
                repeat: -1
            });
        }
    }

    playAnim(animKey) {
        if (this.scene.anims.exists(animKey)) {
            this.play(animKey, true);
        }
    }

    updatePos(songTime, scrollSpeed) {
        const timeDiff = this.noteData.t - songTime;
        const strumDownscroll = this.strumTarget.downscroll;
        const dir = strumDownscroll ? -1 : 1;

        const animOffX = this.strumTarget.animOffsetX || 0;
        const animOffY = this.strumTarget.animOffsetY || 0;

        // Desplazamiento dinámico del carril ignorando el offset visual de la animación
        const deltaX = (this.strumTarget.x - animOffX) - this.strumTarget.baseX;
        const deltaY = (this.strumTarget.y - animOffY) - this.strumTarget.baseY;
        const rot = this.strumTarget.rotation;

        const dist = timeDiff * 0.45 * scrollSpeed * dir;

        const offsetX = -dist * Math.sin(rot);
        const offsetY = dist * Math.cos(rot);

        const currentX = this.baseOffsetX + deltaX + offsetX;
        const currentY = this.targetY + deltaY + offsetY;

        this.setPosition(currentX, currentY);
        this.setRotation(rot);
    }
}

window.Note = Note;
