// src/funkin/play/Cameras.js

class Cameras {
  constructor(scene) {
    this.scene = scene;

    // Cámara principal: Mundo del juego (Personajes, Stage)
    this.game = this.scene.cameras.main;

    // Cámara secundaria: Interfaz (HUD, Notas, Barras)
    this.ui = this.scene.cameras.add(
      0,
      0,
      this.scene.scale.width,
      this.scene.scale.height,
    );

    // --- LÓGICA DE ZOOM (BOOPING) ---
    // Guardamos el zoom original al que siempre deben regresar
    this.baseGameZoom = 1.0;
    this.baseUIZoom = 1.0;

    // Cantidad de zoom que se sumará en cada boop (según pediste: +0.80)
    // Nota: Si notas que 0.80 es demasiado extremo, puedes bajarlo a algo como 0.08 o 0.15
    this.gameBopAmount = 0.03;
    this.uiBopAmount = 0.025;

    // Escuchamos los golpes del Conductor
    this.beatListener = (curBeat) => this.onBeatHit(curBeat);
    if (window.Conductor) {
      window.Conductor.events.on("beatHit", this.beatListener, this);
    }

    // Auto-limpieza al destruir la escena
    this.scene.events.once("shutdown", this.shutdown, this);
  }

  /**
   * Suscribe un objeto a una cámara específica.
   * @param {Phaser.GameObjects.GameObject} obj - El objeto a asignar.
   * @param {string} type - 'game' o 'ui'.
   */
  add(obj, type = "game") {
    if (!obj) return;

    if (type === "ui") {
      this.game.ignore(obj);
    } else {
      this.ui.ignore(obj);
    }
  }

  onBeatHit(curBeat) {
    // Ejecuta el boop cada 4 beats
    if (curBeat % 4 === 0) {
      this.game.zoom += this.gameBopAmount;
      this.ui.zoom += this.uiBopAmount;
    }
  }

  update(time, delta) {
    // Calculamos un factor suavizado basado en el delta time.
    // Mientras mayor sea el multiplicador (ej. 0.005), más rápido regresa a su estado base.
    const lerpFactor = Math.min(1, delta * 0.005);

    // Lerp suavizado para regresar progresivamente al zoom original
    this.game.zoom = Phaser.Math.Linear(
      this.game.zoom,
      this.baseGameZoom,
      lerpFactor,
    );
    this.ui.zoom = Phaser.Math.Linear(
      this.ui.zoom,
      this.baseUIZoom,
      lerpFactor,
    );
  }

  shutdown() {
    // Previene memory leaks (que el listener siga activo si cambias de canción)
    if (window.Conductor) {
      window.Conductor.events.off("beatHit", this.beatListener, this);
    }
  }
}

window.Cameras = Cameras;
