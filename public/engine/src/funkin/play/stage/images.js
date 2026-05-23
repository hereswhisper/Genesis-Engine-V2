// src/funkin/play/stage/images.js

class StageImages {
    static getPath(folder, namePath) {
        const hasExt = /\.[a-zA-Z0-9]+$/.test(namePath);
        const isCustomPath = namePath.includes('/');
        const finalName = hasExt ? namePath : namePath + '.png';

        // Si tiene su propia ruta (contiene '/'), ignora el 'folder' (pathName raíz)
        return window.Path.stages + (isCustomPath ? finalName : folder + '/' + finalName);
    }

    static preload(scene, folder, item) {
        const key = `stage_${folder}_${item.namePath}`;
        if (!scene.textures.exists(key)) {
            scene.load.image(key, this.getPath(folder, item.namePath));
        }
    }

    static build(scene, folder, item) {
        const key = `stage_${folder}_${item.namePath}`;
        const img = scene.add.image(0, 0, key);

        // Origen 0,0 por defecto estricto
        img.setOrigin(0, 0);

        // Auto-control de la clase
        img.update = function(time, delta) {};
        img.onBeatHit = function(curBeat) {};

        return img;
    }
}

window.StageImages = StageImages;
