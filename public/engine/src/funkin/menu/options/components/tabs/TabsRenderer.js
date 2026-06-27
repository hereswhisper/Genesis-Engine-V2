class TabsRenderer {
  constructor(manager) {
    this.manager = manager;
    this.parent = manager.parent;
    this.scene = manager.parent.scene;

    if (!this.scene.textures.exists("tabSelector") && window.Path) {
      this.scene.load.atlasXML(
        "tabSelector",
        window.Path.menuOptions + "tabSelector.png",
        window.Path.menuOptions + "tabSelector.xml",
      );
      this.scene.load.start();
    }
  }

  getTabsHTML() {
    let html = "";
    this.parent.sections.forEach((sec, idx) => {
      const isActive = idx === 0;
      const bg = isActive ? this.manager.bgActive : this.manager.bgInactive;
      
      // Adaptación al nuevo formato: usamos sec.id (o sec.option como fallback)
      const secId = sec.id || sec.option || "unknown";
      
      html += `<div class="opt-tab" id="tb-${secId}" data-idx="${idx}" data-sec="${secId}" style="background:${bg}; padding:0 25px; cursor:pointer; opacity:${isActive ? "1" : "0.5"}; border-right:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; height:50px; transition:transform 0.15s, background 0.2s, opacity 0.2s; position:relative; pointer-events:auto;">${this.parent.icons.renderer.getIconHTML(sec.icon)}<canvas id="canvas-tab-${secId}" style="pointer-events:none;"></canvas></div>`;
    });
    return html;
  }

  init() {
    const p = this.parent,
      node = p.domMenu.node;
    setTimeout(() => {
      p.icons.renderer.drawIcons();
      if (p.sections.length > 0)
        p.icons.animator.playAnimation(p.sections[0].icon);
    }, 50);

    const tabC = node.querySelector("#tab-cont");
    const bL = node.querySelector("#btn-left"),
      bR = node.querySelector("#btn-right");

    const updateArr = () => {
      if (!tabC) return;
      bL.style.opacity = tabC.scrollLeft <= 0 ? "0.3" : "1";
      bL.style.pointerEvents = tabC.scrollLeft <= 0 ? "none" : "auto";
      bR.style.opacity =
        Math.ceil(tabC.scrollLeft + tabC.clientWidth) >= tabC.scrollWidth
          ? "0.3"
          : "1";
      bR.style.pointerEvents =
        Math.ceil(tabC.scrollLeft + tabC.clientWidth) >= tabC.scrollWidth
          ? "none"
          : "auto";
    };
    tabC.addEventListener("scroll", updateArr);
    setTimeout(updateArr, 100);

    bL.addEventListener(
      "mousedown",
      () => (bL.style.transform = "scale(0.92)"),
    );
    bL.addEventListener("mouseup", () => (bL.style.transform = "scale(1)"));
    bL.addEventListener("mouseleave", () => (bL.style.transform = "scale(1)"));
    bL.addEventListener("click", () => {
      this.scene.sound.play("scrollMenu");
      tabC.scrollBy({ left: -250, behavior: "smooth" });
    });

    bR.addEventListener(
      "mousedown",
      () => (bR.style.transform = "scale(0.92)"),
    );
    bR.addEventListener("mouseup", () => (bR.style.transform = "scale(1)"));
    bR.addEventListener("mouseleave", () => (bR.style.transform = "scale(1)"));
    bR.addEventListener("click", () => {
      this.scene.sound.play("scrollMenu");
      tabC.scrollBy({ left: 250, behavior: "smooth" });
    });

    node.querySelectorAll(".opt-tab").forEach((tab) => {
      tab.addEventListener(
        "mousedown",
        () => (tab.style.transform = "scale(0.92)"),
      );
      tab.addEventListener("mouseup", () => (tab.style.transform = "scale(1)"));
      tab.addEventListener(
        "mouseleave",
        () => (tab.style.transform = "scale(1)"),
      );
      tab.addEventListener("click", () => {
        const sIdx = parseInt(tab.getAttribute("data-idx"));
        if (p.selectedTabIndex === sIdx) return;
        this.scene.sound.play("scrollMenu");
        p.selectedTabIndex = sIdx;
        const sName = tab.getAttribute("data-sec");
        this.highlightTab(sName);
        p.builder.renderer.loadSectionData(sName);
      });
    });
  }

  highlightTab(sectionName) {
    const p = this.parent;
    p.domMenu.node.querySelectorAll(".opt-tab").forEach((t) => {
      t.style.background = this.manager.bgInactive;
      t.style.opacity = "0.5";
    });
    const active = p.domMenu.node.querySelector(`[id="tb-${sectionName}"]`);
    if (active) {
      active.style.background = this.manager.bgActive;
      active.style.opacity = "1";
      const tb = p.domMenu.node.querySelector("#tab-cont");
      if (tb)
        tb.scrollTo({
          left: active.offsetLeft - tb.offsetWidth / 2 + active.offsetWidth / 2,
          behavior: "smooth",
        });
      
      // Adaptación al nuevo formato para encontrar el ícono a animar
      const sec = p.sections.find((s) => (s.id || s.option) === sectionName);
      if (sec) p.icons.animator.playAnimation(sec.icon);
    }
  }
}
window.TabsRenderer = TabsRenderer;