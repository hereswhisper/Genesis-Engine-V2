class UIBuilderManager {
  constructor(parent) {
    this.parent = parent;
    this.scene = parent.scene;

    // Sub-módulos del constructor
    this.dom = new window.UIDomCreator(this.parent);
    this.renderer = new window.UIRenderer(this.parent);
    this.events = new window.UIEvents(this.parent);
    this.highlight = new window.UIHighlight(this.parent);
  }
}
window.UIBuilderManager = UIBuilderManager;
