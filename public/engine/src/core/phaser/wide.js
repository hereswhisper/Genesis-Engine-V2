/**
 * Genesis Engine - Panoramic Scaling System
 */
class Wide {
  constructor() {
    this.baseHeight = 720;
    this.baseWidth = 1280; // 16:9 Base
    this.currentWidth = 1280;

    // Variables para prevenir el bucle infinito
    this._isRefreshing = false;

    this.init();
  }

  init() {
    // Esperamos a que existan el juego, la escala y el elemento Canvas
    if (!window.game || !window.game.scale || !window.game.canvas) {
      requestAnimationFrame(() => this.init());
      return;
    }

    // 1. PROPIEDADES NATIVAS DE PHASER
    // Forzamos a Phaser a usar su lógica nativa de Scale FIT y centrado automático.
    window.game.scale.scaleMode = Phaser.Scale.FIT;
    window.game.scale.autoCenter = Phaser.Scale.CENTER_BOTH;

    // Escuchamos el resize nativo del navegador
    window.addEventListener("resize", () => this.refresh());

    this.refresh();
  }

  refresh() {
    if (!window.game || !window.game.scale || this._isRefreshing) return;
    this._isRefreshing = true;

    const newWidth = this.calculatePanoramicWidth();

    // 2. ACTUALIZACIÓN DE RESOLUCIÓN INTERNA
    if (this.currentWidth !== newWidth) {
      this.currentWidth = newWidth;
      
      // Ajustamos el "Game Size" lógico internamente.
      window.game.scale.setGameSize(newWidth, this.baseHeight);
      window.game.events.emit('canvasResized', newWidth, this.baseHeight);
    }

    // 3. REFRESCAR Y CENTRAR NATIVAMENTE
    // Le decimos a Phaser que recalcule sus parámetros visuales...
    window.game.scale.refresh();
    
    // LA SOLUCIÓN AL PROBLEMA: Forzamos matemáticamente a Phaser a que aplique
    // su centrado interno de inmediato para evitar que se quede pegado a la izquierda.
    window.game.scale.updateCenter();

    // Liberamos el cerrojo
    this._isRefreshing = false;
  }

  getCurrentWidth() {
      return this.currentWidth;
  }

  calculatePanoramicWidth() {
    if (window.innerHeight === 0) return this.baseWidth;

    const windowRatio = window.innerWidth / window.innerHeight;
    
    // Bloqueamos el escalado puramente a la horizontal (720p base a Ultrawide)
    const minRatio = 16 / 9;  // 1.77 (1280x720) - Límite mínimo
    const maxRatio = 21 / 9;  // 2.33 (1680x720 aprox) - Límite máximo (Ultrawide)

    // Clampeamos el ratio para que nunca baje de 16:9 ni suba de 21:9
    const clampedRatio = Math.max(minRatio, Math.min(windowRatio, maxRatio));

    return Math.ceil(this.baseHeight * clampedRatio);
  }
}

window.wide = new Wide();