// src/utils/Controls.js
class Controls {
  static init() {
    // --- BLOQUEAR F1 A F12 DEL NAVEGADOR ---
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.keyCode >= 112 && e.keyCode <= 123) {
          e.preventDefault();
        }
      },
      { capture: true },
    );
    const defaultPC = {
      // UI navigation
      UI_UP: [38, 87],
      UI_DOWN: [40, 83],
      UI_LEFT: [37, 65],
      UI_RIGHT: [39, 68],
      // Player notes (1 slot)
      NOTE_UP: [38],
      NOTE_DOWN: [40],
      NOTE_LEFT: [37],
      NOTE_RIGHT: [39],
      // Player 2 notes (1 slot)
      P2_NOTE_UP: [87],
      P2_NOTE_DOWN: [83],
      P2_NOTE_LEFT: [65],
      P2_NOTE_RIGHT: [68],
      // General actions
      ACCEPT: [13, 32, 90], // ENTER, SPACE, Z
      BACK: [27, 8, 88],
      PAUSE: [13, 27, 80],
      DEBUGG: [55, 103, 114],
      // Global volume
      VOL_UP: [187, 107],
      VOL_DOWN: [189, 109],
      VOL_MUTE: [48, 96],
      DEV_TOOLS: [114],
    };
    const defaultGamepad = {
      UI_UP: [12],
      UI_DOWN: [13],
      UI_LEFT: [14],
      UI_RIGHT: [15],
      NOTE_UP: [12, 3],
      NOTE_DOWN: [13, 0],
      NOTE_LEFT: [14, 2],
      NOTE_RIGHT: [15, 1],
      P2_NOTE_UP: [12, 3],
      P2_NOTE_DOWN: [13, 0],
      P2_NOTE_LEFT: [14, 2],
      P2_NOTE_RIGHT: [15, 1],
      ACCEPT: [0, 9],
      BACK: [1],
      PAUSE: [9],
      DEBUGG: [],
      VOL_UP: [],
      VOL_DOWN: [],
      VOL_MUTE: [],
      DEV_TOOLS: [],
    };
    this.PCKeyBinds = {};
    const savedGP = JSON.parse(localStorage.getItem("genesis_controls_gp"));
    this.GamepadBinds = savedGP || defaultGamepad;
    Object.keys(defaultPC).forEach((action) => {
      // Restauramos a "ctrl_accion" para sincronía perfecta con OptionsStorage
      const storageId = `ctrl_${action.toLowerCase()}`;
      const savedStr = localStorage.getItem(storageId);

      if (savedStr !== null) {
        try {
          this.PCKeyBinds[action] = JSON.parse(savedStr);
        } catch (e) {
          this.PCKeyBinds[action] = defaultPC[action];
        }
      } else {
        this.PCKeyBinds[action] = defaultPC[action];
      }
      Controls[action] = (e) => {
        if (!e) return false;
        if (e.keyCode !== undefined) {
          return this.PCKeyBinds[action].includes(e.keyCode);
        }
        let btnIndex = e.button !== undefined ? e.button : e.index;
        if (btnIndex !== undefined && this.GamepadBinds[action]) {
          return this.GamepadBinds[action].includes(btnIndex);
        }
        return false;
      };
    });
  }
}
window.Controls = Controls;
Controls.init();