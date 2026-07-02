// src/funkin/play/UI/multi/logic.js
class MultiLogic {
  constructor(scene) {
    this.scene = scene;
    this.renderer = new window.MultiRenderer(scene);
    this.peer = null;
    this.conn = null;
    this.sendListener = null;
    this.syncEvent = null;

    if (window.MultiplayerData && window.MultiplayerData.active) {
      if (this.scene.referee && this.scene.referee.countdown) {
        this.scene.referee.countdown.allowCountdown = false;
      }
      window.isMultiplayerWaiting = true;

      this.startMultiplayer();
    }
  }

  startMultiplayer() {
    this.renderer.setVisible(true);

    let data = window.MultiplayerData;
    let peerId = "fnf-room-" + data.code;

    if (data.isHost) {
      this.renderer.setText(
        `SALA CREADA\n\nCÓDIGO:\n[ ${data.code} ]\n\nESPERANDO AL JUGADOR...`,
      );
      this.peer = new Peer(peerId);
      this.peer.on("connection", (conn) => {
        this.conn = conn;
        this.setupConnection();
      });
    } else {
      this.renderer.setText(`CONECTANDO A:\n[ ${data.code} ]...`);
      this.peer = new Peer();
      this.peer.on("open", () => {
        this.conn = this.peer.connect(peerId);
        this.setupConnection();
      });
    }
  }

  setupConnection() {
    this.conn.on("open", () => {
      this.renderer.setText("¡JUGADOR ENCONTRADO!\nCALIBRANDO CONEXIÓN...");
      window.MultiplayerConnection = this.conn;

      this.syncData = { pings: [] };

      if (window.MultiplayerData.isHost) {
        // El Host inicia el algoritmo de calibración tras una breve pausa de estabilización
        setTimeout(() => {
          this.sendPing();
        }, 250);
      }

      this.conn.on("data", (data) => {
        // --- FASE 1: CALIBRACIÓN NTP PREVIA ---
        if (data.type === "ping") {
          this.conn.send({ type: "pong", t0: data.t0, t1: Date.now() });
          return;
        }

        if (data.type === "pong") {
          let t3 = Date.now();
          let rtt = t3 - data.t0; // Tiempo de ida y vuelta
          let latency = rtt / 2;
          // Cálculo de Offset: Diferencia matemática entre el reloj del Host y el Cliente
          let offset = data.t1 - (data.t0 + latency);
          let originalOffset = data.t1 - data.t0;

          this.syncData.pings.push({ latency, offset, originalOffset });

          // Enviamos 10 pings para calcular una mediana estable y descartar lagazos aislados
          if (this.syncData.pings.length < 10) {
            setTimeout(() => this.sendPing(), 50);
          } else {
            this.calculateSync();
          }
          return;
        }

        if (data.type === "prepare_start") {
          // FASE 2: PREPARACIÓN EXACTA PARA EL ARRANQUE (Cliente recibe orden)
          window.NetworkLatency = data.latency;
          window.NetworkClockOffset = data.clientClockOffset;

          this.printNetworkTable(data.medianData, window.NetworkClockOffset);
          this.renderer.setText("¡CONEXIÓN ESTABLECIDA!\nPREPÁRATE...");

          // Calcular la diferencia local contra el Timestamp global del Host
          let localStartTime = data.startTime - window.NetworkClockOffset;
          let timeToWait = localStartTime - Date.now();

          if (timeToWait < 0) timeToWait = 0;

          // El cliente arranca en el milisegundo exacto calculado
          this.scene.time.delayedCall(timeToWait, () => {
            this.startActualGame();
          });
          return;
        }

        // --- FASE 3: JUEGO EN CURSO ---
        if (data.type === "sync") {
          // Sincronizar puntuación
          if (data.stats && this.scene.scoreLogic) {
            this.scene.scoreLogic.syncOpponentStats(data.stats);
          }

          // Sincronizar barra de Vida (Autoridad del Host) con suavizado ligero
          if (data.isHost && data.health !== undefined && window.Health) {
            if (Math.abs(window.Health.health - data.health) > 0.05) {
              window.Health.health =
                window.Health.health * 0.9 + data.health * 0.1;
            }
          }

          // NOTA: Se eliminó la forzada sobre window.Conductor.songPosition.
          // Al iniciar exactamente al mismo tiempo, el reproductor de audio local es ahora la autoridad fluida, evitando teletransportes de notas.
          return;
        }

        // Información estándar (Inputs de flechas del oponente)
        this.scene.events.emit("receiveMultiplayerData", data);
      });

      this.conn.on("close", () => {
        console.log("[Multiplayer] Conexión perdida con el otro jugador.");
      });

      this.conn.on("error", (err) => {
        this.renderer.setText(`ERROR DE CONEXIÓN.\n\nPRESIONA ESCAPE.`);
      });
    });

    this.sendListener = (data) => {
      if (this.conn && this.conn.open) {
        this.conn.send(data);
      }
    };
    this.scene.events.on("sendMultiplayerData", this.sendListener);
  }

  sendPing() {
    this.conn.send({ type: "ping", t0: Date.now() });
  }

  calculateSync() {
    // Ordenamos las pruebas por latencia y tomamos la mediana para ignorar tirones de red
    this.syncData.pings.sort((a, b) => a.latency - b.latency);
    let medianData =
      this.syncData.pings[Math.floor(this.syncData.pings.length / 2)];

    window.NetworkLatency = medianData.latency;
    window.NetworkClockOffset = 0; // Para el host es 0

    // Invertimos el offset para que el Cliente se ajuste al Host
    let clientClockOffset = -medianData.offset;

    this.printNetworkTable(medianData, clientClockOffset);
    this.renderer.setText("¡CONEXIÓN ESTABLECIDA!\nPREPÁRATE...");

    // Programar el inicio simultáneo exacto (3 segundos en el futuro)
    let startDelay = 3000;
    let hostStartTime = Date.now() + startDelay;

    this.conn.send({
      type: "prepare_start",
      startTime: hostStartTime,
      clientClockOffset: clientClockOffset,
      latency: window.NetworkLatency,
      medianData: medianData,
    });

    // El Host arranca basándose en su propio cronómetro
    this.scene.time.delayedCall(startDelay, () => {
      this.startActualGame();
    });
  }

  printNetworkTable(medianData, clientClockOffset) {
    let isHost = window.MultiplayerData.isHost;
    let originalOffset = medianData.originalOffset || 0;

    console.groupCollapsed(
      "%c[MULTIJUGADOR] Detalles de Conexión (Calibración de Ping)",
      "background: #222; color: #bada55; font-size: 14px;",
    );
    console.table({
      "Jugador Local": isHost ? "Host" : "Cliente",
      "Jugador Enemigo": isHost ? "Cliente" : "Host",
      "Ping (Latencia)": `${window.NetworkLatency.toFixed(2)} ms`,
      "Desfase (Offset Clock)": `${medianData.offset.toFixed(2)} ms`,
      "Tiempo de Red Original": `${originalOffset.toFixed(2)} ms`,
      "Tiempo Compensado (Calibrado)": `${clientClockOffset.toFixed(2)} ms`,
    });
    console.groupEnd();
  }

  startActualGame() {
    this.renderer.setVisible(false);

    window.isMultiplayerWaiting = false;
    window.startCountdown = true;

    if (this.scene.referee && this.scene.referee.countdown) {
      this.scene.referee.countdown.startManual();
    }

    this.scene.events.emit("startMultiplayerCountdown");

    // Bucle de sincronización de estadísticas
    this.syncEvent = this.scene.time.addEvent({
      delay: 150,
      loop: true,
      callback: () => {
        if (!this.conn || !this.conn.open) return;

        let syncData = {
          type: "sync",
          isHost: window.MultiplayerData.isHost,
          stats: this.scene.scoreLogic ? this.scene.scoreLogic.statsP1 : null,
          health: window.Health ? window.Health.health : 1,
        };
        this.conn.send(syncData);
      },
    });
  }

  update(time, delta) {}

  shutdown() {
    if (this.syncEvent) {
      this.syncEvent.destroy();
    }
    if (this.sendListener) {
      this.scene.events.off("sendMultiplayerData", this.sendListener);
    }
    if (this.conn) {
      this.conn.close();
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
window.MultiLogic = MultiLogic;
