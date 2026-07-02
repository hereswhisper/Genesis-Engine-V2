// src/funkin/play/UI/pause/PauseMenuLogic.js
class PauseMenuLogic {
  constructor(scene) {
    this.scene = scene;

    // Inicializar Lane Opacity por defecto en preferencias si no existe
    if (window.Preferences && window.Preferences.laneOpacity === undefined) {
      window.Preferences.laneOpacity = 0.7;
    }

    // Estructura JSON solicitada que incluye datos de música automáticos
    this.menuStructure = {
      title: "main",
      music: {
        path: "breakfast.ogg",
        loop: true,
        id: "pause_music_" + Math.floor(Math.random() * 100000),
      },
      options: [
        { label: "RESUME", action: "resume" },
        { label: "RESTART SONG", action: "restart" },
        {
          label: "QUICK OPTIONS",
          action: "submenu",
          submenu: {
            title: "quick",
            options: [
              {
                label: "BOTPLAY",
                action: "toggle",
                type: "check",
                pref: "botplay",
              },
              {
                label: "GHOST TAPPING",
                action: "toggle",
                type: "check",
                pref: "ghostTapping",
              },
              {
                label: "DOWNSCROLL",
                action: "toggle",
                type: "check",
                pref: "downscroll",
              },
              {
                label: "MIDDLESCROLL",
                action: "selector",
                pref: "middleScroll",
                options: ["none", "split", "mini"],
              },
              {
                label: "LANE OPACITY",
                action: "selector",
                pref: "laneOpacity",
                options: ["0.0", "0.2", "0.4", "0.6", "0.8", "1.0"],
              },
            ],
          },
        },
        { label: "EXIT TO MENU", action: "exit" },
      ],
    };

    this.history = [];
    this.formatMenu(this.menuStructure, true);

    this.currentMenu = this.menuStructure;
    this.curSelected = this.currentMenu.lastSelected;
  }

  formatMenu(menu, isRoot) {
    menu.lastSelected = 0;
    menu.options.forEach((opt) => {
      if (opt.action === "submenu" && opt.submenu) {
        if (!opt.label.endsWith(">")) {
          opt.label += " >";
        }
        this.formatMenu(opt.submenu, false);
      }
    });

    if (!isRoot) {
      const hasBack = menu.options.find((o) => o.action === "back");
      if (!hasBack) {
        menu.options.push({ label: "< BACK", action: "back" });
      }
    }
  }

  navigateForward(submenu) {
    this.history.push(this.currentMenu);
    this.currentMenu = submenu;
    this.curSelected = this.currentMenu.lastSelected;
    return 1;
  }

  navigateBack() {
    if (this.history.length === 0) {
      this.executeAction("resume");
      return 0;
    }
    this.currentMenu = this.history.pop();
    this.curSelected = this.currentMenu.lastSelected;
    return -1;
  }

  changeSelection(change) {
    this.curSelected += change;
    const max = this.currentMenu.options.length;

    if (this.curSelected < 0) this.curSelected = max - 1;
    if (this.curSelected >= max) this.curSelected = 0;

    this.currentMenu.lastSelected = this.curSelected;
  }

  togglePreference(prefKey) {
    if (window.Preferences && window.Preferences[prefKey] !== undefined) {
      window.Preferences[prefKey] = !window.Preferences[prefKey];

      if (typeof window.Preferences.save === "function") {
        window.Preferences.save();
      } else {
        localStorage.setItem(`genesis_${prefKey}`, window.Preferences[prefKey]);
      }
      return window.Preferences[prefKey];
    }
    return false;
  }

  changeSelectorPreference(prefKey, optionsArray, change) {
    if (window.Preferences && window.Preferences[prefKey] !== undefined) {
      let currentVal = window.Preferences[prefKey];
      let currentValStr = String(currentVal);

      let idx = optionsArray.indexOf(currentValStr);
      if (idx === -1) {
        idx = optionsArray.findIndex(
          (opt) => parseFloat(opt) === parseFloat(currentVal),
        );
      }
      if (idx === -1) idx = 0;

      idx += change;
      if (idx < 0) idx = optionsArray.length - 1;
      if (idx >= optionsArray.length) idx = 0;

      let selectedVal = optionsArray[idx];
      if (typeof currentVal === "number") {
        window.Preferences[prefKey] = parseFloat(selectedVal);
      } else {
        window.Preferences[prefKey] = selectedVal;
      }

      if (typeof window.Preferences.save === "function") {
        window.Preferences.save();
      } else {
        localStorage.setItem(`genesis_${prefKey}`, window.Preferences[prefKey]);
      }
      return selectedVal;
    }
    return optionsArray[0];
  }

  executeAction(actionStr, optionData = null) {
    this.scene.events.emit("pauseAction", actionStr, optionData);
  }
}
window.PauseMenuLogic = PauseMenuLogic;
