/**
 * Genesis Engine - Panoramic Scaling System
 */
class Wide {
  constructor() {
    this.baseHeight = 720;
    this.baseWidth = 1280;
    this.currentWidth = 1280;

    // Variables para prevenir el bucle infinito y el DOM Thrashing
    this.lastDisplayWidth = 0;
    this.lastDisplayHeight = 0;
    this._isRefreshing = false;

    this.init();
  }

  init() {
    // Esperamos a que existan el juego, la escala y el elemento Canvas físico en el HTML
    if (!window.game || !window.game.scale || !window.game.canvas) {
      requestAnimationFrame(() => this.init());
      return;
    }

    // Escuchamos el resize del navegador (cuando el usuario estira la ventana)
    window.addEventListener("resize", () => this.refresh());

    this.refresh();
  }

  refresh() {
    // Si ya estamos calculando, o si el juego/canvas desaparecieron, abortamos (Seguro anti-bucles)
    if (!window.game || !window.game.scale || !window.game.canvas || this._isRefreshing) return;
    this._isRefreshing = true;

    const newWidth = this.calculatePanoramicWidth();

    // 1. RESOLUCIÓN INTERNA (Lógica)
    if (this.currentWidth !== newWidth) {
      this.currentWidth = newWidth;
      window.game.scale.setGameSize(newWidth, this.baseHeight);
      window.game.events.emit('canvasResized', newWidth, this.baseHeight);
    }

    // 2. TAMAÑO FÍSICO CSS (Pantalla Completa)
    const scaleX = window.innerWidth / newWidth;
    const scaleY = window.innerHeight / this.baseHeight;
    const zoom = Math.min(scaleX, scaleY);

    const displayWidth = Math.floor(newWidth * zoom);
    const displayHeight = Math.floor(this.baseHeight * zoom);

    // Solo actualizamos el CSS si el tamaño realmente cambió (Evita tirones)
    if (this.lastDisplayWidth !== displayWidth || this.lastDisplayHeight !== displayHeight) {
        this.lastDisplayWidth = displayWidth;
        this.lastDisplayHeight = displayHeight;
        
        // --- CORRECCIÓN: Modificamos el Canvas de HTML directamente ---
        window.game.canvas.style.width = displayWidth + "px";
        window.game.canvas.style.height = displayHeight + "px";
        
        window.game.scale.refresh(); // Actualiza los hitboxes internos y centra en pantalla
    }

    // Liberamos el cerrojo
    this._isRefreshing = false;
  }

  getCurrentWidth() {
      return this.currentWidth;
  }

  calculatePanoramicWidth() {
    if (window.innerHeight === 0) return this.baseWidth;

    const windowRatio = window.innerWidth / window.innerHeight;
    
    // Límites Anti-Deformación
    const minRatio = 9 / 16;  // Vertical (Celulares)
    const maxRatio = 21 / 9;  // Ultra-Wide (Monitores largos)

    const clampedRatio = Math.max(minRatio, Math.min(windowRatio, maxRatio));

    return Math.ceil(this.baseHeight * clampedRatio);
  }
}

window.wide = new Wide();