class AlphabetRenderer {
  static render(scene, canvas, text, scale) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const texture = scene.textures.get("bold");
    if (!texture || texture.key === "__MISSING") return;

    const img = texture.getSourceImage();

    const specialChars = {
      "#": "hashtag",
      $: "dollarsign",
      "%": "%",
      "&": "amp",
      "(": "start parentheses",
      ")": "end parentheses",
      "*": "*",
      "+": "+",
      "-": "-",
      0: "0",
      1: "1",
      2: "2",
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      7: "7",
      8: "8",
      9: "9",
      ":": ":",
      ";": ";",
      "<": "<",
      "=": "=",
      ">": ">",
      "@": "@",
      "[": "[",
      "\\": "\\",
      "]": "]",
      "^": "^",
      _: "_",
      "'": "apostraphie",
      "!": "exclamation point",
      "?": "question mark",
      ".": "period",
      ",": "comma",
      "|": "|",
      "~": "~",
      "/": "forward slash",
      " ": null,
    };

    let xPos = 0;
    let maxHeight = 50 * scale;
    const framesToDraw = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      let prefix = "";

      if (specialChars[char] !== undefined) prefix = specialChars[char];
      else if (/^[A-Z]$/.test(char)) prefix = char + " bold";
      else if (/^[a-z]$/.test(char)) prefix = char + " lowercase";
      else prefix = char;

      if (prefix === null) {
        xPos += 40 * scale;
        continue;
      }

      const frameNames = texture
        .getFrameNames()
        .filter((f) => f.startsWith(prefix))
        .sort();
      if (frameNames.length > 0) {
        const frame = texture.get(frameNames[0]);
        framesToDraw.push({ frame, x: xPos, char });
        xPos += frame.cutWidth * scale;
        if (frame.cutHeight * scale > maxHeight)
          maxHeight = frame.cutHeight * scale;
      }
    }

    canvas.width = xPos || 1;
    canvas.height = maxHeight + 15 * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    framesToDraw.forEach((item) => {
      const f = item.frame;
      let yOff = 0;
      if ([".", ",", "_"].includes(item.char)) yOff = 35 * scale;
      ctx.drawImage(
        img,
        f.cutX,
        f.cutY,
        f.cutWidth,
        f.cutHeight,
        item.x,
        yOff,
        f.cutWidth * scale,
        f.cutHeight * scale,
      );
    });
  }
}
window.AlphabetRenderer = AlphabetRenderer;
