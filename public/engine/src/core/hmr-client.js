/**
 * HMR Client para Neutralino + Phaser
 * Incluir en tu index.html ANTES de que arranque el juego:
 *   <script src="hmr-client.js"></script>
 *
 * Supone:
 *  - Clases Phaser globales (sin import/export)
 *  - window.game contiene la instancia de Phaser.Game
 *  - Puerto WS igual al configurado en hmr-server.js
 *  - Neutralino.filesystem disponible
 */

(function () {
    'use strict';

    // ─── Configuración ────────────────────────────────────────────────────────

    var HMR_PORT        = 8082;
    var RECONNECT_DELAY = 2000;

    /**
     * true  → reinicia TODAS las escenas activas (menos las excluidas)
     * false → reinicia solo la primera escena activa encontrada
     */
    var REINICIAR_TODAS_LAS_ESCENAS = true;

    /**
     * Keys de escenas que NUNCA se reiniciarán con HMR.
     * Útil para escenas de UI, HUD, overlays, etc.
     * Ejemplo: ['UIScene', 'HUDScene', 'BootScene']
     */
    var ESCENAS_EXCLUIDAS = [];

    // ─────────────────────────────────────────────────────────────────────────

    var ws = null;

    // ─── Conexión WebSocket ───────────────────────────────────────────────────

    function conectar() {
        ws = new WebSocket('ws://localhost:' + HMR_PORT);

        ws.onopen = function () {
            console.log('[HMR] Conectado al servidor HMR.');
        };

        ws.onmessage = function (event) {
            var data;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                return;
            }

            if (data.type === 'hmr-connected') {
                console.log('[HMR] Handshake OK.');
            } else if (data.type === 'hmr-update') {
                aplicarHMR(data.file);
            }
        };

        ws.onclose = function () {
            console.warn('[HMR] Desconectado. Reintentando en ' + RECONNECT_DELAY + 'ms…');
            setTimeout(conectar, RECONNECT_DELAY);
        };

        ws.onerror = function (err) {
            console.error('[HMR] Error WS:', err);
            ws.close();
        };
    }

    // ─── Lectura del archivo ──────────────────────────────────────────────────

    function leerArchivo(rutaAbsoluta, intentos) {
        intentos = intentos || 0;

        return new Promise(function (resolve, reject) {
            if (typeof Neutralino === 'undefined' || typeof Neutralino.filesystem === 'undefined') {
                if (intentos >= 20) {
                    reject(new Error('Neutralino.filesystem no disponible.'));
                    return;
                }
                setTimeout(function () {
                    leerArchivo(rutaAbsoluta, intentos + 1).then(resolve).catch(reject);
                }, 100);
                return;
            }

            Neutralino.filesystem.readFile(rutaAbsoluta)
                .then(resolve)
                .catch(function (err) {
                    reject(new Error('readFile falló: ' + JSON.stringify(err)));
                });
        });
    }

    // ─── Lógica HMR principal ─────────────────────────────────────────────────

    function aplicarHMR(rutaAbsoluta) {
        console.log('[HMR] Leyendo del disco: ' + rutaAbsoluta);

        leerArchivo(rutaAbsoluta)
            .then(function (codigo) {
                // 1. Detectar clases en el código fuente
                var clases = extraerClases(codigo);
                if (clases.length === 0) {
                    console.log('[HMR] Sin clases en ' + rutaAbsoluta + ', se omite.');
                    return;
                }

                // 2. Reasignar "class Foo" → "window.__hmr_Foo = class Foo"
                var codigoMod = codigo;
                clases.forEach(function (cls) {
                    codigoMod = codigoMod.replace(
                        new RegExp('class\\s+' + cls + '\\b', 'g'),
                        'window.__hmr_' + cls + ' = class ' + cls
                    );
                });

                // 3. Ejecutar el código modificado
                try {
                    // eslint-disable-next-line no-eval
                    eval(codigoMod);
                } catch (e) {
                    console.error('[HMR] Error al evaluar:', e);
                    return;
                }

                // 4. Parchear prototipos Y actualizar window[cls] con la clase nueva
                //    Esto es clave: window[cls] debe apuntar a la clase nueva para que
                //    cuando Phaser haga scene.remove() + scene.add() use la versión fresca.
                var actualizadas = [];
                clases.forEach(function (cls) {
                    var ClaseNueva = window['__hmr_' + cls];
                    if (!ClaseNueva) return;

                    var ClaseOriginal = window[cls];

                    if (ClaseOriginal) {
                        // Copiar métodos de instancia al prototipo original
                        Object.getOwnPropertyNames(ClaseNueva.prototype).forEach(function (m) {
                            if (m !== 'constructor') {
                                ClaseOriginal.prototype[m] = ClaseNueva.prototype[m];
                            }
                        });
                        // Copiar métodos estáticos
                        Object.getOwnPropertyNames(ClaseNueva).forEach(function (p) {
                            if (['length', 'name', 'prototype', 'arguments', 'caller'].indexOf(p) === -1) {
                                ClaseOriginal[p] = ClaseNueva[p];
                            }
                        });
                        // Reemplazar la referencia global con la clase nueva
                        // para que scene.add() la registre fresca en Phaser
                        window[cls] = ClaseNueva;
                        actualizadas.push(cls);
                    } else {
                        window[cls] = ClaseNueva;
                        actualizadas.push(cls + ' (nueva)');
                    }

                    delete window['__hmr_' + cls];
                });

                console.log('[HMR] ✔ Actualizado: ' + actualizadas.join(', '));

                // 5. Reiniciar escena(s): remove + add + start
                //    remove+add fuerza a Phaser a registrar la clase nueva en su
                //    SceneManager, en vez de reusar la referencia guardada en el boot.
                reiniciarEscenas();
            })
            .catch(function (e) {
                console.error('[HMR] Fallo al inyectar ' + rutaAbsoluta + ':', e);
            });
    }

    function extraerClases(codigo) {
        var regex  = /class\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
        var clases = [];
        var match;
        while ((match = regex.exec(codigo)) !== null) {
            if (clases.indexOf(match[1]) === -1) clases.push(match[1]);
        }
        return clases;
    }

    // ─── Reinicio de escenas Phaser ───────────────────────────────────────────

    function reiniciarEscenas() {
        if (!window.game || !window.game.scene) {
            console.warn('[HMR] window.game no disponible todavía.');
            return;
        }

        var activas = window.game.scene.getScenes(true);
        if (activas.length === 0) {
            console.warn('[HMR] No hay escenas activas.');
            return;
        }

        // Filtrar excluidas
        var candidatas = activas.filter(function (escena) {
            var key      = escena.scene.key;
            var excluida = ESCENAS_EXCLUIDAS.indexOf(key) !== -1;
            if (excluida) console.log('[HMR] Escena excluida (se omite): ' + key);
            return !excluida;
        });

        if (candidatas.length === 0) {
            console.warn('[HMR] Todas las escenas activas están excluidas.');
            return;
        }

        var aReiniciar = REINICIAR_TODAS_LAS_ESCENAS ? candidatas : [candidatas[0]];

        // Capturar key + clase actual de window ANTES de tocar nada
        var infos = aReiniciar.map(function (escena) {
            var key = escena.scene.key;
            // La clase actualizada ya está en window[key] gracias al paso 4
            // Si la convención es window.PlayScene → key = 'PlayScene'
            var ClaseActual = window[key] || null;
            return { key: key, clase: ClaseActual };
        });

        console.log('[HMR] Reiniciando escena(s): ' + infos.map(function(i){ return i.key; }).join(', '));

        // Detener todas primero
        infos.forEach(function (info) {
            window.game.scene.stop(info.key);
        });

        // Esperar a que Phaser termine el ciclo de destrucción
        setTimeout(function () {
            infos.forEach(function (info) {
                // Si tenemos la clase actualizada, re-registrarla en Phaser
                // para que use la nueva versión y no la que guardó en el boot
                if (info.clase) {
                    try {
                        window.game.scene.remove(info.key);
                        window.game.scene.add(info.key, info.clase, false);
                        console.log('[HMR] Re-registrada en Phaser: ' + info.key);
                    } catch (e) {
                        console.warn('[HMR] No se pudo re-registrar ' + info.key + ':', e);
                    }
                }

                window.game.scene.start(info.key);
            });
        }, 50);
    }

    // ─── Arranque ─────────────────────────────────────────────────────────────
    conectar();

})();
