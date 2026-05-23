// src/funkin/play/data/stage.js

class Stage {
    static preload(scene) {
        const pd = scene.playData;
        const stageName = pd.get('stage', 'stage');
        const jsonKey = 'stageData_' + stageName;

        if (scene.cache.json.exists(jsonKey)) {
            Stage.loadAssets(scene, scene.cache.json.get(jsonKey), stageName);
        } else {
            scene.load.json(jsonKey, window.Path.dataStages + stageName + '.json');
            scene.load.once('filecomplete-json-' + jsonKey, (key, type, data) => {
                Stage.loadAssets(scene, data, stageName);
            });
        }
    }

    static loadAssets(scene, data, stageName) {
        const folder = data.pathName || stageName;

        // Precarga del background desde la raíz del JSON si es una imagen
        if (data.background && typeof data.background === 'string' && !data.background.startsWith('#')) {
            window.StageImages.preload(scene, folder, { namePath: data.background });
        }

        const elements = data.stage || [];
        for (const item of elements) {
            if (item.type === 'image') window.StageImages.preload(scene, folder, item);
            else if (item.type === 'spritesheet') window.StageXML.preload(scene, folder, item);
        }
    }

    constructor(scene) {
        this.scene = scene;
        this.stageName = scene.playData.get('stage', 'stage');
        this.data = this.scene.cache.json.get('stageData_' + this.stageName) || {};
        this.folder = this.data.pathName || this.stageName;

        this.elements = [];
        this.characterPositions = {};

        this.build();

        this.beatListener = (curBeat) => this.onBeatHit(curBeat);
        if (window.Conductor) window.Conductor.events.on('beatHit', this.beatListener, this);
        this.scene.events.once('shutdown', this.shutdown, this);
    }

    build() {
        // Enlazar la nueva lógica separada en bg.js
        if (this.data.background && window.StageBackground) {
            window.StageBackground.apply(this.scene, this.folder, this.data.background, this.elements);
        }

        const stageArray = this.data.stage || [];
        const sorted = [...stageArray].sort((a, b) => (a.layer || 0) - (b.layer || 0));

        for (const item of sorted) {
            if (item.player) { this.characterPositions.player = item.player; continue; }
            if (item.enemy) { this.characterPositions.enemy = item.enemy; continue; }
            if (item.playergf) { this.characterPositions.playergf = item.playergf; continue; }

            let obj = null;
            if (item.type === 'image') obj = window.StageImages.build(this.scene, this.folder, item);
            else if (item.type === 'spritesheet') obj = window.StageXML.build(this.scene, this.folder, item);

            if (obj) {
                window.StageProps.apply(obj, item);
                if (this.scene.referee && this.scene.referee.cameras) {
                    this.scene.referee.cameras.add(obj, 'game');
                }
                this.elements.push(obj);
            }
        }
    }

    onBeatHit(curBeat) {
        for (const obj of this.elements) {
            if (typeof obj.onBeatHit === 'function') obj.onBeatHit(curBeat);
        }
    }

    update(time, delta) {
        for (const obj of this.elements) {
            if (typeof obj.update === 'function') obj.update(time, delta);
        }
    }

    shutdown() {
        if (window.Conductor) window.Conductor.events.off('beatHit', this.beatListener, this);
        this.elements = [];
    }
}

window.Stage = Stage;
