// src/funkin/menu/options/components/input/InputKeybinder.js
class InputKeybinder {
  constructor(parent) {
    this.parent = parent;
    this.scene = parent.scene;
  }
  startBinding(action, slotIndex) {
    const p = this.parent;
    this.cancelBinding();
    p.isBinding = true;
    p.bindingAction = action;
    p.bindingSlot = slotIndex;
    const box = p.domMenu.node.querySelector(`[id="k-${action}-${slotIndex}"]`);
    if (box) {
      box.classList.add("k-active");
      window.AlphabetRenderer.render(
        this.scene,
        box.querySelector("canvas"),
        "...",
        0.4,
      );
    }
  }
  cancelBinding() {
    const p = this.parent;
    p.isBinding = false;
    p.domMenu.node.querySelectorAll(".k-box").forEach((box) => {
      box.classList.remove("k-active");
      window.AlphabetRenderer.render(
        this.scene,
        box.querySelector("canvas"),
        this.keyCodeToString(parseInt(box.getAttribute("data-code")) || 0),
        0.4,
      );
    });
  }
  updateKeybindVisual(action, slot, code) {
    // 1. CHEQUEO DE RESTRICCIONES (No duplicados)
    const restrictedActions = [
      "NOTE_LEFT", "NOTE_DOWN", "NOTE_UP", "NOTE_RIGHT",
      "P2_NOTE_LEFT", "P2_NOTE_DOWN", "P2_NOTE_UP", "P2_NOTE_RIGHT",
      "PAUSE", "VOL_UP", "VOL_DOWN", "VOL_MUTE", "DEV_TOOLS"
    ];
    if (code !== 0 && restrictedActions.includes(action)) {
      for (let rAction of restrictedActions) {
        const item = this.parent.currentOptions.find(i => i.options.action === rAction);
        if (item && item.options.defaults) {
          const existingSlot = item.options.defaults.indexOf(code);
          if (existingSlot !== -1 && (rAction !== action || existingSlot !== slot)) {
            return false; // Error: Tecla duplicada
          }
        }
      }
    }
    // 2. APLICACIÓN VISUAL Y GUARDADO
    const box = this.parent.domMenu.node.querySelector(
      `[id="k-${action}-${slot}"]`,
    );
    if (box) {
      box.setAttribute("data-code", code);
      window.AlphabetRenderer.render(
        this.scene,
        box.querySelector("canvas"),
        this.keyCodeToString(code),
        0.4,
      );
      // GUARDADO EN STORAGE GLOBAL
      const item = this.parent.currentOptions.find(
        (i) => i.options.action === action,
      );
      if (item) {
        if (!item.options.defaults) item.options.defaults = [];
        item.options.defaults[slot] = code;
        
        // Guardado clásico para OptionsUI
        window.OptionsStorage.save(item.id, "keybind", item.options.defaults);
        
        // FIX: Forzamos guardado directo con la etiqueta exacta que usa Controls.js al iniciar
        localStorage.setItem(`genesis_bind_${action}`, JSON.stringify(item.options.defaults));
        
        if (window.Controls && window.Controls.PCKeyBinds) {
          window.Controls.PCKeyBinds[action] = item.options.defaults;
        }
      }
    }
    return true; // Éxito
  }
  keyCodeToString(code) {
    if (!code || code === 0) return "NONE";
    const map = {
      8: "BACKSPACE",
      9: "TAB",
      13: "ENTER",
      16: "SHIFT",
      17: "CTRL",
      18: "ALT",
      20: "CAPS",
      27: "ESC",
      32: "SPACE",
      37: "LEFT",
      38: "UP",
      39: "RIGHT",
      40: "DOWN",
      48: "0",
      49: "1",
      50: "2",
      51: "3",
      52: "4",
      53: "5",
      54: "6",
      55: "7",
      56: "8",
      57: "9",
      107: "NUM +",
      109: "NUM -",
      187: "+",
      189: "-",
    };
    if (map[code]) return map[code];
    if (code >= 65 && code <= 90) return String.fromCharCode(code);
    if (code >= 112 && code <= 123) return `F${code - 111}`;
    return `KEY ${code}`;
  }
}
window.InputKeybinder = InputKeybinder;