// src/funkin/play/UI/arrows/directions.js

class Directions {
  /**
   * Genera un mapa de direcciones basado en las animaciones de la skin.
   * @param {Object} animationsObj - Objeto 'gameplay.strumline.animations' del JSON.
   * @returns {Object} Mapa { 'left': 0, 'down': 1, ... }
   */
  static getMap(animationsObj) {
    const map = {};
    if (!animationsObj) return map;

    // Asignamos números secuenciales según el orden en el JSON
    Object.keys(animationsObj).forEach((key, index) => {
      map[key] = index;
    });
    return map;
  }
}

window.Directions = Directions;
