class UIRenderer {
  constructor(parent) {
    this.parent = parent;
    this.scene = parent.scene;
  }

  loadSectionData(sectionName) {
    const p = this.parent;
    p.animations.clearAnimations();
    p.currentOptions = [];
    p.maxOptions = 0;
    p.selectedOptionIndex = 0;
    const container = p.domMenu.node.querySelector("#opts-container");
    if (container)
      container.innerHTML = '<p style="color: #bbb;">Cargando opciones...</p>';

    const cacheKey = "opts_" + sectionName;
    if (this.scene.cache.json.exists(cacheKey))
      this.renderData(this.scene.cache.json.get(cacheKey));
    else {
      const path =
        (window.Path && window.Path.dataUI ? window.Path.dataUI : "") +
        "options/" +
        sectionName +
        ".json";
      this.scene.load.json(cacheKey, path);
      this.scene.load.once("complete", () =>
        this.renderData(this.scene.cache.json.get(cacheKey)),
      );
      this.scene.load.start();
    }
  }

  renderData(data) {
    const p = this.parent;
    const container = p.domMenu.node.querySelector("#opts-container");
    container.innerHTML = "";
    p.currentOptions = [];
    const lang = window.ClientGlobals?.language || "en";
    let optIdx = 0;

    data.forEach((item, idx) => {
      if (item.global) return;

      if (item.type === "option") {
        // CARGAR DATOS DESDE LOCALSTORAGE ANTES DE RENDERIZAR
        if (item.options.input === "check")
          item.options.values[0] = window.OptionsStorage.load(
            item.id,
            "check",
            item.options.values[0] || false,
          );
        else if (item.options.input === "slider")
          item.options.values[0] = window.OptionsStorage.load(
            item.id,
            "slider",
            item.options.values[0] || 0,
          );
        else if (item.options.input === "drop")
          item.selectedValue = window.OptionsStorage.load(
            item.id,
            "drop",
            item.selectedValue || item.options.values[0].id,
          );
        else if (item.options.input === "keybind")
          item.options.defaults = window.OptionsStorage.load(
            item.id,
            "keybind",
            item.options.defaults || [0, 0],
          );

        p.currentOptions.push(item);
      }

      if (item.type === "header") {
        const txt = item.label[lang] || item.label.en || "HEADER";
        container.innerHTML += `<div style="margin-top:35px; margin-bottom:15px; border-bottom:2px solid rgba(255,255,255,0.2); padding-bottom:10px;"><canvas id="c-head-${idx}"></canvas></div>`;
        setTimeout(
          () =>
            window.AlphabetRenderer.render(
              this.scene,
              container.querySelector(`[id="c-head-${idx}"]`),
              txt.toUpperCase(),
              0.85,
            ),
          0,
        );
      } else if (item.type === "option") {
        const txt = item.label[lang] || item.label.en || "OPTION";
        let cHTML = "";

        if (item.options.input === "check")
          cHTML = `<div style="width:60px; height:60px; position:relative; cursor:pointer; display:flex; align-items:center; justify-content:center;"><canvas id="c-chk-${item.id}" width="180" height="180" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); z-index:100; pointer-events:none; background:transparent;"></canvas></div>`;
        else if (item.options.input === "slider")
          cHTML = `<div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px; width:170px;"><span id="t-sld-${item.id}" style="font-family:'vcr', sans-serif; font-size:24px; color:#fff; font-weight:bold; text-shadow:2px 2px 0px rgba(0,0,0,0.8);">${item.options.values[0]}</span><input type="range" class="c-slider" id="${item.id}" min="${item.options.min || 0}" max="${item.options.max || 100}" step="${item.options.step || 1}" value="${item.options.values[0]}" style="cursor:pointer;" /></div>`;
        else if (item.options.input === "drop")
          cHTML = `<div class="c-drop" id="d-${item.id}" style="position:relative; width:260px;"><div class="d-btn" style="padding:10px 15px; background:rgba(34,34,34,0.2); backdrop-filter:blur(5px); border:1px solid rgba(255,255,255,0.6); border-radius:4px; display:flex; align-items:center; cursor:pointer;"><canvas id="c-d-cur-${item.id}" style="pointer-events:none;"></canvas><span style="margin-left:auto; font-size:14px; color:#888;">▼</span></div><div class="d-list" style="display:none; position:absolute; top:100%; left:0; right:0; background:rgba(17,17,17,0.9); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.6); border-radius:4px; max-height:250px; overflow-y:auto;">${item.options.values.map((v, i) => `<div class="d-item" data-val="${v.id}" data-idx="${i}" style="padding:12px; border-bottom:1px solid rgba(255,255,255,0.1); cursor:pointer;"><canvas id="c-d-i-${item.id}-${v.id}" style="pointer-events:none;"></canvas></div>`).join("")}</div></div>`;
        else if (item.options.input === "action")
          cHTML = `<button id="${item.id}" style="padding:10px 20px; background:rgba(85,85,85,0.8); color:white; border:1px solid rgba(255,255,255,0.2); border-radius:4px; font-weight:bold; cursor:pointer; backdrop-filter:blur(4px);">Seleccionar</button>`;
        else if (item.options.input === "keybind") {
          const d = item.options.defaults || [0, 0];
          cHTML = `<div style="display:flex; gap:10px;"><div class="k-box" id="k-${item.options.action}-0" data-act="${item.options.action}" data-slot="0" data-code="${d[0]}" style="width:140px; height:50px; background:rgba(34,34,34,0.6); border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; overflow:hidden; backdrop-filter:blur(4px);"><canvas id="c-k-${item.options.action}-0" style="pointer-events:none;"></canvas></div><div class="k-box" id="k-${item.options.action}-1" data-act="${item.options.action}" data-slot="1" data-code="${d[1]}" style="width:140px; height:50px; background:rgba(34,34,34,0.6); border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; overflow:hidden; backdrop-filter:blur(4px);"><canvas id="c-k-${item.options.action}-1" style="pointer-events:none;"></canvas></div></div>`;
        }

        container.innerHTML += `<div class="opt-row" data-idx="${optIdx}" style="position:relative; z-index:1; display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); padding:18px 20px; margin-bottom:10px; border-radius:6px; min-height:70px;"><div class="t-wrap" style="flex:1; display:flex; align-items:center; overflow:hidden; pointer-events:none; min-width:0;"><canvas id="c-opt-${item.id}" style="flex-shrink:0;"></canvas></div><div style="margin-left:25px; display:flex; align-items:center;">${cHTML}</div></div>`;
        optIdx++;

        setTimeout(() => {
          window.AlphabetRenderer.render(
            this.scene,
            container.querySelector(`[id="c-opt-${item.id}"]`),
            txt.toUpperCase(),
            0.65,
          );
          if (item.options.input === "check")
            p.animations.checkbox.drawFrame(
              container.querySelector(`[id="c-chk-${item.id}"]`),
              item.options.values[0]
                ? "Check Box Selected Static0000"
                : "Check Box unselected0000",
            );
          else if (item.options.input === "drop") {
            const currentValId =
              item.selectedValue || item.options.values[0].id;
            const currentValObj =
              item.options.values.find((v) => v.id === currentValId) ||
              item.options.values[0];
            window.AlphabetRenderer.render(
              this.scene,
              container.querySelector(`[id="c-d-cur-${item.id}"]`),
              (currentValObj.label[lang] || currentValObj.id).toUpperCase(),
              0.45,
            );
            item.options.values.forEach((v) =>
              window.AlphabetRenderer.render(
                this.scene,
                container.querySelector(`[id="c-d-i-${item.id}-${v.id}"]`),
                (v.label[lang] || v.id).toUpperCase(),
                0.45,
              ),
            );
          } else if (item.options.input === "keybind") {
            const defs = item.options.defaults || [0, 0];
            window.AlphabetRenderer.render(
              this.scene,
              container.querySelector(`[id="c-k-${item.options.action}-0"]`),
              p.input.keybinder.keyCodeToString(defs[0]),
              0.4,
            );
            window.AlphabetRenderer.render(
              this.scene,
              container.querySelector(`[id="c-k-${item.options.action}-1"]`),
              p.input.keybinder.keyCodeToString(defs[1]),
              0.4,
            );
          }
        }, 0);
      }
    });

    setTimeout(() => p.builder.events.attachEvents(container), 150);
  }
}
window.UIRenderer = UIRenderer;
