// src/funkin/play/UI/pause/PauseAudioFilter.js

class PauseAudioFilter {
  constructor(soundManager, musicTrack) {
    this.soundManager = soundManager;
    this.musicTrack = musicTrack;
    this.nodes = [];
    this.isEnabled = false;

    this.setupFilters();
  }

  setupFilters() {
    // Verificamos que el contexto de audio web esté disponible en Phaser
    if (!this.soundManager.context) return;
    const ctx = this.soundManager.context;

    // En Phaser 3, el nodo de salida real de un WebAudioSound es volumeNode (o muteNode).
    this.targetNode = this.musicTrack.volumeNode || this.musicTrack.muteNode;
    
    if (!this.targetNode) {
        console.warn("[PauseAudioFilter] No se pudo encontrar el nodo de salida de Phaser.");
        return;
    }

    // 1. Filtro High-pass (Corta frecuencias bajas)
    this.highpass = ctx.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.value = 700; 
    this.highpass.Q.value = 1.0; 

    // 2. Filtro Low-pass (Corta frecuencias altas)
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 10000; 

    // Obtener el nodo de destino maestro del juego
    this.destinationNode = this.soundManager.masterMuteNode || this.soundManager.masterVolumeNode || ctx.destination;

    // Guardar referencias para la habilitación/deshabilitación dinámica
    this.nodes = [this.highpass, this.lowpass];
  }

  enable() {
    if (this.isEnabled || !this.targetNode || !this.destinationNode) return;

    // Desconectar el sonido de su destino original
    this.targetNode.disconnect();
    
    // Crear la cadena de ecualización: Nodo Phaser -> Highpass -> Lowpass -> Salida Final
    this.targetNode.connect(this.highpass);
    this.highpass.connect(this.lowpass);
    this.lowpass.connect(this.destinationNode);

    this.isEnabled = true;
  }

  disable() {
    if (!this.isEnabled || !this.targetNode || !this.destinationNode) return;

    // Desconectar los filtros
    this.targetNode.disconnect();
    this.highpass.disconnect();
    this.lowpass.disconnect();

    // Restaurar la conexión directa y normal de Phaser
    this.targetNode.connect(this.destinationNode);

    this.isEnabled = false;
  }

  disconnect() {
    // Limpieza de memoria y desconexión segura al salir de la pausa
    this.disable();
    if (this.nodes.length > 0) {
      this.nodes = [];
    }
    this.targetNode = null;
    this.destinationNode = null;
  }
}

window.PauseAudioFilter = PauseAudioFilter;