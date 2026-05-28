// public/engine/src/utils/fileSystem/FileSystem.js

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

            // ¡Aplicar el Monkey Patch si estamos en PC para inyectar mods!
            if (this.env === 'desktop') {
                this.applyMonkeyPatches();
            }
        }
    }

    /**
     * MAGIA OSCURA: Intercepta peticiones para inyectar y fusionar mods.
     */
    static applyMonkeyPatches() {
        // 1. Monkey Patch a fetch() -> Controla la lectura de JSONs y TXTs (DataSongs)
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const url = args[0];
            if (typeof url === 'string' && url.includes('assets/')) {
                const cleanPath = url.substring(url.indexOf('assets/') + 7); // Quita 'assets/' (ej. data/ui/weeks.txt)

                // --- CASO ESPECIAL: FUSIÓN DE SEMANAS ---
                if (cleanPath.endsWith('weeks.txt')) {
                    let combinedWeeks = [];

                    // A. Leer las semanas originales del juego base
                    try {
                        const baseRes = await originalFetch.apply(window, args);
                        if (baseRes.ok) {
                            const baseText = await baseRes.text();
                            // Limpiamos y metemos a la lista
                            baseText.split(/\r?\n/).forEach(w => {
                                if (w.trim() !== '') combinedWeeks.push(w.trim());
                            });
                        }
                    } catch (e) {}

                    // B. Buscar weeks.txt en los mods y sumarlos a la lista
                    for (const mod of FileSystem.activeMods) {
                        // Soporta ambas estructuras: con 'assets/' adentro o directo
                        const modPath = `${FileSystem.provider.modsPath}/${mod}/${cleanPath}`;
                        const modPathAlt = `${FileSystem.provider.modsPath}/${mod}/assets/${cleanPath}`;

                        let finalModPath = null;
                        if (await FileSystem.provider.exists(modPath)) finalModPath = modPath;
                        else if (await FileSystem.provider.exists(modPathAlt)) finalModPath = modPathAlt;

                        if (finalModPath) {
                            console.log(`%c MODS %c Añadiendo semanas del mod: ${mod}`, 'background: #00838f; color: white;', 'color: unset;');
                            const modText = await FileSystem.provider.readText(finalModPath);

                            modText.split(/\r?\n/).forEach(w => {
                                const cleanWeek = w.trim();
                                // Lo sumamos solo si no está vacío y no es un duplicado
                                if (cleanWeek !== '' && !combinedWeeks.includes(cleanWeek)) {
                                    combinedWeeks.push(cleanWeek);
                                }
                            });
                        }
                    }

                    // Devolvemos la lista perfectamente fusionada con saltos de línea
                    return new Response(combinedWeeks.join('\n'), { status: 200 });
                }

                // --- CASO NORMAL: SOBRESCRIBIR JSONs y otros textos ---
                for (const mod of FileSystem.activeMods) {
                    const modPath = `${FileSystem.provider.modsPath}/${mod}/${cleanPath}`;
                    const modPathAlt = `${FileSystem.provider.modsPath}/${mod}/assets/${cleanPath}`;

                    let finalModPath = null;
                    if (await FileSystem.provider.exists(modPath)) finalModPath = modPath;
                    else if (await FileSystem.provider.exists(modPathAlt)) finalModPath = modPathAlt;

                    if (finalModPath) {
                        console.log(`%c MODS (Fetch) %c Inyectando: ${cleanPath}`, 'background: #4a148c; color: white;', 'color: unset;');
                        const text = await FileSystem.provider.readText(finalModPath);
                        return new Response(text, { status: 200 });
                    }
                }
            }
            // Si no está en mods, carga original
            return originalFetch.apply(window, args);
        };

        // 2. Monkey Patch a XHR -> Controla Phaser (this.load.image, this.load.json)
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

                    // Revisar si algún mod tiene este archivo para sobrescribirlo (Soporta ambas estructuras)
                    for (const mod of FileSystem.activeMods) {
                        const modPath = `${FileSystem.provider.modsPath}/${mod}/${cleanPath}`;
                        const modPathAlt = `${FileSystem.provider.modsPath}/${mod}/assets/${cleanPath}`;

                        let finalModPath = null;
                        if (await FileSystem.provider.exists(modPath)) finalModPath = modPath;
                        else if (await FileSystem.provider.exists(modPathAlt)) finalModPath = modPathAlt;

                        if (finalModPath) {
                            console.log(`%c MODS (Phaser) %c Inyectando asset: ${cleanPath}`, 'background: #311b92; color: white;', 'color: unset;');

                            if (cleanPath.match(/\.(json|txt|xml|csv)$/i)) {
                                foundModData = { text: await FileSystem.provider.readText(finalModPath) };
                            } else {
                                foundModData = { buffer: await Neutralino.filesystem.readBinaryFile(finalModPath) };
                            }
                            break;
                        }
                    }

                    if (foundModData) {
                        // Engañar a Phaser haciéndole creer que la petición de red fue exitosa
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

                        if (typeof this.onload === 'function') this.onload();
                        if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
                        this.dispatchEvent(new Event('load'));
                    } else {
                        // Petición original si el mod no tiene el archivo
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
