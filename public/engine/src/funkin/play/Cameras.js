// src/funkin/play/Cameras.js
class Cameras {
  constructor(scene) {
    this.scene = scene;
    
    this.game = this.scene.cameras.main;
    this.ui = this.scene.cameras.add(0, 0, this.scene.scale.width, this.scene.scale.height);

    this.baseGameZoom = 1.0;
    this.baseUIZoom = 1.0;
    this.gameBopAmount = 0.03;
    this.uiBopAmount = 0.025;

    // --- FREECAM LOGIC ---
    this.freecam = false;
    this.freecamX = this.game.scrollX;
    this.freecamY = this.game.scrollY;
    this.freecamZoom = this.baseGameZoom;
    this.freecamSpeed = 15;
    
    this.keys = this.scene.input.keyboard.addKeys('W,A,S,D,Q,E');
    this.isDragging = false;

    // --- CONSOLA ESTILO MINECRAFT ---
    window.gameCameras = this;
    
    // Función Global para la consola F12
    window.freecam = (enable = true) => {
        if (window.gameCameras) window.gameCameras.enableFreecam(enable);
    };

    this.createCommandConsole();

    // Eventos de Mouse (Drag)
    this.scene.input.on('pointerdown', () => { if (this.freecam) this.isDragging = true; });
    this.scene.input.on('pointerup', () => { this.isDragging = false; });
    this.scene.input.on('pointermove', (pointer) => {
        if (this.freecam && this.isDragging) {
            this.freecamX -= (pointer.position.x - pointer.prevPosition.x) / this.freecamZoom;
            this.freecamY -= (pointer.position.y - pointer.prevPosition.y) / this.freecamZoom;
        }
    });

    // Eventos de Mouse (Wheel para Zoom)
    this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
        if (this.freecam) {
            const zoomSpeed = 0.05;
            if (deltaY > 0) this.freecamZoom = Math.max(0.1, this.freecamZoom - zoomSpeed);
            if (deltaY < 0) this.freecamZoom += zoomSpeed;
        }
    });

    this.beatListener = (curBeat) => this.onBeatHit(curBeat);
    if (window.Conductor) {
      window.Conductor.events.on("beatHit", this.beatListener, this);
    }

    this.scene.events.once("shutdown", this.shutdown, this);
  }

  createCommandConsole() {
    if (document.getElementById("mc-console")) return;

    const consoleDiv = document.createElement("div");
    consoleDiv.id = "mc-console";
    consoleDiv.style.cssText = "position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(0,0,0,0.8); padding: 10px; display: none; z-index: 999999; box-sizing: border-box;";
    
    const input = document.createElement("input");
    input.type = "text";
    input.style.cssText = "width: 100%; background: transparent; border: none; color: white; font-family: monospace; font-size: 16px; outline: none;";
    consoleDiv.appendChild(input);
    document.body.appendChild(consoleDiv);

    // FIX: Detener la propagación para que Phaser no robe las teclas mientras escribimos
    const stopPhaserCapture = (e) => {
        e.stopPropagation();
    };
    input.addEventListener('keydown', stopPhaserCapture);
    input.addEventListener('keyup', stopPhaserCapture);
    input.addEventListener('keypress', stopPhaserCapture);

    // Manejar Enter y Escape directamente en el input
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            consoleDiv.style.display = "none";
            window.focus(); 
        } else if (e.key === 'Enter') {
            const cmd = input.value.trim();
            consoleDiv.style.display = "none";
            window.focus();

            if (cmd === "/camera game free true") this.enableFreecam(true);
            else if (cmd === "/camera game free false") this.enableFreecam(false);
        }
    });

    const onKeyDownGlobal = (e) => {
        // Evita abrir la consola si el usuario ya está tecleando en otro sitio
        if (e.target.tagName === 'INPUT') return;

        if (e.key === '/' && consoleDiv.style.display === "none") {
            e.preventDefault();
            consoleDiv.style.display = "block";
            input.value = "/";
            // Un pequeño timeout asegura que el input reciba el foco correctamente tras mostrarse
            setTimeout(() => input.focus(), 10);
        }
    };

    window.addEventListener('keydown', onKeyDownGlobal);
    this.consoleListener = onKeyDownGlobal;
  }

  enableFreecam(enable) {
      this.freecam = enable;
      if (enable) {
          this.freecamX = this.game.scrollX;
          this.freecamY = this.game.scrollY;
          this.freecamZoom = this.baseGameZoom;
          console.log("%c[CAMERAS]%c Cámara Libre (Freecam) ACTIVADA", "color: yellow", "color: white");
      } else {
          console.log("%c[CAMERAS]%c Cámara Libre (Freecam) DESACTIVADA", "color: yellow", "color: white");
      }
  }

  add(obj, type = "game") {
    if (!obj) return;
    if (type === "ui") {
      this.game.ignore(obj);
    } else {
      this.ui.ignore(obj);
    }
  }

  onBeatHit(curBeat) {
    if (curBeat % 4 === 0) {
      // El boop se suma directamente a la cámara actual
      this.game.zoom += this.gameBopAmount;
      this.ui.zoom += this.uiBopAmount;
    }
  }

  update(time, delta) {
    const lerpFactor = Math.min(1, delta * 0.005);

    if (this.freecam) {
        if (this.keys.W.isDown) this.freecamY -= this.freecamSpeed / this.freecamZoom;
        if (this.keys.S.isDown) this.freecamY += this.freecamSpeed / this.freecamZoom;
        if (this.keys.A.isDown) this.freecamX -= this.freecamSpeed / this.freecamZoom;
        if (this.keys.D.isDown) this.freecamX += this.freecamSpeed / this.freecamZoom;

        const zoomSpeed = 0.02;
        if (this.keys.Q.isDown) this.freecamZoom = Math.max(0.1, this.freecamZoom - zoomSpeed);
        if (this.keys.E.isDown) this.freecamZoom += zoomSpeed;

        this.game.scrollX = Phaser.Math.Linear(this.game.scrollX, this.freecamX, lerpFactor);
        this.game.scrollY = Phaser.Math.Linear(this.game.scrollY, this.freecamY, lerpFactor);
        
        // Sumamos el TargetZoom libre + el efecto Boop residual suavizado
        this.game.zoom = Phaser.Math.Linear(this.game.zoom, this.freecamZoom, lerpFactor);
    } else {
        // Regreso al zoom normal + efecto Boop residual suavizado
        this.game.zoom = Phaser.Math.Linear(this.game.zoom, this.baseGameZoom, lerpFactor);
    }

    this.ui.zoom = Phaser.Math.Linear(this.ui.zoom, this.baseUIZoom, lerpFactor);
  }

  shutdown() {
    if (window.Conductor) {
      window.Conductor.events.off("beatHit", this.beatListener, this);
    }
    
    if (this.consoleListener) {
        window.removeEventListener('keydown', this.consoleListener);
    }
    
    window.gameCameras = null;
    window.freecam = null;
  }
}

window.Cameras = Cameras;