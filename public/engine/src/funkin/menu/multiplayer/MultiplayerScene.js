// src/funkin/menu/multiplayer/MultiplayerScene.js

class MultiplayerScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MultiplayerScene' });
    }

    create() {
        const bgKey = this.textures.exists('menuDesat') ? 'menuDesat' : 'menuBG';
        this.bg = this.add.sprite(this.scale.width / 2, this.scale.height / 2, bgKey);
        this.bg.setOrigin(0.5, 0.5);

        if (bgKey === 'menuDesat') this.bg.setTint(0x6655ff);

        // Cambiado de 'LOCAL CO-OP' a 'LOCAL'
        this.options = ['HOST GAME', 'JOIN GAME', 'LOCAL'];
        this.curSelected = 0;
        this.menuItems = this.add.group();

        this.options.forEach((option, i) => {
            if (window.Alphabet) {
                let textItem = new window.Alphabet(this, 0, 0, option, true);
                textItem.isMenuItem = true;
                textItem.targetY = i;
                textItem.x = (this.scale.width / 2) - (textItem.width / 2);
                this.menuItems.add(textItem);
            } else {
                let textItem = this.add.text(this.scale.width / 2, 200 + (i * 150), option, {
                    fontFamily: '"VCR OSD Mono", "VCR", sans-serif',
                    fontSize: '64px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 8,
                    align: 'center'
                }).setOrigin(0.5, 0.5);
                textItem.isMenuItem = true;
                textItem.targetY = i;
                this.menuItems.add(textItem);
            }
        });

        this.changeSelection(0);
        this.input.keyboard.on('keydown', this.handleInput, this);
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    handleInput(e) {
        if (!window.Controls || e.repeat) return;

        if (window.Controls.UI_UP(e)) { this.changeSelection(-1); this.playScrollSound(); }
        else if (window.Controls.UI_DOWN(e)) { this.changeSelection(1); this.playScrollSound(); }
        else if (window.Controls.ACCEPT(e)) { this.selectOption(); this.playConfirmSound(); }
        else if (window.Controls.BACK(e)) {
            this.playCancelSound();
            this.input.keyboard.off('keydown', this.handleInput, this);
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenuScene'));
        }
    }

    changeSelection(change) {
        this.curSelected += change;
        if (this.curSelected < 0) this.curSelected = this.options.length - 1;
        if (this.curSelected >= this.options.length) this.curSelected = 0;

        let items = this.menuItems.getChildren();
        items.forEach((item, index) => {
            item.setAlpha(0.6);
            if (index === this.curSelected) item.setAlpha(1.0);
            if (item.isMenuItem) item.targetY = index - this.curSelected;
        });
    }

    selectOption() {
        this.input.keyboard.off('keydown', this.handleInput, this);
        let selectedOption = this.options[this.curSelected];
        let items = this.menuItems.getChildren();
        let selectedItem = items[this.curSelected];

        this.tweens.add({
            targets: selectedItem, alpha: 0, duration: 80, ease: 'Linear', repeat: 5, yoyo: true,
            onComplete: () => this.executeOption(selectedOption)
        });

        items.forEach((item, index) => {
            if (index !== this.curSelected) {
                this.tweens.add({ targets: item, alpha: 0, duration: 400, ease: 'Quad.easeOut' });
            }
        });
    }

    executeOption(option) {
        if (option === 'LOCAL') {
            window.isMultiplayer = false;
            window.startCountdown = true;

            // Se eliminó la inyección forzosa hacia Preferences para evitar el auto-activado del twoplayers.

            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('FreeplayScene'));

        } else if (option === 'HOST GAME') {
            let code = Math.floor(1000 + Math.random() * 9000).toString();

            window.isMultiplayer = true;
            window.isMultiplayerWaiting = true;
            window.startCountdown = false;
            window.MultiplayerData = { active: true, isHost: true, code: code };

            // Envía los datos sobre el origen a PlayScene
            this.registry.set("playLoadData", {
                CurrentSong: "fresh", // O la canción por defecto que desees cargar
                Difficulty: "nightmare",
                SceneOrigin: "multiplayer",
                isMultiplayer: true
            });

            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('PlayScene'));

        } else if (option === 'JOIN GAME') {
            let code = window.prompt("INGRESA EL CÓDIGO DE 4 NÚMEROS:");
            if (!code || code.trim().length !== 4) {
                this.input.keyboard.on('keydown', this.handleInput, this);
                this.changeSelection(0);
                return;
            }

            window.isMultiplayer = true;
            window.isMultiplayerWaiting = true;
            window.startCountdown = false;
            window.MultiplayerData = { active: true, isHost: false, code: code.trim() };

            // Envía los datos sobre el origen a PlayScene
            this.registry.set("playLoadData", {
                CurrentSong: "fresh", // O la canción por defecto que desees cargar
                Difficulty: "nightmare",
                SceneOrigin: "multiplayer",
                isMultiplayer: true
            });

            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('PlayScene'));
        }
    }

    update(time, delta) {
        let items = this.menuItems.getChildren();
        items.forEach((item) => {
            if (item.isMenuItem) {
                let lerpVal = Math.max(0, Math.min(1, delta * 0.008));
                let targetYPos = (this.scale.height / 2) + (item.targetY * 160);
                item.y = Phaser.Math.Linear(item.y, targetYPos, lerpVal);
            }
        });
    }

    playScrollSound() { if (this.sound && this.cache.audio.exists('scrollMenu')) this.sound.play('scrollMenu'); }
    playConfirmSound() { if (this.sound && this.cache.audio.exists('confirmMenu')) this.sound.play('confirmMenu'); }
    playCancelSound() { if (this.sound && this.cache.audio.exists('cancelMenu')) this.sound.play('cancelMenu'); }
}

window.MultiplayerScene = MultiplayerScene;
window.game.scene.add('MultiplayerScene', window.MultiplayerScene);
