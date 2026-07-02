/**
 * HMR Client para Neutralino + Phaser
 * Incluir en tu index.html ANTES de que arranque el juego:
 * <script src="hmr-client.js"></script>
 *
 * Supone:
 * - Clases Phaser globales (sin import/export)
 * - window.game contiene la instancia de Phaser.Game
 * - Puerto WS igual al configurado en hmr-server.js
 * - Neutralino.filesystem disponible
 */

(function () {
  "use strict";

  // ─── Configuración ────────────────────────────────────────────────────────

  var HMR_PORT = 8082;
  // var RECONNECT_DELAY = 2000; <- Eliminado ya que no habrá reintentos

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
    ws = new WebSocket("ws://localhost:" + HMR_PORT);

    ws.onopen = function () {
      console.log(
        "%c HMR %c Conectado al servidor HMR.",
        "background: #311b92; color: white;",
        "color: unset;",
      );
    };

    ws.onmessage = function (event) {
      var data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      if (data.type === "hmr-connected") {
        console.log(
          "%c HMR %c Handshake OK.",
          "background: #311b92; color: white;",
          "color: unset;",
        );
      } else if (data.type === "hmr-update") {
        aplicarHMR(data.file);
      }
    };

    ws.onclose = function () {
      console.warn(
        "%c HMR %c Desconectado o servidor no encontrado. No se reintentará la conexión.",
        "background: #e65100; color: white;",
        "color: unset;",
      );
      // Se eliminó setTimeout(conectar, RECONNECT_DELAY); para evitar spam
    };

    ws.onerror = function (err) {
      // Se redujo el impacto visual del error para no molestar si no hay servidor
      console.log(
        "%c HMR %c Error WS (esperable si el servidor HMR no está corriendo).",
        "background: #b71c1c; color: white;",
        "color: unset;",
      );
      ws.close();
    };
  }

  // ─── Lectura del archivo ──────────────────────────────────────────────────

  function leerArchivo(rutaAbsoluta, intentos) {
    intentos = intentos || 0;

    return new Promise(function (resolve, reject) {
      if (
        typeof Neutralino === "undefined" ||
        typeof Neutralino.filesystem === "undefined"
      ) {
        if (intentos >= 20) {
          reject(new Error("Neutralino.filesystem no disponible."));
          return;
        }
        setTimeout(function () {
          leerArchivo(rutaAbsoluta, intentos + 1)
            .then(resolve)
            .catch(reject);
        }, 100);
        return;
      }

      Neutralino.filesystem
        .readFile(rutaAbsoluta)
        .then(resolve)
        .catch(function (err) {
          reject(new Error("readFile falló: " + JSON.stringify(err)));
        });
    });
  }

  // ─── Lógica HMR principal ─────────────────────────────────────────────────

  function aplicarHMR(rutaAbsoluta) {
    console.log(
      "%c HMR %c Leyendo del disco: " + rutaAbsoluta,
      "background: #311b92; color: white;",
      "color: unset;",
    );

    leerArchivo(rutaAbsoluta)
      .then(function (codigo) {
        // 1. Detectar clases en el código fuente
        var clases = extraerClases(codigo);
        if (clases.length === 0) {
          console.log(
            "%c HMR %c Sin clases en " + rutaAbsoluta + ", se omite.",
            "background: #311b92; color: white;",
            "color: unset;",
          );
          return;
        }

        // 2. Reasignar "class Foo" → "window.__hmr_Foo = class Foo"
        var codigoMod = codigo;
        clases.forEach(function (cls) {
          codigoMod = codigoMod.replace(
            new RegExp("class\\s+" + cls + "\\b", "g"),
            "window.__hmr_" + cls + " = class " + cls,
          );
        });

        // 3. Ejecutar el código modificado
        try {
          // eslint-disable-next-line no-eval
          eval(codigoMod);
        } catch (e) {
          console.error(
            "%c HMR %c Error al evaluar:",
            "background: #b71c1c; color: white;",
            "color: unset;",
            e,
          );
          return;
        }

        // 4. Parchear prototipos Y actualizar window[cls] con la clase nueva
        var actualizadas = [];
        clases.forEach(function (cls) {
          var ClaseNueva = window["__hmr_" + cls];
          if (!ClaseNueva) return;

          var ClaseOriginal = window[cls];

          if (ClaseOriginal) {
            Object.getOwnPropertyNames(ClaseNueva.prototype).forEach(
              function (m) {
                if (m !== "constructor") {
                  ClaseOriginal.prototype[m] = ClaseNueva.prototype[m];
                }
              },
            );
            Object.getOwnPropertyNames(ClaseNueva).forEach(function (p) {
              if (
                ["length", "name", "prototype", "arguments", "caller"].indexOf(
                  p,
                ) === -1
              ) {
                ClaseOriginal[p] = ClaseNueva[p];
              }
            });
            window[cls] = ClaseNueva;
            actualizadas.push(cls);
          } else {
            window[cls] = ClaseNueva;
            actualizadas.push(cls + " (nueva)");
          }

          delete window["__hmr_" + cls];
        });

        console.log(
          "%c HMR %c ✔ Actualizado: " + actualizadas.join(", "),
          "background: #311b92; color: white;",
          "color: unset;",
        );

        // 5. Reiniciar escena(s)
        reiniciarEscenas();
      })
      .catch(function (e) {
        console.error(
          "%c HMR %c Fallo al inyectar " + rutaAbsoluta + ":",
          "background: #b71c1c; color: white;",
          "color: unset;",
          e,
        );
      });
  }

  function extraerClases(codigo) {
    var regex = /class\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
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
      console.warn(
        "%c HMR %c window.game no disponible todavía.",
        "background: #e65100; color: white;",
        "color: unset;",
      );
      return;
    }

    var activas = window.game.scene.getScenes(true);
    if (activas.length === 0) {
      console.warn(
        "%c HMR %c No hay escenas activas.",
        "background: #e65100; color: white;",
        "color: unset;",
      );
      return;
    }

    var candidatas = activas.filter(function (escena) {
      var key = escena.scene.key;
      var excluida = ESCENAS_EXCLUIDAS.indexOf(key) !== -1;
      if (excluida)
        console.log(
          "%c HMR %c Escena excluida (se omite): " + key,
          "background: #311b92; color: white;",
          "color: unset;",
        );
      return !excluida;
    });

    if (candidatas.length === 0) {
      console.warn(
        "%c HMR %c Todas las escenas activas están excluidas.",
        "background: #e65100; color: white;",
        "color: unset;",
      );
      return;
    }

    var aReiniciar = REINICIAR_TODAS_LAS_ESCENAS ? candidatas : [candidatas[0]];

    var infos = aReiniciar.map(function (escena) {
      var key = escena.scene.key;
      var ClaseActual = window[key] || null;
      return { key: key, clase: ClaseActual };
    });

    console.log(
      "%c HMR %c Reiniciando escena(s): " +
        infos
          .map(function (i) {
            return i.key;
          })
          .join(", "),
      "background: #311b92; color: white;",
      "color: unset;",
    );

    infos.forEach(function (info) {
      window.game.scene.stop(info.key);
    });

    setTimeout(function () {
      infos.forEach(function (info) {
        if (info.clase) {
          try {
            window.game.scene.remove(info.key);
            window.game.scene.add(info.key, info.clase, false);
            console.log(
              "%c HMR %c Re-registrada en Phaser: " + info.key,
              "background: #311b92; color: white;",
              "color: unset;",
            );
          } catch (e) {
            console.warn(
              "%c HMR %c No se pudo re-registrar " + info.key + ":",
              "background: #e65100; color: white;",
              "color: unset;",
              e,
            );
          }
        }

        window.game.scene.start(info.key);
      });
    }, 50);
  }

  // ─── Arranque ─────────────────────────────────────────────────────────────
  conectar();
})();
