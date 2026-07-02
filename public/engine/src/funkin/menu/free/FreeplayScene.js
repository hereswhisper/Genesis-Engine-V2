// src/funkin/menu/free/FreeplayScene.js

class FreeplayScene extends Phaser.Scene {
  constructor() {
    super({ key: "FreeplayScene" });
  }

  preload() {
    this.load.image("menuBGDesat", Path.menu + "bg/menuDesat.png");
    this.load.audio("scrollMenu", Path.sounds + "menu/scrollMenu.ogg");
    this.load.audio("confirmMenu", Path.sounds + "menu/confirmMenu.ogg");
    this.load.audio("cancelMenu", Path.sounds + "menu/cancelMenu.ogg");
    this.load.audio("freakyMenu", Path.music + "freakymenu.ogg");
    Alphabet.load(this);
  }

  create() {
    this.music = this.sound
      .getAllPlaying()
      .find((s) => ["introMusic", "freakyMenu"].includes(s.key));
    if (!this.music) {
      this.music = this.sound.add("freakyMenu", { loop: true });
    }
    if (!this.music.isPlaying) this.music.play();
    // --- FIX: LIMPIEZA FORZOSA DEL MULTIJUGADOR ---
    window.isMultiplayer = false;
    window.isMultiplayerWaiting = false;
    window.NetworkLatency = 0;
    window.NetworkHostTimeOffset = 0;
    if (window.MultiplayerData) window.MultiplayerData.active = false;
    if (window.Network && typeof window.Network.disconnect === "function") {
      window.Network.disconnect();
    }
    // ----------------------------------------------

    Alphabet.createAtlas(this);

    this.songsList = [];
    this.alphabetGroup = [];
    this.globalDifficulties = [];
    this.currentDiffIndex = 0;
    this.canInteract = false;

    const { width: w, height: h } = this.scale;

    this.bg = this.add
      .sprite(w / 2, h / 2, "menuBGDesat")
      .setScrollFactor(0)
      .setScale(1.2)
      .setOrigin(0.5);

    this.bgFlash = this.add
      .sprite(w / 2, h / 2, "menuBGDesat")
      .setScrollFactor(0)
      .setScale(1.2)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setVisible(false);

    this.populateSongs();

    this.songsList.forEach((song, i) => {
      let textObj = new window.Alphabet(
        this,
        0,
        0,
        song.name.toUpperCase(),
        true,
        1,
      );
      textObj.y = i * 130 + h / 2.5;
      textObj.x = 120;
      textObj.alpha = 0;
      this.alphabetGroup.push(textObj);
    });

    this.scoreBG = this.add
      .rectangle(w, 0, w * 0.4, 130, 0x000000, 0.6)
      .setOrigin(1, 0)
      .setDepth(100)
      .setScrollFactor(0);
    this.scoreText = this.add
      .text(w - 15, 15, "", {
        fontFamily: "vcr, monospace",
        fontSize: "32px",
        fill: "#ffffff",
        align: "right",
        lineSpacing: 5,
      })
      .setOrigin(1, 0)
      .setDepth(101)
      .setScrollFactor(0);

    if (window.isMobile || window.isReactNative) {
      this.backBtn = this.add
        .text(15, 15, "< BACK", {
          fontFamily: "vcr, monospace",
          fontSize: "32px",
          fill: "#ffffff",
        })
        .setOrigin(0, 0)
        .setDepth(101)
        .setScrollFactor(0)
        .setInteractive();

      this.backBtn.on("pointerdown", () => {
        this.goBack();
      });
    }

    this.selectedIndex = window.FreeplayState_rememberedIndex || 0;
    let currentDiff = this.globalDifficulties[this.currentDiffIndex];
    this.selectedIndex = this.findClosestValidIndex(
      this.selectedIndex,
      currentDiff,
    );
    this.changeSelection(0, false);

    this.canInteract = true;

    this.inputListener = (e) => {
      if (e.repeat) return;
      this.handleInput(e);
    };
    window.addEventListener("keydown", this.inputListener);

    this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.canInteract) return;
      if (deltaY > 0) this.changeSelection(1);
      else if (deltaY < 0) this.changeSelection(-1);
    });

    let startX = 0,
      startY = 0;
    this.input.on("pointerdown", (pointer) => {
      startX = pointer.x;
      startY = pointer.y;
    });

    this.input.on("pointerup", (pointer) => {
      if (!this.canInteract || (!window.isMobile && !window.isReactNative))
        return;

      let diffX = pointer.x - startX;
      let diffY = pointer.y - startY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
        if (diffX < 0) this.changeDiff(1);
        else this.changeDiff(-1);
      } else {
        if (diffY < -30) this.changeSelection(1);
        else if (diffY > 30) this.changeSelection(-1);
        else if (Math.abs(diffY) < 10 && Math.abs(diffX) < 10) {
          if (pointer.y > 60 || pointer.x > 150) {
            this.confirmSelection();
          }
        }
      }
    });

    this.events.once("shutdown", this.cleanup, this);
  }

  populateSongs() {
    if (!window.DataSongs || !DataSongs.weeksList) return;

    let diffSet = new Set();

    DataSongs.weeksList.forEach((weekId) => {
      let weekData = DataSongs.weeksData[weekId];
      if (!weekData) return;

      let addSong = (rawName, colorArr) => {
        let trackID = rawName.toLowerCase().replace(/\s+/g, "-");
        let metaName = window.DataSongs.getSongMeta(trackID, "songName");
        let finalName = metaName ? metaName : rawName;

        let metaDiffs = window.DataSongs.getSongMeta(trackID, "difficulties");
        let diffs = ["easy", "normal", "hard"];

        if (
          metaDiffs &&
          typeof metaDiffs === "object" &&
          Object.keys(metaDiffs).length > 0
        ) {
          diffs = Object.keys(metaDiffs);
        }

        diffs.forEach((d) => diffSet.add(d.toLowerCase()));

        this.songsList.push({
          name: finalName,
          id: trackID,
          color: colorArr || [146, 113, 253],
          difficulties: diffs.map((d) => d.toLowerCase()),
        });
      };

      if (weekData.songs && Array.isArray(weekData.songs)) {
        weekData.songs.forEach((songData) => {
          let rawName = Array.isArray(songData) ? songData[0] : songData;
          let color =
            Array.isArray(songData) && songData[2]
              ? songData[2]
              : [146, 113, 253];
          addSong(rawName, color);
        });
      } else if (weekData.tracks && Array.isArray(weekData.tracks)) {
        weekData.tracks.forEach((trackName) => addSong(trackName));
      }
    });

    if (this.songsList.length === 0) {
      this.songsList.push({
        name: "Tutorial",
        id: "tutorial",
        color: [146, 113, 253],
        difficulties: ["easy", "normal", "hard"],
      });
      diffSet = new Set(["easy", "normal", "hard"]);
    }

    const order = ["easy", "normal", "hard", "erect", "nightmare"];
    this.globalDifficulties = Array.from(diffSet).sort((a, b) => {
      let idxA = order.indexOf(a);
      let idxB = order.indexOf(b);
      if (idxA === -1) idxA = 99;
      if (idxB === -1) idxB = 99;
      return idxA - idxB;
    });

    if (this.globalDifficulties.length === 0)
      this.globalDifficulties = ["normal"];

    let savedDiff = window.FreeplayState_rememberedDiff || "normal";
    this.currentDiffIndex = this.globalDifficulties.indexOf(savedDiff);

    if (this.currentDiffIndex === -1)
      this.currentDiffIndex = this.globalDifficulties.indexOf("normal");
    if (this.currentDiffIndex === -1) this.currentDiffIndex = 0;
  }

  updateScoreText() {
    if (this.songsList.length === 0) return;

    let song = this.songsList[this.selectedIndex];
    let diffName = this.globalDifficulties[this.currentDiffIndex].toUpperCase();

    let score =
      localStorage.getItem(`genesis_score_${song.id}_${diffName}`) || 0;
    let accuracy =
      localStorage.getItem(`genesis_acc_${song.id}_${diffName}`) || "0.00";

    this.scoreText.setText(
      `SCORE: ${score}\nACCURACY: ${accuracy}%\n< ${diffName} >`,
    );
  }

  update(time, delta) {
    const lerp = (a, b, t) => a + (b - a) * t;
    const dt = delta * 0.01;
    let currentDiff = this.globalDifficulties[this.currentDiffIndex];

    let selectedVisualIndex = 0;
    let visualIndex = 0;

    for (let i = 0; i < this.songsList.length; i++) {
      if (this.songsList[i].difficulties.includes(currentDiff)) {
        if (i === this.selectedIndex) selectedVisualIndex = visualIndex;
        visualIndex++;
      }
    }

    visualIndex = 0;
    for (let i = 0; i < this.songsList.length; i++) {
      let song = this.songsList[i];
      let item = this.alphabetGroup[i];
      let isValid = song.difficulties.includes(currentDiff);

      if (isValid) {
        let relIndex = visualIndex - selectedVisualIndex;
        let targetY = relIndex * 130 + this.scale.height / 2.5;
        let targetX = i === this.selectedIndex ? 150 : 120;
        let targetAlpha = i === this.selectedIndex ? 1 : 0.6;

        item.y = lerp(item.y, targetY, dt * 1.5);
        item.x = lerp(item.x, targetX, dt * 1.5);
        item.alpha = lerp(item.alpha, targetAlpha, dt * 1.5);
        visualIndex++;
      } else {
        item.x = lerp(item.x, -100, dt * 1.5);
        item.alpha = lerp(item.alpha, 0, dt * 1.5);
      }
    }
  }

  handleInput(e) {
    if (!this.canInteract) return;

    if (Controls.UI_UP(e)) this.changeSelection(-1);
    else if (Controls.UI_DOWN(e)) this.changeSelection(1);
    else if (Controls.UI_LEFT(e)) this.changeDiff(-1);
    else if (Controls.UI_RIGHT(e)) this.changeDiff(1);
    else if (Controls.ACCEPT(e)) this.confirmSelection();
    else if (Controls.BACK(e)) this.goBack();
  }

  findClosestValidIndex(currentIndex, targetDiff) {
    if (this.songsList[currentIndex].difficulties.includes(targetDiff))
      return currentIndex;

    let len = this.songsList.length;
    for (let i = 1; i <= len; i++) {
      let forward = (currentIndex + i) % len;
      if (this.songsList[forward].difficulties.includes(targetDiff))
        return forward;

      let backward = (currentIndex - i + len) % len;
      if (this.songsList[backward].difficulties.includes(targetDiff))
        return backward;
    }
    return currentIndex;
  }

  changeDiff(change) {
    this.currentDiffIndex += change;
    if (this.currentDiffIndex < 0)
      this.currentDiffIndex = this.globalDifficulties.length - 1;
    if (this.currentDiffIndex >= this.globalDifficulties.length)
      this.currentDiffIndex = 0;

    let currentDiff = this.globalDifficulties[this.currentDiffIndex];
    this.sound.play("scrollMenu");

    if (
      !this.songsList[this.selectedIndex].difficulties.includes(currentDiff)
    ) {
      this.selectedIndex = this.findClosestValidIndex(
        this.selectedIndex,
        currentDiff,
      );
      this.changeSelection(0, false);
    } else {
      this.updateScoreText();
    }
  }

  changeSelection(change, playSound = true) {
    let currentDiff = this.globalDifficulties[this.currentDiffIndex];
    let newIndex = this.selectedIndex;

    if (change !== 0) {
      let loopCount = 0;
      do {
        newIndex += change;
        if (newIndex < 0) newIndex = this.songsList.length - 1;
        if (newIndex >= this.songsList.length) newIndex = 0;
        loopCount++;
      } while (
        !this.songsList[newIndex].difficulties.includes(currentDiff) &&
        loopCount <= this.songsList.length
      );

      if (loopCount > this.songsList.length) return;
    }

    if (change !== 0 && playSound) this.sound.play("scrollMenu");
    this.selectedIndex = newIndex;

    let songColors = this.songsList[this.selectedIndex].color;
    if (songColors && songColors.length === 3) {
      let hexColor = Phaser.Display.Color.GetColor(
        songColors[0],
        songColors[1],
        songColors[2],
      );
      this.bg.setTint(hexColor);
    }

    this.updateScoreText();
  }

  confirmSelection() {
    this.canInteract = false;
    this.sound.play("confirmMenu");

    window.FreeplayState_rememberedIndex = this.selectedIndex;
    window.FreeplayState_rememberedDiff =
      this.globalDifficulties[this.currentDiffIndex];

    let selectedSong = this.songsList[this.selectedIndex];
    let item = this.alphabetGroup[this.selectedIndex];
    let selectedDiff = this.globalDifficulties[this.currentDiffIndex];

    this.flicker(this.bgFlash, 1100, 150, false, null, false);

    this.flicker(
      item,
      1000,
      60,
      true,
      () => {
        this.registry.set("playLoadData", {
          CurrentSong: selectedSong.id,
          Difficulty: selectedDiff.toLowerCase(),
          SceneOrigin: "freeplay",
        });

        if (window.transitionTo) window.transitionTo(this, "PlayScene");
        else this.scene.start("PlayScene");
      },
      true,
    );
  }

  flicker(target, duration, interval, endState, onComplete, useAlpha = false) {
    let count = Math.floor(duration / interval);
    this.time.addEvent({
      delay: interval,
      repeat: count,
      callback: () => {
        if (useAlpha) target.alpha = target.alpha > 0.5 ? 0 : 1;
        else target.visible = !target.visible;

        if (count-- <= 0) {
          if (useAlpha) target.alpha = endState ? 1 : 0;
          else target.visible = endState;
          if (onComplete) onComplete();
        }
      },
    });
  }

  goBack() {
    this.canInteract = false;
    this.sound.play("cancelMenu");
    if (window.transitionTo) window.transitionTo(this, "MainMenuScene");
    else this.scene.start("MainMenuScene");
  }

  cleanup() {
    window.removeEventListener("keydown", this.inputListener);
  }
}

window.FreeplayScene = FreeplayScene;
window.game.scene.add("FreeplayScene", window.FreeplayScene);
