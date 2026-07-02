class ToastManager {
  constructor() {
    this.queue = [];
    this.scene = null;
  }

  alert(message, type = "default") {
    console.log(`[Toast:${type.toUpperCase()}] ${message}`);
    if (this.scene) {
      this.scene.showToast(message, type);
    } else {
      this.queue.push({ message, type });
    }
  }
}

window.Toast = new ToastManager();

class ToastScene extends Phaser.Scene {
  constructor() {
    super({ key: "ToastScene" });
    this.toasts = [];
    this.maxToasts = 5;
    this.padding = { x: 16, y: 12 };
    this.margin = { right: 20, bottom: 20 };
    this.spacing = 10;
  }

  create() {
    window.Toast.scene = this;
    this.scene.bringToTop();

    // Procesar pendientes si se llamó antes de crearse la escena
    window.Toast.queue.forEach((t) => this.showToast(t.message, t.type));
    window.Toast.queue = [];
  }

  showToast(message, type) {
    this.scene.bringToTop(); // Asegura que siempre esté por encima de otras escenas

    const config = this.getConfig(type);

    const msgText = this.add
      .text(45, 0, message, {
        fontFamily: "vcr",
        fontSize: "16px",
        color: config.textColor,
        wordWrap: { width: 250 },
      })
      .setOrigin(0, 0.5);

    // Renderizado del icono de FontAwesome usando código unicode
    const iconText = this.add
      .text(20, 0, config.icon, {
        fontFamily:
          '"Font Awesome 6 Free", "Font Awesome 5 Free", "fa-solid", "FontAwesome"',
        fontStyle: "900",
        fontSize: "20px",
        color: config.textColor,
      })
      .setOrigin(0.5, 0.5);

    const textWidth = msgText.width;
    const textHeight = msgText.height;
    const width = Math.max(250, textWidth + 65 + this.padding.x);
    const height = Math.max(50, textHeight + this.padding.y * 2);

    const bg = this.add.graphics();
    bg.fillStyle(config.bg, 1);
    bg.fillRoundedRect(0, -height / 2, width, height, 8);
    bg.lineStyle(3, config.border, 1);
    bg.strokeRoundedRect(0, -height / 2, width, height, 8);

    const container = this.add.container(
      this.scale.width + 300,
      this.scale.height - this.margin.bottom - height / 2,
      [bg, iconText, msgText],
    );
    container.toastHeight = height;

    // Desplazar anteriores hacia arriba
    this.toasts.forEach((t) => {
      if (t.active) {
        this.tweens.add({
          targets: t,
          y: t.y - height - this.spacing,
          duration: 300,
          ease: "Back.easeOut",
        });
      }
    });

    this.toasts.push(container);

    // Animación de entrada
    const targetX = this.scale.width - width - this.margin.right;
    this.tweens.add({
      targets: container,
      x: targetX,
      duration: 400,
      ease: "Back.easeOut",
    });

    if (this.toasts.length > this.maxToasts) {
      this.removeToast(this.toasts[0]);
    }

    this.time.delayedCall(4000, () => this.removeToast(container));
  }

  removeToast(toast) {
    if (!toast || !toast.active) return;
    const index = this.toasts.indexOf(toast);
    if (index > -1) this.toasts.splice(index, 1);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 20,
      duration: 300,
      onComplete: () => toast.destroy(),
    });
  }

  getConfig(type) {
    switch (type) {
      case "warning":
        return {
          bg: 0xffcc00,
          border: 0xcca300,
          icon: "\uf071",
          textColor: "#333333",
        }; // fa-triangle-exclamation
      case "error":
        return {
          bg: 0xff4d4d,
          border: 0xcc0000,
          icon: "\uf057",
          textColor: "#ffffff",
        }; // fa-circle-xmark
      case "suggestion":
        return {
          bg: 0x3399ff,
          border: 0x0066cc,
          icon: "\uf0eb",
          textColor: "#ffffff",
        }; // fa-lightbulb
      case "successfully":
        return {
          bg: 0x4caf50,
          border: 0x2e7d32,
          icon: "\uf058",
          textColor: "#ffffff",
        }; // fa-circle-check
      default:
        return {
          bg: 0x808080,
          border: 0x555555,
          icon: "\uf0f3",
          textColor: "#ffffff",
        }; // fa-bell
    }
  }
}

window.ToastScene = ToastScene;
// Iniciar en paralelo automáticamente para que sea persistente en todo el juego
window.game.scene.add("ToastScene", window.ToastScene, true);
