class InputHandler {
  constructor(parent) {
    this.parent = parent;

    // Sub-módulos
    this.core = new window.InputCore(this.parent);
    this.interactor = new window.InputInteractor(this.parent);
    this.keybinder = new window.InputKeybinder(this.parent);
  }
}
window.InputHandler = InputHandler;
