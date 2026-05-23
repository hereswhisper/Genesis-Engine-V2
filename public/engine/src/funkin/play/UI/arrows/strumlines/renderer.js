// src/funkin/play/UI/arrows/strumlines/renderer.js

class Strum extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, direction, dirID) {
        const skins = scene.referee.skins;
        const atlasKey = skins.getKey('gameplay.strumline.path') + '_XML';

        super(scene, x, y, atlasKey);
        scene.add.existing(this);

        this.direction = direction;
        this.dirID = dirID;
        this.skinData = skins.get('gameplay.strumline');
        this.dirData = this.skinData.animations[direction];

        this.setOrigin(0, 0);

        this.targetX = x;
        this.targetY = y;

        const scaleVal = this.skinData.scale !== undefined ? this.skinData.scale : 0.7;
        this.setScale(scaleVal);
        this.setAlpha(this.skinData.alpha !== undefined ? this.skinData.alpha : 1.0);

        this.createAnimations(atlasKey);

        const staticAnimKey = `${atlasKey}_${this.direction}_static`;
        if (this.scene.anims.exists(staticAnimKey)) {
            const firstFrame = this.scene.anims.get(staticAnimKey).frames[0].frame.name;
            this.setFrame(firstFrame);
        }

        this.baseX = x - (this.width * scaleVal) / 2;
        this.baseY = y - (this.height * scaleVal) / 2;

        // Variables para aislar el desplazamiento visual de la animación
        this.animOffsetX = 0;
        this.animOffsetY = 0;

        this.isHeld = false;
        this.currentState = 'static';
        this.playAnim('static');

        // PARCHE HMR: Evitar crash de 'indexOf' al guardar código
        this.scene.events.once('shutdown', this.cleanupHitboxInput, this);
    }

    applyScale(newScale) {
        this.setScale(newScale);
        this.baseX = this.targetX - (this.width * newScale) / 2;
        this.baseY = this.targetY - (this.height * newScale) / 2;
        this.playAnim(this.currentState || 'static');

        if (this.hitbox) {
            const actualWidth = 160 * newScale * 1.65;
            this.hitbox.setSize(actualWidth, this.hitbox.height);
            this.hitbox.setX(this.targetX - (actualWidth / 2) + 35);
        }
    }

    createMobileHitbox(isVisible) {
        const height = this.scene.scale.height;
        const actualWidth = 160 * this.scaleX * 1.65;
        const hitboxHeight = height / 2;
        const hitboxY = height / 2;
        const hitboxX = this.targetX - (actualWidth / 2) + 35;

        const colors = [0xc24b99, 0x00ffff, 0x12fa05, 0xf9393f];
        const color = colors[this.dirID % 4];

        this.hitbox = this.scene.add.rectangle(hitboxX, hitboxY, actualWidth, hitboxHeight, color);
        this.hitbox.setOrigin(0, 0);
        this.hitbox.setScrollFactor(0);
        this.hitbox.setDepth(9999);

        this.hitbox.setFillStyle(color, 1);
        this.hitbox.setAlpha(isVisible ? 0.35 : 0);
        this.hitbox.setInteractive();

        if (this.scene.input) {
            this.scene.input.topOnly = false;
        }

        if (this.scene.referee && this.scene.referee.cameras) {
            this.scene.referee.cameras.add(this.hitbox, 'ui');
        }

        const keyMap = { 'left': 37, 'down': 40, 'up': 38, 'right': 39 };
        const keyCode = keyMap[this.direction];

        const dispatch = (type) => {
            const event = new KeyboardEvent(type, { bubbles: true, cancelable: true });
            Object.defineProperty(event, 'keyCode', { get: () => keyCode });
            Object.defineProperty(event, 'which', { get: () => keyCode });
            window.dispatchEvent(event);
        };

        this.hitbox.on('pointerdown', () => dispatch('keydown'));
        this.hitbox.on('pointerover', (pointer) => {
            if (pointer.isDown) dispatch('keydown');
        });
        this.hitbox.on('pointerup', () => dispatch('keyup'));
        this.hitbox.on('pointerout', () => dispatch('keyup'));
    }

    createAnimations(atlasKey) {
        const anims = this.scene.anims;
        const texture = this.scene.textures.get(atlasKey);
        if (!texture || texture.key === '__MISSING') return;

        ['static', 'press', 'confirm'].forEach(state => {
            const prefix = this.dirData[state];
            if (!prefix) return;

            const animKey = `${atlasKey}_${this.direction}_${state}`;
            if (anims.exists(animKey)) anims.remove(animKey);

            const validFrames = texture.getFrameNames().filter(f => f.startsWith(prefix) || f.includes(prefix)).sort();

            if (validFrames.length > 0) {
                anims.create({
                    key: animKey,
                    frames: validFrames.map(f => ({ key: atlasKey, frame: f })),
                    frameRate: 24,
                    repeat: state === 'static' ? -1 : 0
                });
            }
        });
    }

    playAnim(state) {
        const skins = this.scene.referee.skins;
        const atlasKey = skins.getKey('gameplay.strumline.path') + '_XML';
        const animKey = `${atlasKey}_${this.direction}_${state}`;

        if (!this.scene.anims.exists(animKey)) return;

        this.play(animKey, true);
        this.currentState = state;

        if (state === 'confirm') {
            this.once('animationcomplete', () => {
                if (this.isHeld) this.playAnim('press');
                else this.playAnim('static');
            });
        }

        if (state === 'press') {
            this.once('animationcomplete', () => {
                if (this.anims.currentAnim) {
                    const lastFrame = this.anims.currentAnim.frames[this.anims.currentAnim.frames.length - 1];
                    this.anims.pause(lastFrame);
                }
            });
        }

        const jsonScale = this.skinData.scale !== undefined ? this.skinData.scale : 0.7;
        const ratio = this.scaleX / jsonScale;
        let offset = this.skinData.offsets[state] || [0, 0];

        // Guardamos el offset de la animación para ignorarlo en las notas/sustains
        this.animOffsetX = offset[0] * ratio;
        this.animOffsetY = offset[1] * ratio;

        this.setPosition(this.baseX + this.animOffsetX, this.baseY + this.animOffsetY);
    }

    update(time, delta) {}

    cleanupHitboxInput() {
        if (this.hitbox && this.hitbox.input) {
            this.hitbox.disableInteractive();
        }
    }

    destroy(fromScene) {
        if (this.scene && this.scene.events) {
            this.scene.events.off('shutdown', this.cleanupHitboxInput, this);
        }

        this.cleanupHitboxInput();

        if (this.hitbox) {
            if (!fromScene) {
                this.hitbox.destroy();
            }
            this.hitbox = null;
        }
        super.destroy(fromScene);
    }
}

window.Strum = Strum;
