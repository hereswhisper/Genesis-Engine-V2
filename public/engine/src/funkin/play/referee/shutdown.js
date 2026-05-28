// src/funkin/play/referee/shutdown.js

class PlayRefereeShutdown {
    static execute(referee) {
        // Validamos que 'referee' exista correctamente
        if (!referee) return;

        console.log("%c REFEREE %c Iniciando protocolo de apagado...", 'background: #4a148c; color: white;', 'color: unset;');

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

        // Protocolo de destrucción y remoción de eventos de vida
        if (referee.healthLogic && typeof referee.healthLogic.shutdown === 'function') referee.healthLogic.shutdown();

        // Limpiar el Score y sus eventos globales de teclado
        if (referee.scoreLogic && typeof referee.scoreLogic.shutdown === 'function') referee.scoreLogic.shutdown();

        console.log("%c REFEREE %c Escena limpiada correctamente.", 'background: #4a148c; color: white;', 'color: unset;');
    }
}

window.PlayRefereeShutdown = PlayRefereeShutdown;
