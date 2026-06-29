// src/funkin/play/data/stage.js

class Stage {
    static preload(scene) {
        const pd = scene.playData;
        const stageName = pd.get('stage', 'mainStage');
        const jsonKey = 'stageData_' + stageName;

        if (scene.cache.json.exists(jsonKey)) {
            const cachedData = scene.cache.json.get(jsonKey);
            const targetFolder = cachedData._isFallback ? 'mainStage' : stageName;
            Stage.loadAssets(scene, cachedData, targetFolder);
        } else {
            let isFallback = false;

            scene.load.once('filecomplete-json-' + jsonKey, (key, type, data) => {
                scene.load.off('loaderror', errorHandler); 

                if (isFallback) {
                    data._isFallback = true; 
                }

                const targetFolder = isFallback ? 'mainStage' : stageName;
                Stage.loadAssets(scene, data, targetFolder);

                // FIX: RACE CONDITION DEL LOADER DE PHASER
                // Si la build lee el JSON tan rápido que el loader llega a pausarse 
                // antes de inyectar las texturas, lo obligamos a arrancar de nuevo.
                if (!scene.load.isLoading()) {
                    scene.load.start();
                }
            });

            const errorHandler = (file) => {
                if (file.key === jsonKey) {
                    scene.load.off('loaderror', errorHandler); 

                    if (stageName !== 'mainStage') {
                        console.warn(`[Stage] ⚠️ Stage "${stageName}" no encontrado. Ejecutando fallback a mainStage.json...`);
                        isFallback = true;
                        scene.load.json(jsonKey, window.Path.dataStages + 'mainStage.json');
                    } else {
                        console.error(`[Stage] ❌ Error crítico: El stage de rescate (mainStage.json) no existe.`);
                    }
                }
            };

            scene.load.on('loaderror', errorHandler);
            scene.load.json(jsonKey, window.Path.dataStages + stageName + '.json');
        }
    }

    static loadAssets(scene, data, stageName) {
        const folder = data.pathName || stageName;

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
        this.stageName = scene.playData.get('stage', 'mainStage');
        this.data = this.scene.cache.json.get('stageData_' + this.stageName) || {};

        const isFallback = this.data._isFallback === true;
        this.folder = this.data.pathName || (isFallback ? 'mainStage' : this.stageName);

        this.elements = [];
        this.characterPositions = {};

        this.build();

        this.beatListener = (curBeat) => this.onBeatHit(curBeat);
        if (window.Conductor) window.Conductor.events.on('beatHit', this.beatListener, this);
        this.scene.events.once('shutdown', this.shutdown, this);
    }

    build() {
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