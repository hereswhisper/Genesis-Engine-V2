// src/funkin/play/UI/score/renderer.js

class ScoreRenderer {
  constructor(scene) {
    this.scene = scene;

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    const fontStyle = {
      fontFamily: '"VCR OSD Mono", "VCR", sans-serif',
      fontSize: "20px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
    };

    // Lado Izquierdo (P2 - Enemigo)
    // Posición X: 20 (cerca del borde izquierdo), Y: Centro de la pantalla (h * 0.5)
    // Origen: Izquierda (0), Centro (0.5). Alineación: izquierda.
    this.textP2 = this.scene.add
      .text(20, h * 0.5, "", { ...fontStyle, align: "left" })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(50)
      .setVisible(false);

    // Lado Derecho (P1 - Jugador Local)
    // Posición X: w - 20 (cerca del borde derecho), Y: Centro de la pantalla (h * 0.5)
    // Origen: Derecha (1), Centro (0.5). Alineación: derecha.
    this.textP1 = this.scene.add
      .text(w - 20, h * 0.5, "", { ...fontStyle, align: "right" })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(50)
      .setVisible(false);

    // COMPROBAR DOWNSCROLL PARA LA POSICIÓN Y
    const isDownscroll = window.Preferences
      ? window.Preferences.downscroll
      : false;

    // Si hay downscroll, margen superior (h * 0.05). Si no, margen inferior (h * 0.95).
    const singleY = isDownscroll ? h * 0.05 : h * 0.95;

    // Centro Abajo/Arriba (Modo un jugador normal)
    this.textSingle = this.scene.add
      .text(w * 0.5, singleY, "", { ...fontStyle, align: "center" })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(true);

    if (this.scene.referee.cameras) {
      this.scene.referee.cameras.add(this.textP2, "ui");
      this.scene.referee.cameras.add(this.textP1, "ui");
      this.scene.referee.cameras.add(this.textSingle, "ui");
    }
  }

  // Pantalla Dividida
  updateSplit(textRight, textLeft) {
    this.textSingle.setVisible(false);
    this.textP1.setVisible(true).setText(textRight);
    this.textP2.setVisible(true).setText(textLeft);
  }

  // Modo Normal / Un jugador
  updateSingle(text) {
    this.textP1.setVisible(false);
    this.textP2.setVisible(false);
    this.textSingle.setVisible(true).setText(text);
  }

  updateLayout() {
    const isDownscroll = window.Preferences
      ? window.Preferences.downscroll
      : false;
    const h = this.scene.scale.height;
    // Si hay downscroll, margen superior. Si no, margen inferior.
    const singleY = isDownscroll ? h * 0.05 : h * 0.95;
    this.textSingle.setY(singleY);
  }

  destroy() {
    if (this.textP1) this.textP1.destroy();
    if (this.textP2) this.textP2.destroy();
    if (this.textSingle) this.textSingle.destroy();
  }
}
window.ScoreRenderer = ScoreRenderer;
