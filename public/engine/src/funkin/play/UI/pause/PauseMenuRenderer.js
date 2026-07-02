// src/funkin/play/UI/pause/PauseMenuRenderer.js
class PauseMenuRenderer {
  constructor(scene) {
    this.scene = scene;
    this.menuItemsText = [];
    this.transitioningOut = [];
  }

  buildMenu(options, selectedIndex, direction = 0) {
    const oldItems = this.menuItemsText;
    this.transitioningOut.push(...oldItems);

    oldItems.forEach((item) => {
      item.targetOffsetX =
        direction === 1 ? -this.scene.scale.width : this.scene.scale.width;

      const targetsToTween = item.checkbox ? [item, item.checkbox] : item;

      this.scene.tweens.add({
        targets: targetsToTween,
        alpha: 0,
        duration: 350,
        onComplete: () => {
          item.destroy();
          if (item.checkbox) item.checkbox.destroy();
          this.transitioningOut = this.transitioningOut.filter(
            (i) => i !== item,
          );
        },
      });
    });

    this.menuItemsText = [];

    options.forEach((opt, i) => {
      let startXOffset = 0;
      if (direction === 1) startXOffset = this.scene.scale.width;
      else if (direction === -1) startXOffset = -this.scene.scale.width;

      let displayLabel = opt.label;
      if (opt.action === "selector") {
        const val = window.Preferences
          ? window.Preferences[opt.pref]
          : opt.options[0];
        displayLabel = `${opt.label} <${String(val).toUpperCase()}>`;
      }

      let alphabet = new window.Alphabet(
        this.scene,
        0,
        0,
        displayLabel,
        true,
        1.0,
      );
      alphabet.isMenuItem = true;
      alphabet.targetY = i - selectedIndex;
      alphabet.startOffsetX = startXOffset;
      alphabet.currentOffsetX = startXOffset;
      alphabet.targetOffsetX = 0;

      const alphaTarget = alphabet.targetY === 0 ? 1.0 : 0.6;
      alphabet.setAlpha(alphaTarget);

      if (opt.type === "check") {
        const isChecked = window.Preferences
          ? window.Preferences[opt.pref]
          : false;
        const frameName = isChecked
          ? "Check Box Selected Static0000"
          : "Check Box unselected0000";

        alphabet.checkbox = this.scene.add.sprite(
          0,
          0,
          "checkboxThingie",
          frameName,
        );
        alphabet.checkbox.setScale(0.75);
        alphabet.checkbox.setAlpha(alphaTarget);
      }

      this.menuItemsText.push(alphabet);
    });
  }

  updateSelection(selectedIndex) {
    this.menuItemsText.forEach((item, i) => {
      item.targetY = i - selectedIndex;
      const alphaTarget = item.targetY === 0 ? 1.0 : 0.6;

      item.setAlpha(alphaTarget);
      if (item.checkbox) item.checkbox.setAlpha(alphaTarget);
    });
  }

  updateCheckbox(index, isChecked) {
    const item = this.menuItemsText[index];
    if (item && item.checkbox) {
      const frameName = isChecked
        ? "Check Box Selected Static0000"
        : "Check Box unselected0000";
      item.checkbox.setFrame(frameName);
    }
  }

  updateSelector(index, baseLabel, newValue) {
    const item = this.menuItemsText[index];
    if (item) {
      item.text = `${baseLabel} <${String(newValue).toUpperCase()}>`;
      if (typeof item.createLetters === "function") item.createLetters();
    }
  }

  update(delta) {
    const lerpFactor = 1.0 - Math.exp(-10 * (delta / 1000));

    const processItems = (items) => {
      items.forEach((item) => {
        if (!item.active) return;

        if (item.currentOffsetX === undefined)
          item.currentOffsetX = item.startOffsetX || 0;
        item.currentOffsetX +=
          ((item.targetOffsetX || 0) - item.currentOffsetX) * lerpFactor;

        const targetYPos = item.targetY * 120 + this.scene.scale.height / 2;
        const targetXPos = item.targetY * 20 + 90 + item.currentOffsetX;

        item.y += (targetYPos - item.y) * lerpFactor;
        item.x += (targetXPos - item.x) * lerpFactor;

        if (item.checkbox) {
          item.checkbox.x = item.x + item.width + 70;
          item.checkbox.y = item.y;
        }
      });
    };

    processItems(this.menuItemsText);
    processItems(this.transitioningOut);
  }
}
window.PauseMenuRenderer = PauseMenuRenderer;
