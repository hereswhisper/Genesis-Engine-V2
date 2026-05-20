// public/engine/src/utils/HotReload.js

class HotReload {
    constructor() {
        // Escenas superpuestas, de sistema o globales que NO deben ser reiniciadas
        this.ignoredScenes = ['HUDScene', 'ToastScene', 'TransitionScene'];

        // Iniciar el listener de eventos
        this.init();
    }

    init() {
        // Escuchar la pulsación de F5 (o el atajo que prefieras) para recargar
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F5') {
                e.preventDefault(); // Evita recargar toda la página web/ventana de Neutralino
                this.reloadCurrentScenes();
            }
        });
    }

    reloadCurrentScenes() {
        if (!window.game || !window.game.scene) {
            console.warn("[HotReload] Motor de Phaser no inicializado aún.");
            return;
        }

        // Obtener un array de todas las escenas que están activas en este momento
        const activeScenes = window.game.scene.scenes.filter(scene => scene.scene.isActive());

        activeScenes.forEach(sceneObj => {
            const key = sceneObj.scene.key;

            // Verificamos si la escena NO está en el array de ignoradas
            if (!this.ignoredScenes.includes(key)) {
                console.log(`[HotReload] Recargando escena: ${key}`);

                // .restart() reinicia el ciclo de vida (init, preload, create) de la escena.
                // Esto es ideal para refrescar los assets y reiniciar la lógica desde cero.
                sceneObj.scene.restart();

                // Notificación visual opcional usando tu ToastManager si está disponible
                if (window.Toast) {
                    window.Toast.alert(`Recargando escena: ${key}`, 'suggestion');
                }
            } else {
                console.log(`[HotReload] Ignorando escena global/UI protegida: ${key}`);
            }
        });
    }
}

// Inicializar y exponer de manera global
window.hotReload = new HotReload();
