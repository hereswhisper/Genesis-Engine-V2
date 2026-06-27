class TabsManager {
  constructor(parent) {
    this.parent = parent;

    // Estado central
    this.bgInactive = "#1e1e1e";
    this.bgActive = "#3a3a3a";
    this.arrowFrame = 0;
    this.arrowTimer = 0;

    // Sub-módulos
    this.renderer = new window.TabsRenderer(this);
    this.animator = new window.TabsAnimator(this);
  }
}
window.TabsManager = TabsManager;
