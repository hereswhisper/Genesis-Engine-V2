class HotReload {
  constructor() {
    this.ignoredScenes = ["HUDScene", "ToastScene", "TransitionScene"];
    this.init();
  }

  init() {
    window.addEventListener("keydown", async (e) => {
      if (e.key === "F5") {
        e.preventDefault();
        await this.reloadCurrentScenes();
      }
    });
  }

  async reloadCurrentScenes() {
    if (!window.game || !window.game.scene) {
      console.warn("[HotReload] Motor de Phaser no inicializado aún.");
      return;
    }

    console.log(
      "%c HOT RELOAD %c Refrescando recursos de mods...",
      "background: #f57f17; color: white;",
      "color: unset;",
    );

    // 1. Re-escanear las carpetas de los mods Y reconstruir el índice de archivos
    if (window.FileSystem && window.FileSystem.provider && typeof window.FileSystem.provider.scanMods === "function") {
      await window.FileSystem.provider.scanMods();
      
      // NUEVO: Volver a armar la lista de archivos para evitar fallos de cache al recargar
      if (typeof window.FileSystem.buildIndex === "function") {
        await window.FileSystem.buildIndex();
      }
    }

    // 2. Volver a cargar la lista de semanas fusionada
    if (window.DataSongs && typeof window.DataSongs.loadWeeks === "function") {
      await window.DataSongs.loadWeeks();
    }

    const activeScenes = window.game.scene.scenes.filter((scene) =>
      scene.scene.isActive(),
    );

    activeScenes.forEach((sceneObj) => {
      const key = sceneObj.scene.key;

      if (!this.ignoredScenes.includes(key)) {
        console.log(`[HotReload] Programando limpieza y reinicio para: ${key}`);

        sceneObj.events.once("shutdown", () => {
          const cache = sceneObj.sys.cache;
          const textures = sceneObj.sys.textures;
          const sound = sceneObj.sys.sound;
          const anims = sceneObj.sys.anims;

          if (cache) {
            ["json", "xml", "text", "audio"].forEach((type) => {
              if (cache[type] && cache[type].entries) {
                const keys = cache[type].entries.keys();
                keys.forEach((k) => cache[type].remove(k));
              }
            });
          }

          const keysToRemove = [];
          if (textures) {
            const protectedKeys = new Set(["__DEFAULT", "__MISSING"]);
            this.ignoredScenes.forEach((ignoredKey) => {
              const persistentScene = window.game.scene.getScene(ignoredKey);
              if (persistentScene && persistentScene.sys && persistentScene.sys.isActive()) {
                const protectTextures = (gameObject) => {
                  if (gameObject.texture && gameObject.texture.key)
                    protectedKeys.add(gameObject.texture.key);
                  if (gameObject.list) gameObject.list.forEach(protectTextures);
                };
                if (persistentScene.children) {
                  persistentScene.children.getChildren().forEach(protectTextures);
                }
              }
            });

            textures.each((tex) => {
              if (!protectedKeys.has(tex.key)) {
                keysToRemove.push(tex.key);
              }
            });
            keysToRemove.forEach((k) => textures.remove(k));
          }

          if (anims && anims.anims) {
            const animsToRemove = [];
            const allAnims = anims.anims.entries || {};

            const processAnim = (anim) => {
              if (anim && anim.frames && anim.frames.length > 0) {
                const texKey = anim.frames[0].textureKey;
                if (keysToRemove.includes(texKey)) {
                  animsToRemove.push(anim.key);
                }
              } else if (anim) {
                animsToRemove.push(anim.key);
              }
            };

            if (allAnims instanceof Map) {
              allAnims.forEach(processAnim);
            } else {
              Object.values(allAnims).forEach(processAnim);
            }
            animsToRemove.forEach((k) => anims.remove(k));
          }

          if (sound) {
            sound.removeAll();
          }

          console.log(`[HotReload] Caché vaciada exitosamente para: ${key}`);
        });

        sceneObj.scene.restart();
        if (window.Toast) {
          window.Toast.alert(`Recargando recursos y escena: ${key}`, "suggestion");
        }
      }
    });
  }
}

window.hotReload = new HotReload();