/**
 * Genesis Engine - Panoramic Scaling System
 */
class Wide {
  constructor() {
    this.baseHeight = 720;
    this.baseWidth = 1280;
    this.currentWidth = 1280; // Guardamos el ancho actual internamente

    // Iniciamos la escucha de la instancia del juego
    this.init();
  }

  /**
   * Espera a que la instancia global de Phaser esté lista para configurar el listener de resize.
   * Uses JSDoc for technical documentation.
   */
  init() {
    if (!window.game || !window.game.scale) {
      requestAnimationFrame(() => this.init());
      return;
    }

    // Listener para actualizaciones en tiempo real en la ventana
    window.addEventListener("resize", () => this.refresh());

    // Aplicamos el tamaño inicial una vez detectado el motor
    this.refresh();
  }

  /**
   * Recalcula el ancho y actualiza el tamaño interno del juego en Phaser.
   */
  refresh() {
    if (!window.game || !window.game.scale) return;

    const newWidth = this.calculatePanoramicWidth();

    // Actualizamos la variable interna
    this.currentWidth = newWidth;

    // setGameSize cambia la resolución interna sin romper la proporción FIT.
    // Esto se aplica de inmediato al canvas de Phaser, afectando en tiempo real
    // a la escena actual y siendo heredado por cualquier escena activada posteriormente.
    window.game.scale.setGameSize(newWidth, this.baseHeight);

    // Opcional: Emitimos un evento global por si alguna UI activa necesita re-calcular sus posiciones
    window.game.events.emit('canvasResized', newWidth, this.baseHeight);
  }

  /**
   * Retorna el ancho panorámico actual del canvas.
   * Útil para posicionar elementos de UI responsivamente en las escenas.
   * @returns {number} El ancho calculado actual.
   */
  getCurrentWidth() {
      return this.currentWidth;
  }

  /**
   * Calculates the ideal panoramic width based on the current window aspect ratio.
   * @returns {number} The calculated width for the game.
   */
  calculatePanoramicWidth() {
    const isMobile = window.isReactNative || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const windowRatio = window.innerWidth / window.innerHeight;
    const baseRatio = this.baseWidth / this.baseHeight; // 16:9

    if (windowRatio > baseRatio) {
      if (isMobile) {
        // En móviles aprovechamos todo el ancho disponible
        return Math.ceil(this.baseHeight * windowRatio);
      } else {
        // En PC limitamos el aspecto Ultra-Wide para evitar distorsiones extremas
        const maxAspectRatio = 20 / 9;
        const clampedRatio = Math.min(windowRatio, maxAspectRatio);
        return Math.ceil(this.baseHeight * clampedRatio);
      }
    }

    return this.baseWidth;
  }
}

window.wide = new Wide();
