// src/utils/visuals/TransitionScene.js

class TransitionScene extends Phaser.Scene {
  constructor() {
    super({ key: "TransitionScene" });
  }

  create() {
    const gradientTexture = this.createGradientTexture();

    this.blackScreen = this.add
      .sprite(this.scale.width / 2, this.scale.height * 1.5, gradientTexture)
      .setOrigin(0.5)
      .setDepth(9999)
      .setAlpha(0);

    this.isTransitioning = false;
  }

  createGradientTexture() {
    const textureKey = "transitionGradient";
    if (this.textures.exists(textureKey)) return textureKey;

    const width = this.scale.width;
    const height = this.scale.height * 2;

    const canvas = this.textures.createCanvas(textureKey, width, height);
    const ctx = canvas.context;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.2, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(0.8, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    canvas.refresh();

    return textureKey;
  }

  startTransition(callingScene, nextScene) {
    // En lugar de hacer 'return' si está bloqueada, forzamos la animación
    // Esto evita el softlock si el booleano se quedó pegado en true.
    this.isTransitioning = true;
    this.scene.bringToTop();

    // Destruimos animaciones antiguas para que no interfieran
    this.tweens.killTweensOf(this.blackScreen);

    // Reseteamos posición y alpha siempre desde cero
    this.blackScreen.setAlpha(1);
    this.blackScreen.y = this.scale.height * 1.5;

    this.tweens.add({
      targets: this.blackScreen,
      y: this.cameras.main.centerY,
      duration: 500,
      ease: "Power2.Out",
      onComplete: () => {
        if (callingScene && callingScene.scene) {
          callingScene.scene.stop();
        }

        this.scene.launch(nextScene);

        this.time.delayedCall(300, () => {
          this.tweens.add({
            targets: this.blackScreen,
            y: -this.cameras.main.height,
            duration: 500,
            ease: "Power2.In",
            onComplete: () => {
              this.blackScreen.y = this.cameras.main.height * 1.5;
              this.blackScreen.setAlpha(0);
              this.isTransitioning = false;
            },
          });
        });
      },
    });
  }
}

// Registro nativo en el motor
window.game.scene.add("TransitionScene", TransitionScene);

// API Global corregida
window.transitionTo = function (currentScene, targetSceneName) {
  if (!currentScene || !currentScene.scene) {
    console.warn("transitionTo: Faltó pasar 'this' como primer parámetro.");
    return;
  }

  let transitionScene = currentScene.scene.get("TransitionScene");

  if (transitionScene) {
    // Si la escena de transición está dormida o inactiva, la despertamos
    if (currentScene.scene.isSleeping("TransitionScene")) {
      currentScene.scene.wake("TransitionScene");
    } else if (!currentScene.scene.isActive("TransitionScene")) {
      currentScene.scene.launch("TransitionScene");
    }

    // Ejecutamos la transición. Si el blackScreen aún no se crea, damos un respiro
    if (!transitionScene.blackScreen) {
      currentScene.time.delayedCall(50, () => {
        transitionScene.startTransition(currentScene, targetSceneName);
      });
    } else {
      transitionScene.startTransition(currentScene, targetSceneName);
    }
  } else {
    currentScene.scene.start(targetSceneName);
  }
};
