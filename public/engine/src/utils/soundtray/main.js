// src/utils/soundtray/main.js

class SoundTray {
  static init() {
    if (!window.HUD || typeof Controls === "undefined") {
      requestAnimationFrame(() => SoundTray.init());
      return;
    }

    this.scene = window.HUD;

    // Evita que Phaser pause todo el juego/audio al cambiar de ventana
    this.scene.game.sound.pauseOnBlur = false;

    let savedVol = localStorage.getItem("genesis_vol");
    this.vol = savedVol !== null ? parseFloat(savedVol) : 0.5;
    this.scene.sound.volume = this.vol;

    // Estado del foco
    this.isFocused = true;

    this.scene.load.audio(
      "snd_volup",
      Path.sounds + "menu/soundtray/Volup.ogg",
    );
    this.scene.load.audio(
      "snd_volmax",
      Path.sounds + "menu/soundtray/VolMAX.ogg",
    );
    this.scene.load.audio(
      "snd_voldown",
      Path.sounds + "menu/soundtray/Voldown.ogg",
    );
    this.scene.load.start();

    window.addEventListener("keydown", (e) => this.handleKey(e));

    // Eventos de pérdida y recuperación de foco
    window.addEventListener("blur", () => this.onBlur());
    window.addEventListener("focus", () => this.onFocus());
  }

  static onBlur() {
    this.isFocused = false;
    if (!this.scene.sound.mute) {
      // Reduce el volumen a un 20% del actual
      this.scene.sound.volume = this.vol * 0.2;
    }
  }

  static onFocus() {
    this.isFocused = true;
    if (!this.scene.sound.mute) {
      // Restaura el volumen configurado
      this.scene.sound.volume = this.vol;
    }
  }

  static handleKey(e) {
    if (Controls.VOL_UP(e)) this.change(0.1);
    if (Controls.VOL_DOWN(e)) this.change(-0.1);
    if (Controls.VOL_MUTE(e)) {
      this.scene.sound.mute = !this.scene.sound.mute;

      // Si desmutean estando fuera de foco, mantenemos el 20%
      if (!this.scene.sound.mute && !this.isFocused) {
        this.scene.sound.volume = this.vol * 0.2;
      }
    }
  }

  static change(amount) {
    if (this.scene.sound.mute) this.scene.sound.mute = false;

    if (amount > 0) {
      if (this.vol >= 1.0) this.vol = 1.2;
      else this.vol += 0.1;
    } else {
      if (this.vol >= 1.2) this.vol = 0.9;
      else this.vol -= 0.1;
    }

    this.vol = Math.max(0, Math.min(1.2, parseFloat(this.vol.toFixed(1))));

    // Aplicar atenuación si se cambia el volumen estando fuera de la ventana
    if (this.isFocused) {
      this.scene.sound.volume = this.vol;
    } else {
      this.scene.sound.volume = this.vol * 0.2;
    }

    localStorage.setItem("genesis_vol", this.vol);

    if (this.vol >= 1.2) {
      this.scene.sound.play("snd_volmax");
    } else if (amount > 0) {
      this.scene.sound.play("snd_volup");
    } else {
      this.scene.sound.play("snd_voldown");
    }
  }
}

SoundTray.init();
