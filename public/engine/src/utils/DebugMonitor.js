// src/core/phaser/DebugMonitor.js

class DebugMonitor {
    static init() {
        // Esperamos inteligentemente a que el HUD exista y esté activo (vital para HMR)
        if (!window.HUD || typeof window.Controls === 'undefined' || !window.HUD.sys || !window.HUD.sys.isActive()) {
            requestAnimationFrame(() => DebugMonitor.init());
            return;
        }

        DebugMonitor.scene = window.HUD;

        // Variables de estado: Solo se declaran UNA VEZ aunque el HMR recargue el archivo.
        if (DebugMonitor.mode === undefined) {
            DebugMonitor.mode = 0; // 0: Oculto, 1: Minimalista, 2: Arquitecto
            DebugMonitor.fpsHistory = [];

            // Evento GLOBAL de ventana, protegido para no duplicarse con múltiples HMR
            window.addEventListener('keydown', (e) => {
                if (window.Controls && window.Controls.DEBUGG(e)) {
                    DebugMonitor.toggleMode();
                }
            });
        }

        const textStyle = {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', 
            padding: { x: 8, y: 8 }
        };

        // Recreamos los textos en la nueva escena inyectada por el HMR
        DebugMonitor.leftText = DebugMonitor.scene.add.text(10, 10, '', textStyle)
            .setScrollFactor(0)
            .setDepth(999999)
            .setVisible(DebugMonitor.mode === 1 || DebugMonitor.mode === 2);

        DebugMonitor.rightText = DebugMonitor.scene.add.text(DebugMonitor.scene.scale.width - 10, 10, '', {
            ...textStyle,
            align: 'right'
        })
            .setOrigin(1, 0)
            .setScrollFactor(0)
            .setDepth(999999)
            .setVisible(DebugMonitor.mode === 2);

        // Limpiar el actualizador anterior para evitar llamadas fantasma del motor
        if (DebugMonitor.updateListener) {
            DebugMonitor.updateListener.destroy();
        }
        DebugMonitor.updateListener = DebugMonitor.scene.events.on('update', DebugMonitor.update, DebugMonitor);

        // --- MAGIA HMR ---
        DebugMonitor.scene.events.once('shutdown', () => {
            requestAnimationFrame(() => DebugMonitor.init());
        });

        console.log(`%c DEBUG MONITOR %c Injected to HUD (Network & PlayState conditional).`, 'background: #00bcd4; color: white;', 'color: unset;');
    }

    static toggleMode() {
        DebugMonitor.mode = (DebugMonitor.mode + 1) % 3;

        if (!DebugMonitor.leftText || !DebugMonitor.leftText.active) return;

        if (DebugMonitor.mode === 0) {
            DebugMonitor.leftText.setVisible(false);
            DebugMonitor.rightText.setVisible(false);
        } else if (DebugMonitor.mode === 1) {
            DebugMonitor.leftText.setVisible(true);
            DebugMonitor.rightText.setVisible(false);
        } else if (DebugMonitor.mode === 2) {
            DebugMonitor.leftText.setVisible(true);
            DebugMonitor.rightText.setVisible(true);
        }
    }

    static getAudioTime() {
        if (window.GlobalMusic && window.GlobalMusic.isPlaying) {
            return (window.GlobalMusic.seek * 1000).toFixed(0);
        }
        if (DebugMonitor.scene && DebugMonitor.scene.sound) {
            const sounds = DebugMonitor.scene.sound.getAllPlaying();
            if (sounds.length > 0) {
                const mainTrack = sounds.reduce((prev, current) =>
                    (prev.duration > current.duration) ? prev : current
                );
                return (mainTrack.seek * 1000).toFixed(0);
            }
        }
        return '0';
    }

    // 🌐 Obtener estado de la Red (Ping y Tipo de Conexión) en Inglés
    static getNetworkInfo() {
        let connectionType = 'Unknown';
        let ping = 'N/A';

        if (navigator.connection) {
            // Determinar si es WiFi o Datos Móviles
            if (navigator.connection.type) {
                switch(navigator.connection.type) {
                    case 'wifi': connectionType = 'Wi-Fi'; break;
                    case 'cellular': connectionType = 'Cellular'; break;
                    case 'none': connectionType = 'Offline'; break;
                    case 'ethernet': connectionType = 'Ethernet'; break;
                    default: connectionType = navigator.connection.type;
                }
            } else if (navigator.connection.effectiveType) {
                connectionType = navigator.connection.effectiveType.toUpperCase();
            }

            // Obtener Latencia estimada
            if (navigator.connection.rtt !== undefined) {
                ping = `${navigator.connection.rtt}ms`;
            }
        }

        return { type: connectionType, ping: ping };
    }

    static update(time, delta) {
        if (DebugMonitor.mode === 0) return;
        if (!DebugMonitor.leftText || !DebugMonitor.leftText.active) return;

        const game = DebugMonitor.scene.sys.game;

        // --- CÁLCULOS BASE ---
        let fps = game.loop.actualFps;
        DebugMonitor.fpsHistory.push(fps);
        if (DebugMonitor.fpsHistory.length > 60) DebugMonitor.fpsHistory.shift();

        let sortedFps = [...DebugMonitor.fpsHistory].sort((a, b) => a - b);
        let low1Percent = sortedFps[Math.floor(sortedFps.length * 0.01)] || fps;

        let memoryStr = 'N/A';
        if (performance.memory) {
            let used = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
            let limit = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(1);
            memoryStr = `${used}MB / ${limit}MB`;
        }

        let network = DebugMonitor.getNetworkInfo();

        // --- MODO 1: MINIMALISTA ---
        if (DebugMonitor.mode === 1) {
            DebugMonitor.leftText.setText(
                `FPS: ${Math.round(fps)} / Low: ${Math.round(low1Percent)}\n` +
                `MS (Delta): ${delta.toFixed(2)}ms\n` +
                `Network: ${network.type} | Ping: ${network.ping}`
            );
            return;
        }

        // --- MODO 2: ARQUITECTO ---
        let drawCalls = game.renderer && game.renderer.drawCount ? game.renderer.drawCount : 0;
        let texturesCount = Object.keys(game.textures.list).length;

        let condTime = window.Conductor ? window.Conductor.songPosition.toFixed(0) : '0';
        let audioTime = DebugMonitor.getAudioTime();
        let bpm = window.Conductor ? window.Conductor.bpm : 0;
        let beat = window.Conductor ? window.Conductor.currentBeat : 0;
        let step = window.Conductor ? window.Conductor.currentStep : 0;

        DebugMonitor.leftText.setText(
            `FPS: ${Math.round(fps)} / Low: ${Math.round(low1Percent)}\n` +
            `MS (Delta Time): ${delta.toFixed(2)}ms\n` +
            `Memory (JS Heap): ${memoryStr}\n` +
            `VRAM / Textures: ${texturesCount} tex\n` +
            `Draw Calls: ${drawCalls}\n\n` +
            `───SYNC───\n` +
            `Audio vs Conductor: ${audioTime}ms / ${condTime}ms\n` +
            `BPM: ${bpm}\n` +
            `Beat: ${beat} | Step: ${step}\n` +
            `Input Latency: ~${delta.toFixed(1)}ms`
        );

        let activeScenesArray = game.scene.getScenes(true).map(s => s.scene.key);
        let activeScenes = activeScenesArray.join(', ');
        let environment = window.Neutralino ? 'Desktop (NeutralinoJS)' : 'Web';

        let activeEntities = 0;
        game.scene.getScenes(true).forEach(s => activeEntities += s.children.list.length);

        // Texto derecho base con separadores limpios
        let rightPanelText = 
            `Scene: ${activeScenes}\n` +
            `Environment: ${environment}\n` +
            `Active Entities: ${activeEntities}\n\n` +
            `───NETWORK INFO───\n` +
            `Connection: ${network.type}\n` +
            `Latency (Ping): ${network.ping}`;

        DebugMonitor.rightText.setText(rightPanelText);
    }
}

window.DebugMonitor = DebugMonitor;
DebugMonitor.init();