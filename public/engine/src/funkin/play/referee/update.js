// src/funkin/play/referee/update.js

window.PlayRefereeUpdate = class PlayRefereeUpdate {
    static execute(referee, time, delta) {
        // Actualizamos entornos gráficos base para que la pantalla no se congele
        if (referee.cameras && referee.cameras.update) referee.cameras.update(time, delta);
        if (referee.skins && referee.skins.update) referee.skins.update(time, delta);
        if (referee.stage && referee.stage.update) referee.stage.update(time, delta);

        // Si estamos esperando a otro jugador en línea, bloqueamos el resto de las actualizaciones jugables
        if (window.isMultiplayerWaiting) {
            if (referee.waitingLogic && referee.waitingLogic.update) referee.waitingLogic.update(time, delta);
            return; // Abortar resto de las actualizaciones
        }

        if (referee.song && referee.song.update) referee.song.update(time, delta);

        // Actualizamos lógicas de gameplay
        if (referee.strumlines && referee.strumlines.update) referee.strumlines.update(time, delta);
        if (referee.notesLogic && referee.notesLogic.update) referee.notesLogic.update(time, delta);
        if (referee.sustainLogic && referee.sustainLogic.update) referee.sustainLogic.update(time, delta);
        if (referee.holdCoverLogic && referee.holdCoverLogic.update) referee.holdCoverLogic.update(time, delta);

        // Pop-ups y Efectos
        if (referee.ratingLogic && referee.ratingLogic.update) referee.ratingLogic.update(time, delta);
        if (referee.comboLogic && referee.comboLogic.update) referee.comboLogic.update(time, delta);
        if (referee.splashLogic && referee.splashLogic.update) referee.splashLogic.update(time, delta);
        if (referee.splash && referee.splash.update) referee.splash.update(time, delta);

        // Ejecución de actualización de barra de vida y Puntuación
        if (referee.healthLogic && referee.healthLogic.update) referee.healthLogic.update(time, delta);
        if (referee.scoreLogic && referee.scoreLogic.update) referee.scoreLogic.update(time, delta);

        if (referee.bot && referee.bot.update) referee.bot.update(time, delta);
        if (referee.countdown && referee.countdown.update) referee.countdown.update(time, delta);
    }
};
