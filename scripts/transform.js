const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, 'input');
const outputDir = path.join(__dirname, 'output');

// Crear carpetas si no existen
if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

console.log("Iniciando conversión de charts Legacy a V-Slice...");

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.json'));

if (files.length === 0) {
    console.log("No se encontraron archivos .json en la carpeta 'input'.");
    console.log("Por favor, coloca tus archivos antiguos (ej. city-funk.json) en la carpeta 'input' y vuelve a ejecutar el script.");
    process.exit(0);
}

const songs = {};

// Paso 1: Leer y agrupar los archivos por canción y dificultad
files.forEach(file => {
    const filePath = path.join(inputDir, file);
    try {
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(rawData);

        // Validar que sea un chart legacy (tiene la propiedad "song" y "song.notes")
        if (!parsed.song || !parsed.song.notes) {
            console.log(`[!] Omitiendo '${file}' - No parece un chart Legacy válido.`);
            return;
        }

        let diff = "normal";
        let baseName = path.basename(file, '.json');

        // Detectar dificultad por el sufijo del archivo (ej. city-funk-hard -> diff: hard)
        const diffRegex = /-(easy|hard|erect|nightmare|alt)$/i;
        const match = baseName.match(diffRegex);

        if (match) {
            diff = match[1].toLowerCase();
            baseName = baseName.replace(diffRegex, '');
        }

        if (!songs[baseName]) {
            songs[baseName] = { charts: {}, baseData: null };
        }

        songs[baseName].charts[diff] = parsed.song;

        // Priorizar la dificultad 'normal' para extraer los metadatos base
        if (!songs[baseName].baseData || diff === "normal") {
            songs[baseName].baseData = parsed.song;
        }

    } catch (e) {
        console.error(`[X] Error al procesar '${file}':`, e.message);
    }
});

// Paso 2: Generar y exportar Meta y Chart por cada canción agrupada
Object.keys(songs).forEach(songName => {
    const songGroup = songs[songName];
    const baseData = songGroup.baseData;

    // --- CONSTRUIR META.JSON ---
    const meta = {
        songName: baseData.song || songName,
        events: true,
        base: {
            stage: baseData.stage || "stage",
            scrollSpeed: baseData.speed || 1.0,
            lanes: 4,
            characters: {
                players: [baseData.player1 || "bf"],
                opponents: [baseData.player2 || "dad"],
                spectator: [baseData.gfVersion || "gf"]
            },
            audio: {
                bpm: baseData.bpm || 100,
                needsVoices: baseData.needsVoices ?? true,
                instrumental: {
                    inst: { file: "Inst.ogg", offset: 0 }
                },
                vocals: {
                    player: { file: `Voices-${baseData.player1 || "bf"}.ogg`, offset: 0 },
                    opponent: { file: `Voices-${baseData.player2 || "dad"}.ogg`, offset: 0 }
                }
            }
        },
        difficulties: {}
    };

    // --- CONSTRUIR CHART.JSON ---
    const chart = {};

    Object.keys(songGroup.charts).forEach(diff => {
        const diffData = songGroup.charts[diff];

        // Registrar la velocidad en el meta para esta dificultad
        meta.difficulties[diff] = {
            scrollSpeed: diffData.speed || baseData.speed || 1.0
        };

        // Convertir las notas (De mustHitSection a p: 'pl' / 'op')
        const newNotes = [];
        diffData.notes.forEach(section => {
            const mustHit = section.mustHitSection;
            section.sectionNotes.forEach(note => {
                const time = note[0];
                const direction = note[1];
                const length = note[2];

                const isPlayer = mustHit ? (direction < 4) : (direction >= 4);

                newNotes.push({
                    t: time,
                    d: direction % 4,
                    l: length,
                    p: isPlayer ? "pl" : "op"
                });
            });
        });

        // Ordenar cronológicamente
        newNotes.sort((a, b) => a.t - b.t);
        chart[diff] = newNotes;
    });

    // Guardar los 2 archivos finales
    const metaFile = path.join(outputDir, `${songName}-meta.json`);
    const chartFile = path.join(outputDir, `${songName}-chart.json`);

    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
    fs.writeFileSync(chartFile, JSON.stringify(chart, null, 2));

    console.log(`[OK] Canción exportada: '${songName}' -> Creados -meta.json y -chart.json (Dificultades: ${Object.keys(songGroup.charts).join(', ')})`);
});

console.log("¡Conversión completada! Revisa la carpeta 'output'.");
