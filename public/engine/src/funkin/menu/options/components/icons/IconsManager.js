class IconsManager {
  constructor(parent) {
    this.parent = parent;

    // Estado central
    this.activeIcon = null;
    this.iconStates = {};
    this.cachedLastFrames = {};

    // Sub-módulos
    this.renderer = new window.IconsRenderer(this);
    this.animator = new window.IconsAnimator(this);
  }
}
window.IconsManager = IconsManager;
