// src/funkin/play/data/skins.js

class Skins {
  static preload(scene) {
    const pd = scene.playData;
    const skinName = pd.get("skins.ui", "funkin");

    // 1. Creación de ID único de sesión para la Skin
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 100000);
    pd.uniqueSkinId = `${skinName}_${timestamp}_${randomId}`;

    const jsonKey = "skinData_" + pd.uniqueSkinId;
    pd.skinJsonKey = jsonKey; // Se guarda para que preload.js lo identifique

    if (scene.cache.json.exists(jsonKey)) {
      Skins.loadAssets(scene, scene.cache.json.get(jsonKey));
    } else {
      scene.load.json(jsonKey, window.Path.dataSkins + skinName + ".json");
      scene.load.once("filecomplete-json-" + jsonKey, (key, type, data) => {
        Skins.loadAssets(scene, data);
      });
    }
  }

  static loadAssets(scene, data) {
    const basePath = data?.global?.basePath || "Funkin";
    const uniqueId = scene.playData.uniqueSkinId;
    const antialiasing = data?.global?.antialiasing !== false; // true por defecto

    const extract = (obj) => {
      if (!obj || typeof obj !== "object") return;

      const assetPath = obj.path !== undefined ? obj.path : obj.assetPath;

      if (assetPath && typeof assetPath === "string") {
        const ext = assetPath.match(/\.[0-9a-z]+$/i);
        let finalPath = assetPath;
        let isAudio = obj.volume !== undefined || assetPath.includes("sound");

        if (!ext) {
          finalPath += isAudio ? ".ogg" : ".png";
        }

        const fullUrl = window.Path.skins + basePath + "/" + finalPath;
        const cacheKey = basePath + "_" + assetPath + "_" + uniqueId;

        if (isAudio) {
          if (!scene.cache.audio.exists(cacheKey))
            scene.load.audio(cacheKey, fullUrl);
        } else {
          if (!scene.textures.exists(cacheKey)) {
            scene.load.image(cacheKey, fullUrl);

            // Aplicar filtro Nearest si antialiasing es false
            scene.load.once("filecomplete-image-" + cacheKey, () => {
              if (!antialiasing && scene.textures.exists(cacheKey)) {
                scene.textures
                  .get(cacheKey)
                  .setFilter(Phaser.Textures.FilterMode.NEAREST);
              }
            });
          }
        }
      }

      for (let k in obj) {
        if (typeof obj[k] === "object") extract(obj[k]);
      }
    };

    extract(data);
  }

  constructor(scene) {
    this.scene = scene;
    this.skinName = scene.playData.get("skins.ui", "funkin");
    this.uniqueId = scene.playData.uniqueSkinId;
    this.data = scene.cache.json.get(scene.playData.skinJsonKey) || {};
    this.basePath = this.data?.global?.basePath || "Funkin";
  }

  get(path, defaultValue = null) {
    if (!path) return this.data;
    const result = path
      .split(".")
      .reduce(
        (prev, curr) =>
          prev && prev[curr] !== undefined ? prev[curr] : undefined,
        this.data,
      );
    return result !== undefined ? result : defaultValue;
  }

  // Ahora siempre integra el ID único a las llamadas de assets
  getKey(pathStr) {
    const assetPath = this.get(pathStr);
    if (!assetPath || typeof assetPath !== "string") return null;
    return this.basePath + "_" + assetPath + "_" + this.uniqueId;
  }

  update(time, delta) {}
}

window.Skins = Skins;
