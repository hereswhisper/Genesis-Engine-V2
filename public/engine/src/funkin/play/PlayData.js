// src/funkin/play/PlayData.js

class PlayData {
  constructor(scene) {
    this.scene = scene;

    // Extraemos los datos del Registry inyectados por el menú
    const rawData = scene.registry.get("playLoadData") || {
      CurrentSong: "tutorial",
      SceneOrigin: "freeplay",
      Difficulty: "normal",
      Playlist: ["tutorial"],
    };

    this.songId = rawData.CurrentSong;
    this.difficulty = rawData.Difficulty;
    this.origin = rawData.SceneOrigin;
    this.playlist = rawData.Playlist;

    // Metadatos crudos de la canción
    this.rawMeta = window.DataSongs.getSongMeta(this.songId) || {};
    this.songName = this.rawMeta.songName || this.songId;

    // Fusionamos la data (Base + Dificultad)
    this.mergedData = this._buildMergedData();
  }

  _buildMergedData() {
    let baseData = this.rawMeta.base ? this._deepClone(this.rawMeta.base) : {};

    // Atributos raíz
    baseData.songName = this.songName;
    baseData.events =
      this.rawMeta.events !== undefined ? this.rawMeta.events : false;

    // Sobreescritura por dificultad
    let diffData = {};
    if (
      this.rawMeta.difficulties &&
      this.rawMeta.difficulties[this.difficulty]
    ) {
      diffData = this.rawMeta.difficulties[this.difficulty];
    }

    return this._deepMerge(baseData, diffData);
  }

  /**
   * Acceso rápido a cualquier dato: get('audio.bpm')
   */
  get(path, defaultValue = null) {
    if (!path) return this.mergedData;

    // Compatibilidad directa con los Referees y Charts
    if (path === "song") return this.songId;
    if (path === "difficulty") return this.difficulty;

    const result = path
      .split(".")
      .reduce(
        (prev, curr) =>
          prev && prev[curr] !== undefined ? prev[curr] : undefined,
        this.mergedData,
      );
    return result !== undefined ? result : defaultValue;
  }

  /**
   * Integración Chart: Obtiene la ruta del archivo notes.json
   * basado en la canción actual.
   */
  getChartPath() {
    return `${window.Path.songs}${this.songId}/charts/notes.json`;
  }

  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  _deepMerge(target, source) {
    let output = Object.assign({}, target);
    if (this._isObject(target) && this._isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this._isObject(source[key])) {
          if (!(key in target)) Object.assign(output, { [key]: source[key] });
          else output[key] = this._deepMerge(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  _isObject(item) {
    return item && typeof item === "object" && !Array.isArray(item);
  }
}

window.PlayData = PlayData;
