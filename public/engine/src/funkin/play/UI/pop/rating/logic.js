// src/funkin/play/UI/pop/rating/logic.js

class RatingLogic {
  static preload(scene) {
    const pd = scene.playData;
    const jsonKey = pd.skinJsonKey;

    const loadRatings = (data) => {
      const basePath = data?.global?.basePath || "Funkin";
      const uniqueSkinId = pd.uniqueSkinId;
      const judgments = data?.ui?.judgments || {};

      let addedFiles = false;
      Object.keys(judgments).forEach((key) => {
        const jData = judgments[key];
        const path = jData.path || jData.assetPath;

        if (path) {
          let finalPath = path;
          if (!finalPath.match(/\.[0-9a-z]+$/i)) finalPath += ".png";

          const fullUrl = window.Path.skins + basePath + "/" + finalPath;
          const cacheKey = `judgment_${key}_${uniqueSkinId}`;

          if (!scene.textures.exists(cacheKey)) {
            scene.load.image(cacheKey, fullUrl);
            addedFiles = true;
          }
        }
      });

      if (addedFiles && !scene.load.isLoading()) {
        scene.load.start();
      }
    };

    if (scene.cache.json.exists(jsonKey)) {
      loadRatings(scene.cache.json.get(jsonKey));
    } else {
      scene.load.once(`filecomplete-json-${jsonKey}`, (k, t, data) =>
        loadRatings(data),
      );
    }
  }

  constructor(scene) {
    this.scene = scene;
    this.skins = scene.referee.skins;
    this.judgmentsData = this.skins.get("ui.judgments") || {};
    this.uniqueId = this.scene.playData.uniqueSkinId || this.skins.uniqueId;

    this.activeRatings = { p1: null, p2: null };

    this.onNoteHitListener = this.onNoteHit.bind(this);
    this.scene.events.on("noteHit", this.onNoteHitListener);
  }

  getValidRating(requested) {
    const hierarchy = ["perfect", "killer", "sick", "good", "bad", "shit"];
    let startIndex = hierarchy.indexOf(requested);

    if (startIndex === -1) startIndex = 0;

    for (let i = startIndex; i < hierarchy.length; i++) {
      const testRating = hierarchy[i];
      const ratingConfig = this.judgmentsData[testRating];

      if (ratingConfig && (ratingConfig.path || ratingConfig.assetPath)) {
        return testRating;
      }
    }
    return requested;
  }

  onNoteHit(data) {
    if (!data || !data.rating) return;

    const isMultiplayer = window.isMultiplayer || false;

    // Auto-determinamos el rol en multiplayer
    const playerEnemy = isMultiplayer
      ? window.MultiplayerData && !window.MultiplayerData.isHost
      : window.Preferences
        ? window.Preferences.playerEnemy
        : false;

    const isTwoPlayers = window.Preferences
      ? window.Preferences.twoPlayers
      : false;
    const isBotplay = window.Preferences ? window.Preferences.botplay : false;
    const showOpPopUp = window.Preferences
      ? window.Preferences.showOpPopUp !== false
      : true;

    const isOpponentNote =
      data.note && data.note.noteData && data.note.noteData.p === "op";
    const isMainPlayerNote = playerEnemy ? isOpponentNote : !isOpponentNote;

    if (isMainPlayerNote && isBotplay) return;

    // Si no es multi/2p y la nota no es del jugador, ignorar
    if (!isMainPlayerNote && !isTwoPlayers && !isMultiplayer) return;

    // Si es multi/2p, la nota es del enemigo y elegimos ocultarla, ignorar
    if (!isMainPlayerNote && (isTwoPlayers || isMultiplayer) && !showOpPopUp) {
      return;
    }

    const actualRating = this.getValidRating(data.rating);
    const ratingData = this.judgmentsData[actualRating];

    if (!ratingData) {
      console.warn(
        `[RatingLogic] No se encontró configuración en el JSON de skins para: ${actualRating}`,
      );
      return;
    }

    const cacheKey = `judgment_${actualRating}_${this.uniqueId}`;

    if (!this.scene.textures.exists(cacheKey)) {
      console.warn(
        `[RatingLogic] La imagen no está en caché. Clave buscada: ${cacheKey}`,
      );
      return;
    }

    // --- CÁLCULO DE POSICIÓN INTELIGENTE ---
    let posX = 0;
    let posY = 0;

    // Regla: Pantalla dividida SOLO si es Multi/2P Y los popups del rival NO están ocultos
    const useSplitScreen = (isTwoPlayers || isMultiplayer) && showOpPopUp;

    if (useSplitScreen) {
      // INVERTIDO: Enemigo (P2) a la izquierda, Jugador (P1) a la derecha
      if (isOpponentNote) {
        posX = this.scene.scale.width * 0.25; // 25% (Izquierda)
      } else {
        posX = this.scene.scale.width * 0.75; // 75% (Derecha)
      }
      posY = this.scene.scale.height * 0.5;
    } else {
      // Regresar a coordenadas dinámicas basadas en los porcentajes del usuario
      const posPercent =
        window.Preferences && window.Preferences.popUpPos
          ? window.Preferences.popUpPos
          : [50, 42];

      posX = this.scene.scale.width * (posPercent[0] / 100);
      posY = this.scene.scale.height * (posPercent[1] / 100);
    }
    // -----------------------------

    const scaleVal = ratingData.scale !== undefined ? ratingData.scale : 0.65;
    const sprite = new window.RatingSprite(
      this.scene,
      posX,
      posY,
      cacheKey,
      scaleVal,
    );

    if (window.Preferences && window.Preferences.popUpAnim === "stackeable") {
      const playerKey = isOpponentNote ? "p2" : "p1";

      if (
        this.activeRatings[playerKey] &&
        this.activeRatings[playerKey].active
      ) {
        this.activeRatings[playerKey].destroySprite();
      }
      this.activeRatings[playerKey] = sprite;
    }

    if (
      this.scene.referee.cameras &&
      typeof this.scene.referee.cameras.add === "function"
    ) {
      this.scene.referee.cameras.add(sprite, "ui");
    }
  }

  update(time, delta) {}

  shutdown() {
    this.scene.events.off("noteHit", this.onNoteHitListener);
  }
}

window.RatingLogic = RatingLogic;
