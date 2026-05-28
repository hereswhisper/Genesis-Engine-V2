class DataSongs {
    static weeksList = [];
    static weeksData = {};
    static songsData = {}; // Almacena los meta.json de cada canción

    /**
     * Inicializador maestro: Carga semanas y luego sus metadatos de canciones.
     */
    static async loadWeeks() {
        try {
            const response = await fetch(Path.dataUI + 'weeks.txt');
            if (!response.ok) throw new Error("No se pudo cargar weeks.txt");

            const textData = await response.text();
            this.weeksList = textData.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");

            console.log("%c GENESIS %c Cargando semanas...", 'background: #1b5e20; color: white;', 'color: unset;');

            // 1. Cargar JSONs de las semanas
            await Promise.all(this.weeksList.map(async (week) => {
                const res = await fetch(`${Path.dataWeeks}${week}.json`);
                if (res.ok) this.weeksData[week] = await res.json();
            }));

            // 2. Cargar Metadatos de todas las canciones encontradas en las semanas
            await this.loadAllSongsMeta();

            console.log("%c GENESIS %c Base de datos de música lista.", 'background: #1b5e20; color: white;', 'color: unset;');
        } catch (error) {
          console.error("%c GENESIS %c Error en la inicialización de datos:", 'background: #b71c1c; color: white;', 'color: unset;', error);
        }
    }

    /**
     * Busca todas las canciones mencionadas en las semanas y carga sus meta.json
     */
    static async loadAllSongsMeta() {
        // Extraer nombres de canciones únicos de todas las semanas cargadas
        let tracks = [];
        Object.values(this.weeksData).forEach(w => {
            if (w.songs && Array.isArray(w.songs)) {
                // Estructura estándar de FNF: canciones pueden ser un array de arrays [nombre, icono, color]
                w.songs.forEach(s => tracks.push(Array.isArray(s) ? s[0] : s));
            } else if (w.tracks) {
                tracks = tracks.concat(w.tracks);
            }
        });

        const uniqueTracks = [...new Set(tracks)];

        await Promise.all(uniqueTracks.map(async (track) => {
            const trackID = track.toLowerCase().replace(/\s+/g, '-');
            try {
                // Ruta solicitada: Path.songs + {track}/charts/meta.json
                const res = await fetch(`${Path.songs}${trackID}/charts/meta.json`);
                if (res.ok) {
                    this.songsData[trackID] = await res.json();
                }
            } catch (e) {
              console.warn(`%c GENESIS %c No se encontró meta.json para: ${trackID}`, 'background: #e65100; color: white;', 'color: unset;');
            }
        }));
    }

    /**
     * Método genérico para navegar objetos JSON usando puntos (ej: 'color.r')
     */
    static _resolve(obj, path) {
        if (!path) return obj;
        return path.split('.').reduce((prev, curr) => (prev && prev[curr] !== undefined) ? prev[curr] : undefined, obj);
    }

    /**
     * Obtiene datos de una semana.
     */
    static getWeekData(week, path) {
        return this._resolve(this.weeksData[week], path);
    }

    /**
     * Obtiene metadatos de una canción específica.
     * @param {string} track - El ID de la canción (ej: 'bopeebo')
     * @param {string} path - Propiedad interna (ej: 'bpm' o 'animations.dad')
     */
    static getSongMeta(track, path) {
        const trackID = track.toLowerCase().replace(/\s+/g, '-');
        return this._resolve(this.songsData[trackID], path);
    }
}

window.DataSongs = DataSongs;
