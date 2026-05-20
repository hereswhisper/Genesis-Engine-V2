/**
 * HMR Server para Neutralino + Phaser
 * Uso: node hmr-server.js
 * Requiere: npm install ws chokidar
 */

const WebSocket = require('ws');
const chokidar  = require('chokidar');
const path      = require('path');
const fs        = require('fs');

// ─── Configuración ────────────────────────────────────────────────────────────
const PORT = 8082;

/**
 * Carpeta(s) a vigilar, relativas a donde está hmr-server.js.
 */
const WATCH_DIRS = ['public/engine/src'];

/**
 * Extensiones que disparan HMR.
 */
const WATCH_EXTS = ['.js'];

/**
 * Debounce en ms.
 */
const DEBOUNCE = 150;

/**
 * true  → polling (fiable en Windows, WSL, Docker)
 * false → eventos nativos del SO
 */
const USE_POLLING   = true;
const POLL_INTERVAL = 300;
// ──────────────────────────────────────────────────────────────────────────────

const BASE_DIR  = __dirname;
const watchDirs = WATCH_DIRS.map(d =>
    path.isAbsolute(d) ? d : path.join(BASE_DIR, d)
);

watchDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        console.warn(`[HMR] ADVERTENCIA: directorio no encontrado: ${dir}`);
    } else {
        console.log(`[HMR] Vigilando: ${dir}`);
    }
});

// ─── WebSocket ────────────────────────────────────────────────────────────────
const wss = new WebSocket.Server({ port: PORT });
console.log(`[HMR] Servidor WebSocket en ws://localhost:${PORT}`);

function broadcast(payload) {
    const msg    = JSON.stringify(payload);
    let enviados = 0;
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
            enviados++;
        }
    });
    if (enviados === 0) {
        console.warn('[HMR] Cambio detectado pero no hay clientes conectados.');
    }
}

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[HMR] Cliente conectado: ${ip}  (total: ${wss.clients.size})`);
    ws.send(JSON.stringify({ type: 'hmr-connected' }));
    ws.on('close', () => console.log(`[HMR] Cliente desconectado (total: ${wss.clients.size})`));
    ws.on('error', err => console.error('[HMR] WS error:', err));
});

wss.on('error', err => {
    if (err.code === 'EADDRINUSE') {
        console.error(`[HMR] ERROR: Puerto ${PORT} en uso. Cambia PORT en hmr-server.js`);
        process.exit(1);
    } else {
        console.error('[HMR] Error en el servidor WS:', err);
    }
});

// ─── Watcher ──────────────────────────────────────────────────────────────────
const timers = new Map();

function shouldWatch(filePath) {
    return WATCH_EXTS.includes(path.extname(filePath).toLowerCase());
}

function onFileChange(event, filePath) {
    if (!shouldWatch(filePath)) return;

    if (timers.has(filePath)) clearTimeout(timers.get(filePath));

    timers.set(filePath, setTimeout(() => {
        timers.delete(filePath);

        // Enviamos la ruta absoluta con slashes forward.
        // El cliente la usa con Neutralino.filesystem.readFile(),
        // que acepta rutas absolutas de disco — sin depender de cómo
        // Neutralino mapea las URLs HTTP.
        const absPath = filePath.replace(/\\/g, '/');

        console.log(`[HMR] ${event.toUpperCase()} → ${absPath}`);
        broadcast({ type: 'hmr-update', file: absPath });
    }, DEBOUNCE));
}

const watcher = chokidar.watch(watchDirs, {
    persistent:    true,
    ignoreInitial: true,
    usePolling:    USE_POLLING,
    interval:      POLL_INTERVAL,
    awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval:       50,
    },
    ignored: /(^|[\/\\])(\.git|node_modules|dist|build)[\/\\]/,
});

watcher.on('change', fp => onFileChange('change', fp));
watcher.on('add',    fp => onFileChange('add',    fp));

watcher.on('ready', () => {
    const watched = watcher.getWatched();
    const total   = Object.values(watched).reduce((n, files) => n + files.length, 0);
    console.log(`[HMR] Watcher listo. Archivos indexados: ${total}. Esperando cambios…`);
});

watcher.on('error', err => console.error('[HMR] Watcher error:', err));
