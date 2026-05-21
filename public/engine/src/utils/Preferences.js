/**
 * @class Preferences
 * @description Global class to manage and persist user preferences and settings across the game.
 */
class Preferences {
    /**
     * @type {boolean}
     * @description Allows the player to press inputs when no notes are present without penalizing their health.
     */
    static ghostTapping = false;

    /**
     * @type {boolean}
     * @description Reverses the note scroll direction from bottom-to-top (false) to top-to-bottom (true).
     */
    static downscroll = false;

    /**
     * @type {string}
     * @description Configures the strumline layout on the screen.
     * Options: 'none' (default), 'mini' (opponent minimized), or 'split' (P1 and P2 split on sides).
     */
    static middleScroll = 'none'; // none, mini & split

    /**
     * @type {boolean}
     * @description Lets the AI automatically play the charts for the player.
     */
    static botplay = false;

    /**
     * @type {boolean}
     * @description Enables local multiplayer mode where two players can play together on the same device.
     */
    static twoPlayers = false ;

    /**
     * @type {boolean}
     * @description Enables visual splash effects when hitting a 'Sick' rating.
     */
    static noteSplashes = true;

    /**
     * @type {boolean}
     * @description Allows the opponent's strumline arrows to glow when they hit a note.
     */
    static opponentGlow = true;

    /**
     * @type {boolean}
     * @description Hides the opponent's strumline (receptors) completely.
     */
    static hideOpStrums = false;

    /**
     * @type {boolean}
     * @description Hides the opponent's incoming notes completely.
     */
    static hideOpNotes = false;

    /**
     * @type {boolean}
     * @description Swaps the player's side with the opponent's side (Player acts as the enemy).
     */
    static playerEnemy = false;

    /**
     * @type {string}
     * @description Defines how the pop-up ratings (Sick, Good, etc.) animate when they appear.
     * Options: 'default' (jumps and falls) or 'stackeable' (interrupts and destroys previous pop-up).
     */
    static popUpAnim = 'default'; // default & stackeable

    /**
     * @type {number[]}
     * @description Array representing the relative screen position for the pop-ups as percentages [X%, Y%].
     * For example, [50, 42] means 50% width (horizontal center) and 42% height (slightly above vertical center).
     */
    static popUpPos = [50, 42];

    /**
     * @type {boolean}
     * @description Shows or hides the opponent's rating and combo pop-ups in two-player mode.
     */
    static showOpPopUp = true;

    /**
     * @method init
     * @description Initializes preferences by loading them from localStorage.
     * Uses default values if they do not exist.
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

        const getArray = (key, defaultVal) => {
            const val = localStorage.getItem(key);
            try {
                return val !== null ? JSON.parse(val) : defaultVal;
            } catch (e) {
                return defaultVal;
            }
        };

        // Loading basic mechanics
        this.ghostTapping = getBool('genesis_ghost_tapping', true);
        this.downscroll = getBool('genesis_downscroll', false);
        this.middleScroll = getString('genesis_middle_scroll', 'none');
        this.botplay = getBool('genesis_botplay', false);
        this.twoPlayers = getBool('genesis_2players', false);

        // Loading UI preferences
        this.noteSplashes = getBool('genesis_note_splashes', true);
        this.opponentGlow = getBool('genesis_opponent_glow', true);
        this.hideOpStrums = getBool('genesis_hide_op_strums', false);
        this.hideOpNotes = getBool('genesis_hide_op_notes', false);
        this.playerEnemy = getBool('genesis_player_enemy', false);

        // Loading rating pop-up settings
        this.popUpAnim = getString('genesis_popup_anim', 'default');
        this.popUpPos = getArray('genesis_popup_pos', [50, 42]);
        this.showOpPopUp = getBool('genesis_show_op_popup', true);
    }

    /**
     * @method save
     * @description Saves the current state of static variables to localStorage.
     */
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
    }
}

// Lo exponemos globalmente y lo autoinicializamos
window.Preferences = Preferences;
window.Preferences.init();
