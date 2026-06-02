// src/funkin/play/referee/shutdown.js

class PlayRefereeShutdown {
    static execute(referee) {
        if (!referee) return;
        console.log("%c REFEREE %c Iniciando protocolo de apagado...", 'background: #4a148c; color: white;', 'color: unset;');

        if (referee.song && typeof referee.song.shutdown === 'function') referee.song.shutdown();

        if (referee.strumlines && typeof referee.strumlines.shutdown === 'function') referee.strumlines.shutdown();
        if (referee.notesLogic && typeof referee.notesLogic.shutdown === 'function') referee.notesLogic.shutdown();
        if (referee.sustainLogic && typeof referee.sustainLogic.shutdown === 'function') referee.sustainLogic.shutdown();

        if (referee.bot && typeof referee.bot.shutdown === 'function') referee.bot.shutdown();
        if (referee.countdown && typeof referee.countdown.shutdown === 'function') referee.countdown.shutdown();

        if (referee.cameras && typeof referee.cameras.shutdown === 'function') referee.cameras.shutdown();
        if (referee.stage && typeof referee.stage.shutdown === 'function') referee.stage.shutdown();

        if (referee.ratingLogic && typeof referee.ratingLogic.shutdown === 'function') referee.ratingLogic.shutdown();
        if (referee.comboLogic && typeof referee.comboLogic.shutdown === 'function') referee.comboLogic.shutdown();
        if (referee.healthLogic && typeof referee.healthLogic.shutdown === 'function') referee.healthLogic.shutdown();
        if (referee.scoreLogic && typeof referee.scoreLogic.shutdown === 'function') referee.scoreLogic.shutdown();

        // Limpieza de lógica de Espera / Multiplayer
        if (referee.waitingLogic && typeof referee.waitingLogic.shutdown === 'function') referee.waitingLogic.shutdown();

        console.log("%c REFEREE %c Escena limpiada correctamente.", 'background: #4a148c; color: white;', 'color: unset;');
    }
}

window.PlayRefereeShutdown = PlayRefereeShutdown;
