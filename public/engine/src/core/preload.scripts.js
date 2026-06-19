/**
 * Genesis Engine - Script Preloader
 */

window.game = {
  _sceneQueue: [],
  scene: {
    add: function (key, sceneClass, autoStart) {
      window.game._sceneQueue.push({ key, sceneClass, autoStart });
    },
  },
};

async function loadScriptsOrderly() {
  try {
    const prefix = window.isReactNative ? "/engine/" : "";
    console.log(
      `%c GENESIS PRELOADER %c Buscando config en: ${prefix}src/core/preload.scripts.jsonc`,
      "background: #004d40; color: white;",
      "color: unset;"
    );

    const response = await fetch(prefix + "src/core/preload.scripts.jsonc");

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status} al buscar el .jsonc`);
    }

    const text = await response.text();
    const cleanJson = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
    const scripts = JSON.parse(cleanJson);

    for (const src of scripts) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = prefix + src;
        script.onload = resolve;
        script.onerror = () => {
          reject(`Archivo no encontrado o bloqueado: ${prefix + src}`);
        };
        document.getElementById("scripts-container").appendChild(script);
      });
    }

    await bootEngine();
  } catch (error) {
    console.error(
      "%c GENESIS %c Falló la secuencia de carga -> " +
        (error.message || error),
      "background: #b71c1c; color: white;",
      "color: unset;"
    );
  }
}

async function bootEngine() {
  // Comprobamos si las variables de entorno de Neutralino existen
  const isNeutralinoEnv = typeof Neutralino !== "undefined" && typeof window.NL_PORT !== "undefined";

  if (isNeutralinoEnv && !window.isReactNative) {
    Neutralino.init();
    console.log(
      "%c GENESIS %c Neutralino inicializado (Modo PC).",
      "background: #004d40; color: white;",
      "color: unset;"
    );

    // Inicia el sistema de archivos
    await FileSystem.init();

    // INYECTA LOS SCRIPTS DE LOS MODS AQUÍ (Antes de arrancar Phaser y DataSongs)
    await FileSystem.injectModScripts();

  } else if (window.isReactNative) {
    console.log(
      "%c GENESIS %c Neutralino ignorado (Modo React Native).",
      "background: #004d40; color: white;",
      "color: unset;"
    );
  } else {
    // Si estamos en un navegador web puro y no en React Native ni Neutralino
    console.log(
      "%c GENESIS %c Neutralino ignorado (Modo Navegador Web).",
      "background: #004d40; color: white;",
      "color: unset;"
    );
    // Nota: Si dependes de FileSystem aquí, podrías necesitar una versión de 
    // FileSystem diseñada para la web (ej. basada en LocalStorage o IndexedDB).
  }

  if (window.DataSongs) {
    await window.DataSongs.loadWeeks();
  }

  if (typeof window.StoragePatch !== "undefined") {
    await window.StoragePatch.init();
  }

  if (window.GenesisConfig) {
    const queuedScenes = window.game._sceneQueue || [];
    window.game = new Phaser.Game(window.GenesisConfig);

    queuedScenes.forEach((s) => {
      window.game.scene.add(s.key, s.sceneClass, s.autoStart);
    });

    console.log(
      `%c GENESIS %c Boot completado. ${queuedScenes.length} escenas inyectadas.`,
      "background: #004d40; color: white;",
      "color: unset;"
    );
  } else {
    console.error(
      "%c GENESIS %c Error Fatal: GenesisConfig no está definido.",
      "background: #b71c1c; color: white;",
      "color: unset;"
    );
  }
}

loadScriptsOrderly();