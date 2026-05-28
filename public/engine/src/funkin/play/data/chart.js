// src/funkin/play/data/chart.js

class Chart {
  constructor(scene) {
    this.scene = scene;
    this.playData = scene.playData;

    // Obtenemos los parámetros de la sesión actual
    const songName = this.playData.get("song", "test");
    const difficulty = this.playData.get("difficulty", "normal").toLowerCase();

    // El JSON se carga en preload.js con la llave 'chart_[nombre_cancion]'
    const jsonKey = `chart_${songName}`;
    const rawData = this.scene.cache.json.get(jsonKey);

    if (!rawData) {
      console.error(
        `%c CHART %c Error: No se encontró el archivo notes.json para: ${songName}`,
        "background: #b71c1c; color: white;",
        "color: unset;",
      );
      this.notes = [];
      return;
    }

    /**
     * Estructura del Chart obtenida:
     * this.notes = [
     * { "t": 0, "d": 0, "l": 0, "p": "op" },
     * ...
     * ]
     */
    this.notes = rawData[difficulty] || [];

    // Ordenamos las notas por tiempo (t) por seguridad para el procesamiento secuencial
    this.notes.sort((a, b) => a.t - b.t);

    console.log(`%c CHART %c Cargada dificultad "${difficulty}" para "${songName}" (${this.notes.length} notas).`, 'background: #1a237e; color: white;', 'color: unset;');
  }

  /**
   * Retorna todas las notas de la dificultad actual.
   */
  getNotes() {
    return this.notes;
  }

  /**
   * Retorna solo las notas pertenecientes a un grupo específico ('op' o 'pl').
   */
  getNotesByPlayer(playerType) {
    return this.notes.filter((note) => note.p === playerType);
  }
}

window.Chart = Chart;
