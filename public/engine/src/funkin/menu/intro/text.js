class IntroTextScene extends Phaser.Scene {
  constructor() {
    super({ key: "IntroTextScene" });
    this.music = null;
    this.randomTextPairs = [];
    this.texts = [];
    this.imageObj = null;
    this.currentYOffset = 0;
    this.sceneEnded = false;
    this.currentRandomPair = null;
    this.startY = 300;
    this.lineSpacing = 55;
    this.introEvents = [];
    this.currentEventIndex = 0;
    this._waitingToSkip = false;
  }

  preload() {
    const vcrFont = new FontFace("vcr", `url(${Path.fonts}vcr.ttf)`);
    vcrFont
      .load()
      .then((loadedFont) => {
        document.fonts.add(loadedFont);
      })
      .catch((err) => console.warn("Error al cargar la fuente VCR:", err));

    Alphabet.load(this);
    this.load.json("introData", Path.dataUI + "intro.json");
    this.load.text("randomText", Path.dataUI + "randomText.txt");

    this.load.once("filecomplete-json-introData", (key, type, data) => {
      if (data && data.music) {
        this.load.audio("introMusic", Path.music + data.music);
      }
      if (data.introSequences && data.introSequences[0]) {
        data.introSequences[0].steps.forEach((step) => {
          if (step.img && !this.textures.exists(step.img.id)) {
            this.load.image(step.img.id, Path.img + step.img.id);
          }
        });
      }
    });

    const loadAtlas = (k, f) =>
      this.load.atlasXML(
        k,
        `${Path.menu}intro/${f}.png`,
        `${Path.menu}intro/${f}.xml`,
      );

    loadAtlas("logoBumpin", "logoBumpin");
    loadAtlas("gfDanceTitle", "gfDanceTitle");
    loadAtlas("titleText", "titleEnter");

    this.load.audio("confirmMenu", `${Path.sounds}menu/confirmMenu.ogg`);
    ["girlfriendsRingtone", "freakyMenu"].forEach((m) =>
      this.load.audio(m, `${Path.music}${m}.ogg`),
    );
  }

  create() {
    Alphabet.createAtlas(this);
    const introData = this.cache.json.get("introData");
    const sequence = introData ? introData.introSequences[0] : null;

    if (!sequence) return;

    Conductor.mapTimeChanges([new SongTimeChange(0, sequence.bpm, 4, 4)]);
    const beatTime = Conductor.beatLengthMs;

    const textFile = this.cache.text.get("randomText");
    if (textFile) {
      this.randomTextPairs = textFile
        .split("\n")
        .filter((l) => l.trim() !== "")
        .map((l) => {
          const p = l.split("--").map((part) => part.trim().toUpperCase());
          return p.length >= 2 ? p : [p[0], ""];
        });
    }

    this.introEvents = sequence.steps
      .map((step) => ({ ...step, targetTime: step.beat * beatTime }))
      .sort((a, b) => a.targetTime - b.targetTime);

    this.music = this.sound.add("introMusic", { loop: true });
    this.music.play();

    this.inputListener = (e) => {
      if (Controls.ACCEPT(e)) this.skipIntro();
    };
    window.addEventListener("keydown", this.inputListener);

    // SOPORTE TÁCTIL (Tap para avanzar)
    if (window.isMobile || window.isReactNative) {
      this.input.on("pointerdown", () => {
        this.skipIntro();
      });
    }
  }

  update() {
    if (this.sceneEnded) return;
    if (this.music && this.music.isPlaying)
      Conductor.update(this.music.seek * 1000);

    const currentSongTime = this.music ? this.music.seek * 1000 : 0;

    while (this.currentEventIndex < this.introEvents.length) {
      const nextEvent = this.introEvents[this.currentEventIndex];
      if (currentSongTime >= nextEvent.targetTime) {
        this.processJsonStep(nextEvent);
        this.currentEventIndex++;
      } else break;
    }

    if (
      this.currentEventIndex >= this.introEvents.length &&
      !this._waitingToSkip &&
      !this.sceneEnded
    ) {
      this._waitingToSkip = true;
      this.time.delayedCall(Conductor.beatLengthMs, () => {
        this.skipIntro();
      });
    }

    if (
      Conductor.currentBeat >= 16 &&
      !this._waitingToSkip &&
      !this.sceneEnded
    ) {
      this.skipIntro();
    }
  }

  processJsonStep(step) {
    if (step.clear) {
      this.texts.forEach((t) => t.destroy());
      this.texts = [];
      if (this.imageObj) this.imageObj.destroy();
      this.currentYOffset = 0;
    }
    if (step.text) step.text.forEach((line) => this.displayTextLine(line));
    if (step.img) {
      if (this.imageObj) this.imageObj.destroy();
      this.imageObj = this.add
        .image(
          this.cameras.main.width / 2,
          this.startY + this.currentYOffset + 80,
          step.img.id,
        )
        .setOrigin(0.5)
        .setScale(step.img.scale || 1);
      this.currentYOffset += 100;
    }
    if (step.action) {
      if (step.action === "random-text-1") {
        this.currentRandomPair = this.getRandomTextPair();
        this.displayTextLine(this.currentRandomPair[0]);
      } else if (step.action === "random-text-2") {
        this.displayTextLine(
          this.currentRandomPair ? this.currentRandomPair[1] : "",
        );
      } else if (step.action === "skipIntro") {
        this.skipIntro();
      }
    }
  }

  skipIntro() {
    if (this.sceneEnded) return;
    this.sceneEnded = true;
    this._waitingToSkip = true;
    this.scene.start("introDance");
  }

  displayTextLine(textString) {
    if (!textString) return;
    const text = new window.Alphabet(
      this,
      0,
      0,
      textString.toUpperCase(),
      true,
      1,
    );
    text.x = this.cameras.main.width / 2 - text.width / 2;
    text.y = this.startY + this.currentYOffset;
    this.texts.push(text);
    this.currentYOffset += this.lineSpacing;
  }

  getRandomTextPair() {
    return this.randomTextPairs.length > 0
      ? this.randomTextPairs[
          Math.floor(Math.random() * this.randomTextPairs.length)
        ]
      : ["PART 1", "PART 2"];
  }

  shutdown() {
    this.texts.forEach((t) => t.destroy());
    if (this.imageObj) this.imageObj.destroy();
    window.removeEventListener("keydown", this.inputListener);
  }
}

window.IntroTextScene = IntroTextScene;
window.game.scene.add("IntroTextScene", window.IntroTextScene, true);
