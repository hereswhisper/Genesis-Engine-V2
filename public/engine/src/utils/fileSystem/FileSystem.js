// public/engine/src/utils/fileSystem/FileSystem.js
class FileSystem {
  static provider = null;
  static env = "web"; 
  static activeMods = []; 
  static modFiles = new Set(); 

  static async init() {
    if (window.Neutralino && window["NeutralinoFS"]) {
      this.env = "desktop";
      this.provider = new window["NeutralinoFS"]();
    } else if (window.isReactNative && window["NativeFS"]) {
      this.env = "mobile";
    } else {
      this.env = "web";
    }

    console.log(
      `%c FILE SYSTEM %c Inicializando proveedor en entorno: ${this.env.toUpperCase()}`,
      "background: #1b5e20; color: white;",
      "color: unset;"
    );

    if (this.provider && typeof this.provider.init === "function") {
      await this.provider.init();
      await this.buildIndex(); 
      if (this.env === "desktop") {
        this.applyMonkeyPatches();
      }
    }
  }

  static async buildIndex() {
    this.modFiles.clear();
    if (!this.activeMods || this.activeMods.length === 0) return;
    
    console.log("%c FILE SYSTEM %c Pre-indexando archivos de mods...", "background: #1b5e20; color: white;", "color: unset;");
    
    for (const mod of this.activeMods) {
      const basePath = `mods/${mod}/assets`;
      const files = await this.getAllFilesRecursive(basePath);
      files.forEach(f => {
        const cleanPath = f.substring(f.indexOf("assets/") + 7);
        this.modFiles.add(cleanPath);
      });
    }
    
    console.log(`%c FILE SYSTEM %c Índice completado: ${this.modFiles.size} archivos encontrados.`, "background: #1b5e20; color: white;", "color: unset;");
  }

  static async getAllFilesRecursive(dir) {
    let results = [];
    try {
      const entries = await this.readDir(dir);
      for (const entry of entries) {
        const fullPath = `${dir}/${entry.entry}`;
        if (entry.type === "DIRECTORY") {
          const sub = await this.getAllFilesRecursive(fullPath);
          results = results.concat(sub);
        } else {
          results.push(fullPath);
        }
      }
    } catch (e) {}
    return results;
  }

  static async injectModScripts() {
    if (this.env !== "desktop") return;
    for (const mod of this.activeMods) {
      const srcPath = `mods/${mod}/src`;
      if (await this.exists(srcPath)) {
        console.log(
          `%c MOD SCRIPT %c Escaneando scripts en mod: ${mod}`,
          "background: #bf360c; color: white;",
          "color: unset;"
        );
        const jsFiles = await this.getAllJsFiles(srcPath);
        for (const file of jsFiles) {
          console.log(
            `%c MOD SCRIPT %c Inyectando: ${file}`,
            "background: #e65100; color: white;",
            "color: unset;"
          );
          const code = await this.readText(file);
          const script = document.createElement("script");
          script.type = "text/javascript";
          script.text = code + `\n//# sourceURL=mod://${mod}/${file}`;
          document.head.appendChild(script);
        }
      }
    }
  }

  static async getAllJsFiles(dir) {
    let scripts = [];
    try {
      const entries = await this.readDir(dir);
      for (const entry of entries) {
        const fullPath = `${dir}/${entry.entry}`;
        if (entry.type === "DIRECTORY") {
          const subScripts = await this.getAllJsFiles(fullPath);
          scripts = scripts.concat(subScripts);
        } else if (entry.entry.endsWith(".js")) {
          scripts.push(fullPath);
        }
      }
    } catch (e) {}
    return scripts;
  }

  static applyMonkeyPatches() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      if (!FileSystem.activeMods || FileSystem.activeMods.length === 0) {
        return originalFetch.apply(window, args);
      }
      
      const url = args[0];
      if (typeof url === "string" && url.includes("assets/")) {
        const cleanUrl = url.split("?")[0];
        const cleanPath = cleanUrl.substring(cleanUrl.indexOf("assets/") + 7);

        if (cleanPath.endsWith("weeks.txt")) {
          let combinedText = "";
          try {
            const baseRes = await originalFetch.apply(window, args);
            if (baseRes.ok) combinedText += (await baseRes.text()) + "\n";
          } catch (e) {}
          for (const mod of FileSystem.activeMods) {
            const modPath = `mods/${mod}/assets/${cleanPath}`;
            if (await FileSystem.exists(modPath)) {
              combinedText += (await FileSystem.readText(modPath)) + "\n";
            }
          }
          return new Response(combinedText.trim(), {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }

        if (FileSystem.modFiles.has(cleanPath)) {
          for (const mod of FileSystem.activeMods) {
            const modPath = `mods/${mod}/assets/${cleanPath}`;
            if (await FileSystem.exists(modPath)) {
              const text = await FileSystem.readText(modPath);
              return new Response(text, {
                status: 200,
                headers: {
                  "Content-Type": cleanPath.endsWith(".json")
                    ? "application/json"
                    : "text/plain",
                },
              });
            }
          }
        }
      }
      return originalFetch.apply(window, args);
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...args) {
      this._reqUrl = url;
      originalOpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function (body) {
      const url = this._reqUrl;

      // FIX: Bypass transparente. Si no es un asset o no está indexado en los mods,
      // ejecutamos el método nativo sin promesas de por medio para evitar el Content Length Mismatch.
      if (!url || typeof url !== "string" || !url.includes("assets/") || !FileSystem.activeMods || FileSystem.activeMods.length === 0) {
        originalSend.call(this, body);
        return;
      }

      const cleanUrl = url.split("?")[0];
      const cleanPath = cleanUrl.substring(cleanUrl.indexOf("assets/") + 7);

      if (!FileSystem.modFiles.has(cleanPath)) {
        originalSend.call(this, body);
        return;
      }

      // Proceso exclusivo para los archivos detectados dentro de los mods
      (async () => {
        let foundModData = null;
        for (const mod of FileSystem.activeMods) {
          const modPath = `mods/${mod}/assets/${cleanPath}`;
          if (await FileSystem.exists(modPath)) {
            if (cleanPath.match(/\.(json|txt|xml|csv)$/i)) {
              foundModData = { text: await FileSystem.readText(modPath) };
            } else {
              const fullModPath = `${FileSystem.provider.basePath}/${modPath}`;
              foundModData = {
                buffer: await Neutralino.filesystem.readBinaryFile(fullModPath),
              };
            }
            break;
          }
        }

        if (foundModData) {
          Object.defineProperty(this, "readyState", { value: 4, writable: true });
          Object.defineProperty(this, "status", { value: 200, writable: true });

          if (this.responseType === "json") {
            Object.defineProperty(this, "response", {
              value: typeof foundModData.text === "string" ? JSON.parse(foundModData.text) : foundModData.text,
            });
          } else if (this.responseType === "blob") {
            const blob = new Blob([foundModData.buffer]);
            Object.defineProperty(this, "response", { value: blob });
          } else if (this.responseType === "arraybuffer") {
            Object.defineProperty(this, "response", { value: foundModData.buffer });
          } else {
            Object.defineProperty(this, "responseText", { value: foundModData.text });
            Object.defineProperty(this, "response", { value: foundModData.text });
          }

          const mockEvent = { target: this, type: "load" };
          if (typeof this.onreadystatechange === "function") this.onreadystatechange(mockEvent);
          if (typeof this.onload === "function") this.onload(mockEvent);
          if (typeof this.onloadend === "function") this.onloadend(mockEvent);
          
          try {
            this.dispatchEvent(new Event("load"));
          } catch (e) {}
        } else {
          originalSend.call(this, body);
        }
      })();
    };
  }

  static async readDir(path) {
    if (!this.provider) throw new Error("FileSystem no inicializado.");
    return await this.provider.readDir(path);
  }

  static async readText(path) {
    if (!this.provider) throw new Error("FileSystem no inicializado.");
    return await this.provider.readText(path);
  }

  static async readMedia(path) {
    if (!this.provider) throw new Error("FileSystem no inicializado.");
    return await this.provider.readMedia(path);
  }

  static async exists(path) {
    if (!this.provider) throw new Error("FileSystem no inicializado.");
    return await this.provider.exists(path);
  }
}

window.FileSystem = FileSystem;