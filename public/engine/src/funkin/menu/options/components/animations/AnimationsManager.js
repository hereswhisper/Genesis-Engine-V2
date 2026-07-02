class AnimationsManager {
  constructor(parent) {
    this.parent = parent;
    this.scene = parent.scene;

    // Sub-módulos de animación
    this.checkbox = new window.CheckboxAnimations(this);
    this.text = new window.TextAnimations(this);
  }

  clearAnimations() {
    this.checkbox.clear();
    this.text.clear();
  }
}
window.AnimationsManager = AnimationsManager;
