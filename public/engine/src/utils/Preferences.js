// src/utils/Preferences.js

class Preferences {
    // Definición de variables estáticas con sus valores por defecto
    static ghostTapping = false;
    static downscroll = false;
    static middleScroll = 'none';
    static botplay = false;
    static twoPlayers = false;
    static noteSplashes = true;
    static opponentGlow = true;
    static hideOpStrums = false;
    static hideOpNotes = false;
    static playerEnemy = true;

    /**
     * Inicializa las preferencias extrayéndolas del almacenamiento local.
     * Si no existen, mantiene los valores por defecto.
     */
    static init() {
        const getBool = (key, defaultVal) => {
            const val = localStorage.getItem(key);
            return val !== null ? val === 'true' : defaultVal;
        };

        const getString = (key, defaultVal) => {
            const val = localStorage.getItem(key);
            return val !== null ? val : defaultVal;
        };

        // Carga de datos
        this.ghostTapping = getBool('genesis_ghost_tapping', true);
        this.downscroll = getBool('genesis_downscroll', false);
        this.middleScroll = getString('genesis_middle_scroll', 'none');
        this.botplay = getBool('genesis_botplay', false);
        this.twoPlayers = getBool('genesis_2players', false);

        // Carga de nuevas preferencias
        this.noteSplashes = getBool('genesis_note_splashes', true);
        this.opponentGlow = getBool('genesis_opponent_glow', true);
        this.hideOpStrums = getBool('genesis_hide_op_strums', false);
        this.hideOpNotes = getBool('genesis_hide_op_notes', false);

        // Carga de playerEnemy
        this.playerEnemy = getBool('genesis_player_enemy', false);
    }

    /**
     * Guarda el estado actual de las variables estáticas en el almacenamiento local.
     */
    static save() {
        localStorage.setItem('genesis_ghost_tapping', this.ghostTapping);
        localStorage.setItem('genesis_downscroll', this.downscroll);
        localStorage.setItem('genesis_middle_scroll', this.middleScroll);
        localStorage.setItem('genesis_botplay', this.botplay);
        localStorage.setItem('genesis_2players', this.twoPlayers);

        // Guardado de nuevas preferencias
        localStorage.setItem('genesis_note_splashes', this.noteSplashes);
        localStorage.setItem('genesis_opponent_glow', this.opponentGlow);
        localStorage.setItem('genesis_hide_op_strums', this.hideOpStrums);
        localStorage.setItem('genesis_hide_op_notes', this.hideOpNotes);

        // Guardado de playerEnemy
        localStorage.setItem('genesis_player_enemy', this.playerEnemy);
    }
}

// Lo exponemos globalmente y lo autoinicializamos
window.Preferences = Preferences;
window.Preferences.init();
