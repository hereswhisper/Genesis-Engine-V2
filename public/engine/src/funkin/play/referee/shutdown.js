// src/funkin/play/referee/shutdown.js

class PlayRefereeShutdown {
    static execute(referee) {
        if (!referee) return;

        console.log("[Referee] Iniciando protocolo de apagado...");

        // 1. Detener Audio
        if (referee.song && typeof referee.song.shutdown === 'function') {
            referee.song.shutdown();
        }

        // 2. Limpiar Lógicas y Eventos
        if (referee.strumlines && typeof referee.strumlines.shutdown === 'function') referee.strumlines.shutdown();
        if (referee.notesLogic && typeof referee.notesLogic.shutdown === 'function') referee.notesLogic.shutdown();
        if (referee.sustainLogic && typeof referee.sustainLogic.shutdown === 'function') referee.sustainLogic.shutdown();

        if (referee.bot && typeof referee.bot.shutdown === 'function') referee.bot.shutdown();
        if (referee.countdown && typeof referee.countdown.shutdown === 'function') referee.countdown.shutdown();

        // 3. Limpiar Cámaras y Stage
        if (referee.cameras && typeof referee.cameras.shutdown === 'function') referee.cameras.shutdown();
        if (referee.stage && typeof referee.stage.shutdown === 'function') referee.stage.shutdown();

        // 4. Limpiar Módulos de Interfaz
        if (referee.ratingLogic && typeof referee.ratingLogic.shutdown === 'function') referee.ratingLogic.shutdown();
        if (referee.comboLogic && typeof referee.comboLogic.shutdown === 'function') referee.comboLogic.shutdown();

        // NUEVO: Protocolo de destrucción y remoción de eventos de vida
        if (referee.healthLogic && typeof referee.healthLogic.shutdown === 'function') referee.healthLogic.shutdown();

        console.log("[Referee] Escena limpiada correctamente.");
    }
}

window.PlayRefereeShutdown = PlayRefereeShutdown;
