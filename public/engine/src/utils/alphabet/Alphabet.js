// src/utils/alphabet/Alphabet.js

class Alphabet extends Phaser.GameObjects.Container {
  constructor(scene, x, y, text, bold = false, scale = 1.0) {
    super(scene, x, y);
    this.scene = scene;
    this.text = text;
    this.bold = bold;
    this.scale = scale;
    this.letters = [];
    this.spacing = 0 * scale;
    this.width = 0;

    scene.add.existing(this);
    this.createLetters();
  }

  static load(scene) {
    scene.load.image("alphabet", Path.UI + "alphabet.png");
  }

  static createAtlas(scene) {
    if (!scene.textures.exists("bold")) {
      const alphabetImg = scene.textures.get("alphabet").getSourceImage();
      scene.textures.addAtlas("bold", alphabetImg, window.AlphabetData);
    }
  }

  createLetters() {
    if (!this.scene.textures.exists("bold")) {
      Alphabet.createAtlas(this.scene);
    }

    this.removeAll(true);
    this.letters = [];
    let xPos = 0;

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

    const bottomAlignedChars = [".", ",", "_"];

    for (let i = 0; i < this.text.length; i++) {
      const char = this.text[i];
      let prefix = "";

      if (specialChars[char] !== undefined) prefix = specialChars[char];
      else if (/^[A-Z]$/.test(char))
        prefix = char + (this.bold ? " bold" : " capital");
      else if (/^[a-z]$/.test(char)) prefix = char + " lowercase";
      else prefix = char;

      if (prefix === null) {
        xPos += 40 * this.scale;
        continue;
      }

      const animData = this.getOrCreateAnimation(prefix);

      if (animData) {
        // Se asigna el frame inicial para obtener dimensiones reales al instante
        const letter = this.scene.add.sprite(
          xPos,
          0,
          "bold",
          animData.firstFrame,
        );
        letter.play(animData.animKey);

        if (bottomAlignedChars.includes(char)) {
          letter.setOrigin(0.5, 1);
          letter.y = 35 * this.scale;
          letter.x += (letter.width * this.scale) / 2;
        } else {
          letter.setOrigin(0, 0.5);
          letter.y = 0;
        }

        letter.setScale(this.scale);
        this.add(letter);
        this.letters.push(letter);
        xPos += letter.width * this.scale + this.spacing;
      }
    }
    this.width = xPos;
  }

  getOrCreateAnimation(prefix) {
    const animKey = prefix;
    const texture = this.scene.textures.get("bold");
    const animationFrames = texture
      .getFrameNames()
      .filter((f) => f.startsWith(prefix));

    if (animationFrames.length > 0) {
      animationFrames.sort();
      if (!this.scene.anims.exists(animKey)) {
        this.scene.anims.create({
          key: animKey,
          frames: animationFrames.map((f) => ({ key: "bold", frame: f })),
          frameRate: 24,
          repeat: -1,
        });
      }
      return { animKey: animKey, firstFrame: animationFrames[0] };
    }
    return null;
  }
}
window.Alphabet = Alphabet;
