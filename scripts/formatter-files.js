const fs = require('fs').promises;
const path = require('path');
const prettier = require('prettier');

// Definimos la ruta objetivo (relativa a donde se ejecute el script)
const TARGET_DIR = path.resolve(__dirname, '../public/engine/src/');

// Extensiones de archivo que Prettier procesará
const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.json', '.css', '.html', '.md'];

async function formatFiles(directory) {
    try {
        // Leemos el contenido del directorio
        const entries = await fs.readdir(directory, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                // Si es una subcarpeta, entramos recursivamente
                await formatFiles(fullPath);
            } else if (entry.isFile()) {
                // Si es un archivo, verificamos si su extensión está soportada
                const ext = path.extname(entry.name);
                if (SUPPORTED_EXTENSIONS.includes(ext)) {
                    await formatSingleFile(fullPath);
                }
            }
        }
    } catch (error) {
        console.error(`🚨 Error al leer el directorio ${directory}:`, error.message);
    }
}

async function formatSingleFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');

        // Resuelve la configuración local de Prettier (ej. si tienes un archivo .prettierrc)
        const config = await prettier.resolveConfig(filePath) || {};
        
        // Es vital pasar el filepath para que Prettier infiera el parser correcto (ej. babel para .js)
        config.filepath = filePath;

        const formattedContent = await prettier.format(content, config);

        // Solo sobrescribimos el archivo si hubo cambios reales
        if (content !== formattedContent) {
            await fs.writeFile(filePath, formattedContent, 'utf8');
            console.log(`✅ Formateado: ${filePath}`);
        } else {
            console.log(`➖ Sin cambios: ${filePath}`);
        }
    } catch (error) {
        console.error(`❌ Error al formatear ${filePath}:`, error.message);
    }
}

// Ejecución principal
console.log(`Iniciando el formateador en: ${TARGET_DIR}...\n`);

formatFiles(TARGET_DIR)
    .then(() => console.log('\n✨ Proceso de formateo finalizado.'))
    .catch(err => console.error('Error crítico:', err));