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
        let peerId = 'fnf-room-' + data.code;

        if (data.isHost) {
            this.renderer.setText(`SALA CREADA\n\nCÓDIGO:\n[ ${data.code} ]\n\nESPERANDO AL JUGADOR...`);
            this.peer = new Peer(peerId);
            this.peer.on('connection', (conn) => {
                this.conn = conn;
                this.setupConnection();
            });
        } else {
            this.renderer.setText(`CONECTANDO A:\n[ ${data.code} ]...`);
            this.peer = new Peer();
            this.peer.on('open', () => {
                this.conn = this.peer.connect(peerId);
                this.setupConnection();
            });
        }
    }

    setupConnection() {
        this.conn.on('open', () => {
            this.renderer.setText("¡JUGADOR ENCONTRADO!\nPREPARATE...");
            window.MultiplayerConnection = this.conn;

            this.conn.on('data', (data) => {
                // --- FIX: SISTEMA DE LATENCIA Y SINCRONIZACIÓN ---

                // 1. Calculo del Ping/Pong
                if (data.type === 'ping') {
                    this.conn.send({ type: 'pong', time: data.time });
                    return;
                }
                if (data.type === 'pong') {
                    window.NetworkLatency = (Date.now() - data.time) / 2;
                    return;
                }

                // 2. Sincronización oficial de Estado (Vida, Score, Tiempo)
                if (data.type === 'sync') {
                    // Sincronizar puntuación del oponente si la recibimos
                    if (data.stats && this.scene.scoreLogic) {
                        this.scene.scoreLogic.syncOpponentStats(data.stats);
                    }

                    // Sincronizar barra de Vida (Host Authority)
                    if (data.isHost && data.health !== undefined && window.Health) {
                        // Solo ajustamos si el desfase es notable, para evitar vibraciones en la barra
                        if (Math.abs(window.Health.health - data.health) > 0.03) {
                            window.Health.health = data.health;
                        }
                    }

                    // Sincronizar Tiempos de Música (Compensar desincronización)
                    if (data.isHost && data.songPos !== undefined && window.Conductor && !window.MultiplayerData.isHost) {
                        // Estimar en que tiempo está el host ahora (considerando lo que tardó el paquete)
                        let hostEstimatedTime = data.songPos + (window.NetworkLatency || 0);
                        let timeDiff = hostEstimatedTime - window.Conductor.songPosition;

                        // Si hay un desfase de más de 40ms, corregimos suavemente
                        if (Math.abs(timeDiff) > 40) {
                            window.NetworkHostTimeOffset = (window.NetworkHostTimeOffset || 0) * 0.8 + (timeDiff * 0.2);
                        }
                    }
                    return;
                }

                // Información estándar (Input Strumlines)
                this.scene.events.emit('receiveMultiplayerData', data);
            });

            this.conn.on('close', () => {
                console.log("[Multiplayer] Conexión perdida con el otro jugador.");
            });

            this.scene.time.delayedCall(2000, () => {
                this.renderer.setVisible(false);

                window.isMultiplayerWaiting = false;
                window.startCountdown = true;

                if (this.scene.referee && this.scene.referee.countdown) {
                    this.scene.referee.countdown.startManual();
                }

                this.scene.events.emit('startMultiplayerCountdown');

                // --- FIX: INICIAR BUCLE DE SINCRONIZACIÓN AUTOMÁTICO ---
                this.syncEvent = this.scene.time.addEvent({
                    delay: 200, // Enviar paquete cada 200ms
                    loop: true,
                    callback: () => {
                        if (!this.conn || !this.conn.open) return;

                        // Pedir Ping para medir la latencia
                        this.conn.send({ type: 'ping', time: Date.now() });

                        // Enviar nuestra data oficial al oponente
                        let syncData = {
                            type: 'sync',
                            isHost: window.MultiplayerData.isHost,
                            stats: this.scene.scoreLogic ? this.scene.scoreLogic.statsP1 : null,
                            health: window.Health ? window.Health.health : 1,
                            songPos: window.Conductor ? window.Conductor.songPosition : 0
                        };
                        this.conn.send(syncData);
                    }
                });
            });
        });

        this.conn.on('error', (err) => {
            this.renderer.setText(`ERROR DE CONEXIÓN.\n\nPRESIONA ESCAPE.`);
        });

        this.sendListener = (data) => {
            if (this.conn && this.conn.open) {
                this.conn.send(data);
            }
        };
        this.scene.events.on('sendMultiplayerData', this.sendListener);
    }

    update(time, delta) {}

    shutdown() {
        if (this.syncEvent) {
            this.syncEvent.destroy();
        }
        if (this.sendListener) {
            this.scene.events.off('sendMultiplayerData', this.sendListener);
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
