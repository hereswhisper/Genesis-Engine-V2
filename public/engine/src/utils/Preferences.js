/**
 * @class Preferences
 * @description Global class to manage and persist user preferences and settings across the game.
 */
class Preferences {
    static ghostTapping = false;
    static downscroll = true;
    static middleScroll = 'none'; // none, mini & split
    static botplay = true;
    static twoPlayers = false;
    static noteSplashes = true;
    static opponentGlow = true;
    static hideOpStrums = false;
    static hideOpNotes = false;
    static playerEnemy = false;
    static popUpAnim = 'default'; // default & stackeable
    static popUpPos = [50, 42];
    static showOpPopUp = true;

    // NUEVAS PREFERENCIAS DE AUDIO PARA LOS FALLOS (MISS)
    static muteMissNote = false;
    static muteMissNoteEnemy = false;

    /**
     * @type {string[]}
     * @description Define el orden y los elementos que se muestran en el texto del score.
     */
    static scoreFormat = ['score', 'rating', 'accuracy', 'misses', 'combo', 'maxCombo', 'cps'];

    static init() {
        const getBool = (key, defaultVal) => {
            const val = localStorage.getItem(key);
            return val !== null ? val === 'true' : defaultVal;
        };

        const getString = (key, defaultVal) => {
            const val = localStorage.getItem(key);
            return val !== null ? val : defaultVal;
        };

        const getArray = (key, defaultVal) => {
            const val = localStorage.getItem(key);
            try {
                return val !== null ? JSON.parse(val) : defaultVal;
            } catch (e) {
                return defaultVal;
            }
        };

        this.ghostTapping = getBool('genesis_ghost_tapping', this.ghostTapping);
        this.downscroll = getBool('genesis_downscroll', this.downscroll);
        this.middleScroll = getString('genesis_middle_scroll', this.middleScroll);
        this.botplay = getBool('genesis_botplay', this.botplay);
        this.twoPlayers = getBool('genesis_2players', this.twoPlayers);

        this.noteSplashes = getBool('genesis_note_splashes', this.noteSplashes);
        this.opponentGlow = getBool('genesis_opponent_glow', this.opponentGlow);
        this.hideOpStrums = getBool('genesis_hide_op_strums', this.hideOpStrums);
        this.hideOpNotes = getBool('genesis_hide_op_notes', this.hideOpNotes);
        this.playerEnemy = getBool('genesis_player_enemy', this.playerEnemy);

        this.popUpAnim = getString('genesis_popup_anim', this.popUpAnim);
        this.popUpPos = getArray('genesis_popup_pos', this.popUpPos);
        this.showOpPopUp = getBool('genesis_show_op_popup', this.showOpPopUp);

        // Cargar las nuevas preferencias de sonido
        this.muteMissNote = getBool('genesis_mute_miss_note', this.muteMissNote);
        this.muteMissNoteEnemy = getBool('genesis_mute_miss_note_enemy', this.muteMissNoteEnemy);

        this.scoreFormat = getArray('genesis_score_format', this.scoreFormat);
    }

    static save() {
        localStorage.setItem('genesis_ghost_tapping', this.ghostTapping);
        localStorage.setItem('genesis_downscroll', this.downscroll);
        localStorage.setItem('genesis_middle_scroll', this.middleScroll);
        localStorage.setItem('genesis_botplay', this.botplay);
        localStorage.setItem('genesis_2players', this.twoPlayers);

        localStorage.setItem('genesis_note_splashes', this.noteSplashes);
        localStorage.setItem('genesis_opponent_glow', this.opponentGlow);
        localStorage.setItem('genesis_hide_op_strums', this.hideOpStrums);
        localStorage.setItem('genesis_hide_op_notes', this.hideOpNotes);
        localStorage.setItem('genesis_player_enemy', this.playerEnemy);

        localStorage.setItem('genesis_popup_anim', this.popUpAnim);
        localStorage.setItem('genesis_popup_pos', JSON.stringify(this.popUpPos));
        localStorage.setItem('genesis_show_op_popup', this.showOpPopUp);

        // Guardar las nuevas preferencias de sonido
        localStorage.setItem('genesis_mute_miss_note', this.muteMissNote);
        localStorage.setItem('genesis_mute_miss_note_enemy', this.muteMissNoteEnemy);

        localStorage.setItem('genesis_score_format', JSON.stringify(this.scoreFormat));
    }
}

window.Preferences = Preferences;
window.Preferences.init();
