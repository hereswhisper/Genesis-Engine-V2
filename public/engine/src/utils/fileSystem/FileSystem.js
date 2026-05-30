
class FileSystem {
    static provider = null;
    static env = 'web'; // 'desktop', 'web', 'mobile'
    static activeMods = []; // Aquí se guardan los mods detectados

    static async init() {
        if (window.Neutralino && window['NeutralinoFS']) {
            this.env = 'desktop';
            this.provider = new window['NeutralinoFS']();
        } else if (window.isReactNative && window['NativeFS']) {
            this.env = 'mobile';
        } else {
            this.env = 'web';
        }

        console.log(`%c FILE SYSTEM %c Inicializando proveedor en entorno: ${this.env.toUpperCase()}`, 'background: #1b5e20; color: white;', 'color: unset;');

        if (this.provider && typeof this.provider.init === 'function') {
            await this.provider.init();

            if (this.env === 'desktop') {
                this.applyMonkeyPatches();
            }
        }
    }

    /**
     * Escanea e inyecta todos los archivos .js dentro de mods/NombreMod/src/
     */
    static async injectModScripts() {
        if (this.env !== 'desktop') return;

        for (const mod of this.activeMods) {
            const srcPath = `mods/${mod}/src`;
            if (await this.exists(srcPath)) {
                console.log(`%c MOD SCRIPT %c Escaneando scripts en mod: ${mod}`, 'background: #bf360c; color: white;', 'color: unset;');
                const jsFiles = await this.getAllJsFiles(srcPath);

                for (const file of jsFiles) {
                    console.log(`%c MOD SCRIPT %c Inyectando: ${file}`, 'background: #e65100; color: white;', 'color: unset;');
                    const code = await this.readText(file);

                    // Crear etiqueta script e inyectar el código
                    const script = document.createElement('script');
                    script.type = 'text/javascript';
                    // El sourceURL permite que el archivo inyectado se vea ordenado en las DevTools (F12)
                    script.text = code + `\n//# sourceURL=mod://${mod}/${file}`;
                    document.head.appendChild(script);
                }
            }
        }
    }

    /**
     * Helper recursivo para encontrar todos los .js en subcarpetas
     */
    static async getAllJsFiles(dir) {
        let scripts = [];
        try {
            const entries = await this.readDir(dir);
            for (const entry of entries) {
                const fullPath = `${dir}/${entry.entry}`;
                if (entry.type === 'DIRECTORY') {
                    const subScripts = await this.getAllJsFiles(fullPath);
                    scripts = scripts.concat(subScripts);
                } else if (entry.entry.endsWith('.js')) {
                    scripts.push(fullPath);
                }
            }
        } catch (e) {}
        return scripts;
    }

    /**
     * MAGIA OSCURA: Intercepta peticiones para inyectar assets.
     */
    static applyMonkeyPatches() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const url = args[0];
            if (typeof url === 'string' && url.includes('assets/')) {
                const cleanPath = url.substring(url.indexOf('assets/') + 7);

                // --- CASO ESPECIAL: FUSIÓN DE SEMANAS (Suma directa, sin filtros) ---
                if (cleanPath.endsWith('weeks.txt')) {
                    let combinedText = "";

                    try {
                        const baseRes = await originalFetch.apply(window, args);
                        if (baseRes.ok) combinedText += (await baseRes.text()) + "\n";
                    } catch (e) {}

                    for (const mod of FileSystem.activeMods) {
                        const modPath = `mods/${mod}/assets/${cleanPath}`; // AHORA BUSCA EN assets/
                        if (await FileSystem.exists(modPath)) {
                            combinedText += (await FileSystem.readText(modPath)) + "\n";
                        }
                    }

                    return new Response(combinedText.trim(), {
                        status: 200,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                }

                // --- CASO NORMAL: SOBRESCRIBIR ---
                for (const mod of FileSystem.activeMods) {
                    const modPath = `mods/${mod}/assets/${cleanPath}`; // AHORA BUSCA EN assets/

                    if (await FileSystem.exists(modPath)) {
                        const text = await FileSystem.readText(modPath);
                        return new Response(text, {
                            status: 200,
                            headers: { 'Content-Type': cleanPath.endsWith('.json') ? 'application/json' : 'text/plain' }
                        });
                    }
                }
            }
            return originalFetch.apply(window, args);
        };

        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._reqUrl = url;
            originalOpen.apply(this, [method, url, ...args]);
        };

        XMLHttpRequest.prototype.send = function(body) {
            const url = this._reqUrl;
            if (url && typeof url === 'string' && url.includes('assets/')) {
                const cleanPath = url.substring(url.indexOf('assets/') + 7);

                (async () => {
                    let foundModData = null;

                    for (const mod of FileSystem.activeMods) {
                        const modPath = `mods/${mod}/assets/${cleanPath}`; // AHORA BUSCA EN assets/

                        if (await FileSystem.exists(modPath)) {
                            if (cleanPath.match(/\.(json|txt|xml|csv)$/i)) {
                                foundModData = { text: await FileSystem.readText(modPath) };
                            } else {
                                const fullModPath = `${FileSystem.provider.basePath}/${modPath}`;
                                foundModData = { buffer: await Neutralino.filesystem.readBinaryFile(fullModPath) };
                            }
                            break;
                        }
                    }

                    if (foundModData) {
                        Object.defineProperty(this, 'readyState', { value: 4, writable: true });
                        Object.defineProperty(this, 'status', { value: 200, writable: true });

                        if (this.responseType === 'json') {
                            Object.defineProperty(this, 'response', { value: JSON.parse(foundModData.text) });
                        } else if (this.responseType === 'blob') {
                            const blob = new Blob([foundModData.buffer]);
                            Object.defineProperty(this, 'response', { value: blob });
                        } else if (this.responseType === 'arraybuffer') {
                            Object.defineProperty(this, 'response', { value: foundModData.buffer });
                        } else {
                            Object.defineProperty(this, 'responseText', { value: foundModData.text });
                            Object.defineProperty(this, 'response', { value: foundModData.text });
                        }

                        const mockEvent = { target: this, type: 'load' };

                        if (typeof this.onreadystatechange === 'function') this.onreadystatechange(mockEvent);
                        if (typeof this.onload === 'function') this.onload(mockEvent);
                        if (typeof this.onloadend === 'function') this.onloadend(mockEvent);

                        try {
                            this.dispatchEvent(new Event('load'));
                        } catch (e) {}
                    } else {
                        originalSend.call(this, body);
                    }
                })();
                return;
            }

            originalSend.call(this, body);
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
