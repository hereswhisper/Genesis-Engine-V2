// src/utils/network/network.js

/**
 * Genesis Engine - Network Manager (Multiplayer)
 * Utiliza PeerJS por debajo para gestionar conexiones WebRTC P2P (Peer-to-Peer).
 */
class NetworkManager {
  constructor() {
    this.peer = null;
    this.connection = null; // Conexión activa (solo 1v1 para FNF)
    this.isHost = false;
    this.peerId = null;

    // Sistema de eventos propio para no depender de una escena de Phaser específica
    this.listeners = {
      ready: [], // Cuando el Host se crea exitosamente y espera jugadores
      connected: [], // Cuando dos jugadores se conectan entre sí
      data: [], // Cuando se reciben datos (teclas, notas, sync, etc)
      disconnected: [], // Cuando el rival o el host se desconecta
      error: [], // Errores de red
    };
  }

  /**
   * Genera un ID alfanumérico corto (ej: "A7X9B").
   * Es más amigable para que los jugadores se lo compartan.
   */
  generateShortId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Inicia un servidor (Host).
   * @param {string} customId - (Opcional) ID personalizado. Si no se pasa, genera uno corto.
   */
  host(customId = null) {
    this.disconnect(); // Limpiar cualquier rastro de conexión previa
    this.isHost = true;
    this.peerId = customId || this.generateShortId();

    // Inicializa el Peer
    this.peer = new Peer(this.peerId);

    this.peer.on("open", (id) => {
      console.log(
        `[Network] Servidor alojado. Esperando rivales en el ID: ${id}`,
      );
      this._emit("ready", id);
    });

    // Cuando alguien intenta unirse a nuestro host
    this.peer.on("connection", (conn) => {
      if (this.connection && this.connection.open) {
        console.warn(
          "[Network] Alguien intentó unirse, pero la sala ya está llena (1v1).",
        );
        conn.close();
        return;
      }

      this.connection = conn;
      this._setupConnectionEvents();
    });

    this.peer.on("error", (err) => {
      console.error("[Network] Error en el Host:", err);
      this._emit("error", err);
    });
  }

  /**
   * Se une a un servidor existente (Client).
   * @param {string} hostId - El ID del servidor al que queremos conectarnos.
   */
  join(hostId) {
    if (!hostId) {
      console.error("[Network] Debes proporcionar un ID para unirte.");
      return;
    }

    this.disconnect();
    this.isHost = false;

    // El cliente no necesita un ID específico, PeerJS le asigna un UUID temporal
    this.peer = new Peer();

    this.peer.on("open", () => {
      console.log(`[Network] Intentando conectar con el Host: ${hostId}...`);
      // Iniciamos la conexión hacia el Host.
      // reliable: true asegura que no se pierdan paquetes (útil para eventos precisos).
      this.connection = this.peer.connect(hostId, { reliable: true });
      this._setupConnectionEvents();
    });

    this.peer.on("error", (err) => {
      console.error("[Network] Error al intentar unirse:", err);
      this._emit("error", err);
    });
  }

  /**
   * Configura los eventos internos una vez que 'this.connection' existe.
   * Sirve tanto para el Host como para el Cliente.
   */
  _setupConnectionEvents() {
    if (!this.connection) return;

    this.connection.on("open", () => {
      console.log("[Network] ¡Conexión P2P establecida con éxito!");
      this._emit("connected", this.connection.peer);
    });

    this.connection.on("data", (data) => {
      // Aquí entra todo lo que mande el otro jugador (JSON, strings, etc)
      this._emit("data", data);
    });

    this.connection.on("close", () => {
      console.log("[Network] La conexión se ha cerrado.");
      this.connection = null;
      this._emit("disconnected");
    });

    this.connection.on("error", (err) => {
      console.error("[Network] Error en la conexión:", err);
      this._emit("error", err);
    });
  }

  /**
   * Envía datos al jugador conectado.
   * @param {any} data - Puede ser un String, Object, Array, etc.
   */
  send(data) {
    if (this.connection && this.connection.open) {
      this.connection.send(data);
    } else {
      console.warn(
        "[Network] No se puede enviar datos, no hay una conexión abierta.",
      );
    }
  }

  /**
   * Cierra todas las conexiones, destruye el Peer y limpia el estado.
   */
  disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.isHost = false;
    this.peerId = null;
    console.log("[Network] Desconectado y limpiado.");
  }

  // ==========================================
  // SISTEMA DE EVENTOS (Custom Event Emitter)
  // ==========================================

  /**
   * Suscribe un callback a un evento de red.
   * Eventos disponibles: 'ready', 'connected', 'data', 'disconnected', 'error'
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Elimina un callback suscrito previamente.
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback,
      );
    }
  }

  /**
   * Dispara un evento interno.
   */
  _emit(event, payload) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(payload));
    }
  }
}

// Inicializar y exponer globalmente al motor
window.Network = new NetworkManager();
