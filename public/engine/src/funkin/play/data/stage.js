// src/funkin/play/data/stage.js

class Stage {
    static preload(scene) {
        const pd = scene.playData;
        // OJO: El primer argumento es 'stage' (la propiedad en el JSON de la canción).
        // El segundo es 'mainStage', que es el valor por defecto si no encuentra la propiedad.
        const stageName = pd.get('stage', 'mainStage');
        const jsonKey = 'stageData_' + stageName;

        if (scene.cache.json.exists(jsonKey)) {
            const cachedData = scene.cache.json.get(jsonKey);
            // Si ya estaba en caché y fue un fallback previo, respetamos su folder 'mainStage'
            const targetFolder = cachedData._isFallback ? 'mainStage' : stageName;
            Stage.loadAssets(scene, cachedData, targetFolder);
        } else {
            let isFallback = false;

            // 1. Escuchamos el éxito de la carga (ya sea la original o la de rescate)
            scene.load.once('filecomplete-json-' + jsonKey, (key, type, data) => {
                scene.load.off('loaderror', errorHandler); // Limpiamos el detector de errores

                if (isFallback) {
                    data._isFallback = true; // Inyectamos bandera para el constructor
                }

                const targetFolder = isFallback ? 'mainStage' : stageName;
                Stage.loadAssets(scene, data, targetFolder);
            });

            // 2. Escuchamos por si ocurre un 404 (Archivo no encontrado)
            const errorHandler = (file) => {
                // Verificamos que el error sea específicamente nuestro JSON
                if (file.key === jsonKey) {
                    scene.load.off('loaderror', errorHandler); // Evitar bucles infinitos

                    if (stageName !== 'mainStage') {
                        console.warn(`[Stage] ⚠️ Stage "${stageName}" no encontrado. Ejecutando fallback a mainStage.json...`);
                        isFallback = true;
                        // Añadimos el stage por defecto a la cola con la MISMA llave
                        scene.load.json(jsonKey, window.Path.dataStages + 'mainStage.json');
                    } else {
                        console.error(`[Stage] ❌ Error crítico: El stage de rescate (mainStage.json) no existe.`);
                    }
                }
            };

            scene.load.on('loaderror', errorHandler);

            // 3. Iniciamos la solicitud de carga original
            scene.load.json(jsonKey, window.Path.dataStages + stageName + '.json');
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
        // Aquí también: buscamos la propiedad 'stage', con fallback a 'mainStage'
        this.stageName = scene.playData.get('stage', 'mainStage');
        this.data = this.scene.cache.json.get('stageData_' + this.stageName) || {};

        // Usamos el flag inyectado en preload para saber si debemos usar el folder por defecto 'mainStage'
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
