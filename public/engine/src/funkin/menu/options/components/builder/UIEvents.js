class UIEvents {
  constructor(parent) {
    this.parent = parent;
    this.scene = parent.scene;
  }

  attachEvents(container) {
    const p = this.parent;
    container.querySelectorAll(".opt-row").forEach((row, idx) => {
      row.addEventListener("mousemove", (e) => {
        if (p.lastMouseX !== e.clientX || p.lastMouseY !== e.clientY) {
          p.lastInputDevice = "mouse";
          p.lastMouseX = e.clientX;
          p.lastMouseY = e.clientY;
        }
        if (
          p.lastInputDevice === "mouse" &&
          !p.isInteracting &&
          p.maxOptions > 0 &&
          p.selectedOptionIndex !== idx
        ) {
          p.selectedOptionIndex = idx;
          p.builder.highlight.updateOptionHighlight(false);
        }
      });

      const item = p.currentOptions[idx];
      if (item.options.input === "slider") {
        const slider = row.querySelector("input");
        const span = row.querySelector("span");
        slider.addEventListener(
          "input",
          (e) => (span.innerText = e.target.value),
        );
        slider.addEventListener("mousedown", () =>
          this.scene.sound.play("scrollMenu"),
        );

        // GUARDADO AL TERMINAR DE ARRASTRAR EL MOUSE
        slider.addEventListener("change", (e) => {
          item.options.values[0] = parseFloat(e.target.value);
          window.OptionsStorage.save(item.id, "slider", item.options.values[0]);
        });
      } else if (item.options.input === "check") {
        row.querySelector("div:last-child").addEventListener("click", (e) => {
          item.options.values[0] = !item.options.values[0];
          window.OptionsStorage.save(item.id, "check", item.options.values[0]); // GUARDADO

          if (item.options.values[0]) {
            this.scene.sound.play("confirmMenu");
            p.animations.checkbox.playBlink(
              item.id,
              row.querySelector('canvas[id^="c-chk"]'),
            );
          } else {
            this.scene.sound.play("cancelMenu");
            p.animations.checkbox.playUnselect(
              item.id,
              row.querySelector('canvas[id^="c-chk"]'),
            );
          }
          e.stopPropagation();
        });
      } else if (item.options.input === "action") {
        row
          .querySelector("button")
          .addEventListener("click", () =>
            this.scene.sound.play("confirmMenu"),
          );
      } else if (item.options.input === "drop") {
        const drop = row.querySelector(".c-drop");
        const list = drop.querySelector(".d-list");
        drop.querySelector(".d-btn").addEventListener("click", (e) => {
          this.scene.sound.play("scrollMenu");
          const isVis = list.style.display === "block";
          container.querySelectorAll(".d-list").forEach((l) => {
            l.style.display = "none";
            if (l.closest(".opt-row")) l.closest(".opt-row").style.zIndex = "1";
          });
          if (!isVis) {
            list.style.display = "block";
            row.style.zIndex = "9999";
            p.activeDropdownList = list;
            p.activeDropdownItems = item.options.values;
            p.dropdownMax = item.options.values.length;
            p.isInteracting = true;
            p.interactingType = "drop";
            p.input.interactor.updateDropdownHighlight();
          } else {
            row.style.zIndex = "1";
            p.isInteracting = false;
          }
          e.stopPropagation();
        });
        list.querySelectorAll(".d-item").forEach((dropItem) => {
          dropItem.addEventListener("click", (e) => {
            this.scene.sound.play("confirmMenu");
            const vObj = item.options.values.find(
              (v) => v.id === dropItem.getAttribute("data-val"),
            );

            item.selectedValue = vObj.id;
            window.OptionsStorage.save(item.id, "drop", vObj.id); // GUARDADO

            const lang = window.ClientGlobals?.language || "en";
            window.AlphabetRenderer.render(
              this.scene,
              drop.querySelector(`[id="c-d-cur-${item.id}"]`),
              (vObj.label[lang] || vObj.id).toUpperCase(),
              0.45,
            );
            list.style.display = "none";
            row.style.zIndex = "1";
            p.isInteracting = false;
            p.builder.highlight.updateOptionHighlight(false);
            e.stopPropagation();
          });
        });
      } else if (item.options.input === "keybind") {
        row.querySelectorAll(".k-box").forEach((box) => {
          box.addEventListener("click", (e) => {
            this.scene.sound.play("scrollMenu");
            p.input.keybinder.startBinding(
              box.getAttribute("data-act"),
              parseInt(box.getAttribute("data-slot")),
            );
            e.stopPropagation();
          });
        });
      }
    });

    p.maxOptions = p.currentOptions.length;
    p.builder.highlight.updateOptionHighlight(false);
    const tb = p.domMenu.node.querySelector("#tab-cont");
    if (tb) tb.dispatchEvent(new Event("scroll"));

    p.domMenu.node.addEventListener("click", () => {
      container.querySelectorAll(".d-list").forEach((l) => {
        l.style.display = "none";
        if (l.closest(".opt-row")) l.closest(".opt-row").style.zIndex = "1";
      });
      if (p.isBinding) p.input.keybinder.cancelBinding();
      p.isInteracting = false;
    });
  }
}
window.UIEvents = UIEvents;
