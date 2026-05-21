// src/funkin/play/UI/pop/combo/logic.js

class ComboLogic {
    static preload(scene) {
        const pd = scene.playData;
        const jsonKey = pd.skinJsonKey;

        const loadComboNums = (data) => {
            const basePath = data?.global?.basePath || 'Funkin';
            const uniqueSkinId = pd.uniqueSkinId;
            const comboData = data?.ui?.comboNumbers?.assets || {};

            let addedFiles = false;
            Object.keys(comboData).forEach(key => {
                const path = comboData[key];
                if (path) {
                    let finalPath = path;
                    if (!finalPath.match(/\.[0-9a-z]+$/i)) finalPath += '.png';

                    const fullUrl = window.Path.skins + basePath + '/' + finalPath;
                    const cacheKey = `combo_num_${key}_${uniqueSkinId}`;

                    if (!scene.textures.exists(cacheKey)) {
                        scene.load.image(cacheKey, fullUrl);
                        addedFiles = true;
                    }
                }
            });

            if (addedFiles && !scene.load.isLoading()) {
                scene.load.start();
            }
        };

        if (scene.cache.json.exists(jsonKey)) {
            loadComboNums(scene.cache.json.get(jsonKey));
        } else {
            scene.load.once(`filecomplete-json-${jsonKey}`, (k, t, data) => loadComboNums(data));
        }
    }

    constructor(scene) {
        this.scene = scene;
        this.skins = scene.referee.skins;
        this.comboData = this.skins.get('ui.comboNumbers') || {};
        this.uniqueId = this.scene.playData.uniqueSkinId || this.skins.uniqueId;

        this.currentComboP1 = 0;
        this.currentComboP2 = 0;
        this.activeSprites = { p1: [], p2: [] };

        this.onNoteHitListener = this.onNoteHit.bind(this);
        this.onNoteMissListener = this.onNoteMiss.bind(this);

        this.scene.events.on('noteHit', this.onNoteHitListener);
        this.scene.events.on('noteMiss', this.onNoteMissListener);
    }

    spawnCombo(comboValue, isOpponent) {
        const playerKey = isOpponent ? 'p2' : 'p1';

        if (window.Preferences && window.Preferences.popUpAnim === 'stackeable') {
            if (this.activeSprites[playerKey]) {
                this.activeSprites[playerKey].forEach(sprite => {
                    if (sprite && sprite.active) sprite.destroySprite();
                });
            }
            this.activeSprites[playerKey] = [];
        }

        const comboStr = comboValue.toString().padStart(3, '0');
        const scaleVal = this.comboData.globalScale !== undefined ? this.comboData.globalScale : 1.0;

        let baseX = 0;
        let baseY = 0;
        const isTwoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;

        if (isTwoPlayers) {
            // INVERTIDO: Enemigo (P2) a la izquierda, Jugador (P1) a la derecha
            if (isOpponent) {
                baseX = (this.scene.scale.width * 0.25) + 70; // 25% (Izquierda) + offset
            } else {
                baseX = (this.scene.scale.width * 0.75) + 70; // 75% (Derecha) + offset
            }
            baseY = (this.scene.scale.height * 0.50) + 50;
        } else {
            const posPercent = (window.Preferences && window.Preferences.popUpPos)
                ? window.Preferences.popUpPos
                : [50, 42];

            baseX = this.scene.scale.width * (posPercent[0] / 100) + 70;
            baseY = this.scene.scale.height * (posPercent[1] / 100) + 50;
        }

        let digitsInfo = [];
        let totalWidth = 0;
        const padding = -2 * scaleVal;

        for (let i = 0; i < comboStr.length; i++) {
            const digit = comboStr[i];
            const cacheKey = `combo_num_${digit}_${this.uniqueId}`;

            if (this.scene.textures.exists(cacheKey)) {
                const frame = this.scene.textures.getFrame(cacheKey);
                const width = frame ? (frame.width * scaleVal) : (43 * scaleVal);

                digitsInfo.push({ digit, cacheKey, width });
                totalWidth += width;
            }
        }

        totalWidth += (digitsInfo.length - 1) * padding;
        let currentX = baseX - (totalWidth / 2);

        for (let i = 0; i < digitsInfo.length; i++) {
            const info = digitsInfo[i];
            const spriteX = currentX + (info.width / 2);

            const sprite = new window.ComboSprite(this.scene, spriteX, baseY, info.cacheKey, scaleVal);

            if (this.scene.referee.cameras && typeof this.scene.referee.cameras.add === 'function') {
                this.scene.referee.cameras.add(sprite, 'ui');
            }

            if (window.Preferences && window.Preferences.popUpAnim === 'stackeable') {
                this.activeSprites[playerKey].push(sprite);
            }

            currentX += info.width + padding;
        }
    }

    onNoteHit(data) {
        if (!data || !data.note) return;

        const playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;
        const isTwoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;
        const isBotplay = window.Preferences ? window.Preferences.botplay : false; // <-- VARIABLE BOTPLAY

        const isOpponentNote = data.note.noteData && data.note.noteData.p === 'op';
        const isMainPlayerNote = playerEnemy ? isOpponentNote : !isOpponentNote;

        // NUEVO: Si es Botplay y la nota es del jugador, ignoramos el hit del combo por completo.
        if (isMainPlayerNote && isBotplay) return;

        if (!isMainPlayerNote && !isTwoPlayers) return;

        if (!isMainPlayerNote && isTwoPlayers && window.Preferences && window.Preferences.showOpPopUp === false) {
            return;
        }

        if (isOpponentNote) {
            this.currentComboP2++;
            this.spawnCombo(this.currentComboP2, true);
        } else {
            this.currentComboP1++;
            this.spawnCombo(this.currentComboP1, false);
        }
    }

    onNoteMiss(data) {
        const playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;
        const isTwoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;
        const isBotplay = window.Preferences ? window.Preferences.botplay : false; // <-- VARIABLE BOTPLAY

        const isOpponentMiss = data && data.p === 'op';
        const isMainPlayerMiss = playerEnemy ? isOpponentMiss : !isOpponentMiss;

        // NUEVO: Evitamos resetear o mostrar el miss (000) si el Botplay está activo.
        if (isMainPlayerMiss && isBotplay) return;

        if (!isMainPlayerMiss && !isTwoPlayers) return;

        if (!isMainPlayerMiss && isTwoPlayers && window.Preferences && window.Preferences.showOpPopUp === false) {
            return;
        }

        if (isOpponentMiss) {
            if (this.currentComboP2 > 0) {
                this.currentComboP2 = 0;
                this.spawnCombo(0, true);
            }
        } else {
            if (this.currentComboP1 > 0) {
                this.currentComboP1 = 0;
                this.spawnCombo(0, false);
            }
        }
    }

    update(time, delta) {}

    shutdown() {
        this.scene.events.off('noteHit', this.onNoteHitListener);
        this.scene.events.off('noteMiss', this.onNoteMissListener);
    }
}

window.ComboLogic = ComboLogic;
