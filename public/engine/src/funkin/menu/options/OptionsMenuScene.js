class OptionsMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "OptionsMenuScene" });
    
    this.targetCamX = 0;
    this.targetCamY = 0;
    this.parallaxIntensity = 0.05;
    this.rawMouseX = window.innerWidth / 2;
    this.rawMouseY = window.innerHeight / 2;
  }

  init() {
    this.playData = {
      get: (key, defaultValue) => {
        if (key === 'stage') return 'mainStageErect';
        return defaultValue;
      }
    };
  }

  preload() {
    this.load.audio("scrollMenu", Path.sounds + "menu/scrollMenu.ogg");
    this.load.audio("confirmMenu", Path.sounds + "menu/confirmMenu.ogg");
    this.load.audio("cancelMenu", Path.sounds + "menu/cancelMenu.ogg");
    this.load.audio("freakyMenu", Path.music + "freakyMenu.ogg");

    this.load.json("optionsSections", Path.dataUI + "options/options.json");
    this.load.atlasXML("checkboxThingie", Path.menuOptions + "checkboxThingie.png", Path.menuOptions + "checkboxThingie.xml");
    this.load.atlasXML("optionsIcons", Path.menuOptions + "OptionsButtonsIcons.png", Path.menuOptions + "OptionsButtonsIcons.xml");

    if (window.Alphabet) window.Alphabet.load(this);
    if (window.Stage) window.Stage.preload(this);
  }

  create() {
    this.music = this.sound.getAllPlaying().find((s) => ["introMusic", "freakyMenu"].includes(s.key));
    if (!this.music) this.music = this.sound.add("freakyMenu", { loop: true });
    if (!this.music.isPlaying) this.music.play();

    this.bgStage = new window.Stage(this);
    if (window.Alphabet) window.Alphabet.createAtlas(this);

    this.domCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.domCamera.centerOn(this.scale.width / 2, this.scale.height / 2);

    let cacheData = this.cache.json.get("optionsSections");
    this.optionsUI = new window.OptionsUI(this);
    this.optionsUI.build(cacheData);

    this.cameras.main.ignore(this.optionsUI.domMenu);
    if (this.bgStage && this.bgStage.elements) {
      this.bgStage.elements.forEach(el => { if (el) this.domCamera.ignore(el); });
    }

    this.handleMouseMove = (e) => {
      this.rawMouseX = e.clientX;
      this.rawMouseY = e.clientY;
    };
    window.addEventListener('mousemove', this.handleMouseMove);

    this.handleResize = (gameSize) => {
      if (this.domCamera) {
        this.domCamera.setSize(gameSize.width, gameSize.height);
        this.domCamera.centerOn(gameSize.width / 2, gameSize.height / 2);
      }
      if (this.optionsUI && this.optionsUI.domMenu) {
          this.optionsUI.domMenu.setPosition(gameSize.width / 2, gameSize.height / 2);
      }
    };
    this.scale.on('resize', this.handleResize, this);

    this.globalKeyListener = (e) => {
        if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
        if (e.code === 'Tab') {
            e.preventDefault();
            if (this.optionsUI) {
                const handled = this.optionsUI.handleInput(e);
                if (!handled) this.goBack();
            }
        }
    };
    window.addEventListener('keydown', this.globalKeyListener, { passive: false });

    this.inputListener = (e) => {
      if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      if (e.code === 'Tab') return;
      
      if (this.optionsUI) {
          const handled = this.optionsUI.handleInput(e);
          if (!handled) this.goBack(); 
      }
    };
    this.input.keyboard.on('keydown', this.inputListener, this);

    this.events.on('shutdown', this.cleanUp, this);
  }

  update(time, delta) {
    if (!window.ClientGlobals || !window.ClientGlobals.isMobile) {
      this.targetCamX = (this.rawMouseX - window.innerWidth / 2) * this.parallaxIntensity;
      this.targetCamY = (this.rawMouseY - window.innerHeight / 2) * this.parallaxIntensity;
    }

    this.cameras.main.scrollX += (this.targetCamX - this.cameras.main.scrollX) * 0.1;
    this.cameras.main.scrollY += (this.targetCamY - this.cameras.main.scrollY) * 0.1;

    if (this.bgStage) this.bgStage.update(time, delta);
  }

  goBack() {
    this.sound.play("cancelMenu");
    this.scene.start("MainMenuScene"); 
  }

  cleanUp() {
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('keydown', this.globalKeyListener);
    this.scale.off('resize', this.handleResize, this);
    this.input.keyboard.off('keydown', this.inputListener, this);

    if (this.cache.json.exists("optionsSections")) this.cache.json.remove("optionsSections");
    if (this.optionsUI) this.optionsUI.destroy();
    if (this.bgStage && typeof this.bgStage.shutdown === 'function') this.bgStage.shutdown();
  }
}

window.OptionsMenuScene = OptionsMenuScene;
if (window.game) window.game.scene.add("OptionsMenuScene", window.OptionsMenuScene);