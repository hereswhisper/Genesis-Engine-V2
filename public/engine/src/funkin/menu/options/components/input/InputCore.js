class InputCore {
  constructor(parent) {
    this.parent = parent;
    this.scene = parent.scene;
  }

  handleKeyboard(e) {
    const p = this.parent;
    p.lastInputDevice = "keyboard";

    if (p.isBinding) {
      e.preventDefault();
      if (e.keyCode === 27) this.scene.sound.play("cancelMenu");
      else {
        this.scene.sound.play("confirmMenu");
        p.input.keybinder.updateKeybindVisual(
          p.bindingAction,
          p.bindingSlot,
          e.keyCode,
        );
      }
      p.input.keybinder.cancelBinding();
      return true;
    }

    let isTab = e.code === "Tab";
    if (window.Controls.UI_LEFT(e) || (isTab && e.shiftKey)) {
      this.scene.sound.play("scrollMenu");
      this.switchTab(-1);
      return true;
    }
    if (window.Controls.UI_RIGHT(e) || (isTab && !e.shiftKey)) {
      this.scene.sound.play("scrollMenu");
      this.switchTab(1);
      return true;
    }
    if (window.Controls.BACK(e)) return false;
    if (p.maxOptions === 0 || p.currentOptions.length === 0) return true;

    if (p.isInteracting) {
      if (p.interactingType === "drop") {
        if (window.Controls.UI_UP(e)) {
          this.scene.sound.play("scrollMenu");
          p.dropdownIndex = Math.max(0, p.dropdownIndex - 1);
          p.input.interactor.updateDropdownHighlight();
        } else if (window.Controls.UI_DOWN(e)) {
          this.scene.sound.play("scrollMenu");
          p.dropdownIndex = Math.min(p.dropdownMax - 1, p.dropdownIndex + 1);
          p.input.interactor.updateDropdownHighlight();
        } else if (window.Controls.ACCEPT(e)) {
          this.scene.sound.play("confirmMenu");
          p.input.interactor.selectDropdownOption();
          p.isInteracting = false;
          p.builder.highlight.updateOptionHighlight(true);
        } else if (window.Controls.BACK(e)) {
          this.scene.sound.play("cancelMenu");
          p.input.interactor.closeDropdown();
          p.isInteracting = false;
          p.builder.highlight.updateOptionHighlight(true);
        }
      } else if (p.interactingType === "slider") {
        if (window.Controls.UI_LEFT(e)) p.input.interactor.changeSlider(-1);
        else if (window.Controls.UI_RIGHT(e))
          p.input.interactor.changeSlider(1);
        else if (window.Controls.BACK(e) || window.Controls.ACCEPT(e)) {
          this.scene.sound.play("cancelMenu");
          p.isInteracting = false;
          p.builder.highlight.updateOptionHighlight(true);
        }
      }
      return true;
    }

    if (window.Controls.UI_UP(e)) {
      this.scene.sound.play("scrollMenu");
      p.selectedOptionIndex = Math.max(0, p.selectedOptionIndex - 1);
      p.builder.highlight.updateOptionHighlight(true);
      return true;
    }
    if (window.Controls.UI_DOWN(e)) {
      this.scene.sound.play("scrollMenu");
      p.selectedOptionIndex = Math.min(
        p.maxOptions - 1,
        p.selectedOptionIndex + 1,
      );
      p.builder.highlight.updateOptionHighlight(true);
      return true;
    }
    if (window.Controls.ACCEPT(e)) {
      this.scene.sound.play("confirmMenu");
      p.input.interactor.interactWithCurrentOption();
      return true;
    }
    return true;
  }

  switchTab(dir) {
    const p = this.parent;
    p.selectedTabIndex += dir;
    if (p.selectedTabIndex < 0) p.selectedTabIndex = p.sections.length - 1;
    if (p.selectedTabIndex >= p.sections.length) p.selectedTabIndex = 0;
    const sectionName = p.sections[p.selectedTabIndex].option;
    p.tabs.renderer.highlightTab(sectionName);
    p.builder.renderer.loadSectionData(sectionName);
  }
}
window.InputCore = InputCore;
