class OptionsUI {
  constructor(scene) {
    this.scene = scene;
    this.domMenu = null;
    this.sections = [];
    this.currentOptions = [];
    this.selectedTabIndex = 0;
    this.selectedOptionIndex = 0;
    this.maxOptions = 0;
    this.isInteracting = false;
    this.interactingType = null;
    this.activeDropdownList = null;
    this.activeDropdownItems = [];
    this.dropdownIndex = 0;
    this.dropdownMax = 0;
    this.isBinding = false;
    this.bindingAction = null;
    this.bindingSlot = 0;
    this.lastInputDevice = "mouse";
    this.lastMouseX = -1;
    this.lastMouseY = -1;

    // Instancias de los managers divididos
    this.animations = new window.AnimationsManager(this);
    this.input = new window.InputHandler(this);
    this.icons = new window.IconsManager(this);
    this.tabs = new window.TabsManager(this);
    this.builder = new window.UIBuilderManager(this);
  }

  build(sectionsData) {
    this.domMenu = this.scene.add.dom(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
    );
    this.sections = sectionsData;
    this._initBuild();
  }

  _initBuild() {
    this.selectedTabIndex = 0;
    this.builder.dom.createDOM(this.sections[0].option);
    this.tabs.renderer.init();
  }

  handleInput(e) {
    if (!this.domMenu) return true;
    return this.input.core.handleKeyboard(e);
  }

  destroy() {
    this.animations.clearAnimations();
    if (this.icons && this.icons.animator) this.icons.animator.destroy();
    if (this.tabs && this.tabs.animator) this.tabs.animator.destroy();
    if (this.domMenu) this.domMenu.destroy();
  }
}
window.OptionsUI = OptionsUI;
