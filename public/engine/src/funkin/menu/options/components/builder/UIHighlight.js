class UIHighlight {
  constructor(parent) {
    this.parent = parent;
  }

  updateOptionHighlight(autoScroll = true) {
    const p = this.parent;
    if (!p.domMenu || !p.domMenu.node) return;

    p.domMenu.node.querySelectorAll(".opt-row").forEach((row, idx) => {
      if (idx === p.selectedOptionIndex) {
        row.style.background = p.isInteracting
          ? "rgba(255,255,255,0.2)"
          : "rgba(255,255,255,0.1)";
        row.style.outline = p.isInteracting
          ? "2px solid #44afff"
          : "2px solid #fff";
        if (autoScroll)
          row.scrollIntoView({ behavior: "smooth", block: "center" });
        p.animations.text.startMarquee(
          idx,
          row.querySelector(".t-wrap canvas"),
        );
      } else {
        row.style.background = "rgba(0,0,0,0.25)";
        row.style.outline = "none";
        p.animations.text.stopMarquee(idx, row.querySelector(".t-wrap canvas"));
      }
    });

    if (
      p.currentOptions.length > 0 &&
      p.currentOptions[p.selectedOptionIndex]
    ) {
      const descElement = p.domMenu.node.querySelector("#desc-text");
      if (descElement) {
        const item = p.currentOptions[p.selectedOptionIndex];
        let desc = item.description;

        if (
          item.options &&
          item.options.input === "drop" &&
          item.options.values
        ) {
          const currentValId = item.selectedValue || item.options.values[0].id;
          const currentValObj = item.options.values.find(
            (v) => v.id === currentValId,
          );

          if (currentValObj && currentValObj.description) {
            desc = currentValObj.description;
          }
        }

        const lang = window.ClientGlobals?.language || "en";
        descElement.innerText = desc
          ? typeof desc === "string"
            ? desc
            : desc[lang] || desc.en || "No desc."
          : "No description available.";
      }
    }
  }
}
window.UIHighlight = UIHighlight;
