// src/funkin/play/UI/arrows/hold/logic.js

class HoldCoverLogic {
  constructor(scene) {
    this.scene = scene;
    this.covers = [];
    this.initCovers();
  }

  initCovers() {
    if (!this.scene.referee.strumlines) return;

    const strums = [
      ...this.scene.referee.strumlines.playerStrums.getChildren(),
      ...this.scene.referee.strumlines.opponentStrums.getChildren(),
    ];

    strums.forEach((strum) => {
      const cover = new window.HoldCover(this.scene, strum);
      if (cover.isValid) {
        this.covers.push(cover);
      }
    });
  }

  update(time, delta) {
    if (!this.scene.referee.sustainLogic) return;
    const activeSustains = this.scene.referee.sustainLogic.activeSustains;

    this.covers.forEach((cover) => {
      if (!cover.isValid) return;
      const strum = cover.strumTarget;

      const isHeld = activeSustains.some(
        (s) =>
          s.strumTarget === strum &&
          s.isBeingHeld &&
          !s.missedNote &&
          !s.isCompleted &&
          !s.isOut,
      );

      if (isHeld) {
        if (cover.currentState === "inactive" || cover.currentState === "end") {
          cover.playAnim("start");
        }
      } else {
        if (cover.currentState === "start" || cover.currentState === "hold") {
          cover.playAnim("end");
        }
      }

      // Llamamos a la sincronización con la lógica Flixel-izada
      cover.syncPos();
    });
  }
}

window.HoldCoverLogic = HoldCoverLogic;
