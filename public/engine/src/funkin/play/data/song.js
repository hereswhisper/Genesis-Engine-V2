// src/funkin/play/data/song.js
class Song {
  static preload(scene) {
    try {
      const pd = scene.playData;
      const path = window.Path.songs + pd.songId + "/song/";
      
      const bpmHash = pd.get("audio.bpm", 100);
      
      // FIX: Añadida dificultad y Date.now() para forzar que sea SIEMPRE único
      // Evita colisiones de cache y que se repita la música anterior.
      const diffHash = pd.get("difficulty", "normal");
      pd.uniqueSessionId = `${pd.songId}_${diffHash}_${bpmHash}_${Date.now()}`;
      
      pd.instKey = `inst_${pd.uniqueSessionId}`;
      pd.voicesPlayerKey = `voicesPlayer_${pd.uniqueSessionId}`;
      pd.voicesOppKey = `voicesOpp_${pd.uniqueSessionId}`;
      
      // Eliminamos el cache-buster (?cb=) para restaurar la carga estable
      if (!scene.cache.audio.exists(pd.instKey)) {
        scene.load.audio(
          pd.instKey,
          path + pd.get("audio.instrumental.inst.file", "Inst.ogg")
        );
      }
      
      if (pd.get("audio.needsVoices", true)) {
        if (!pd.get("audio.multiVocal", false)) {
          if (!scene.cache.audio.exists(pd.voicesPlayerKey)) {
            scene.load.audio(pd.voicesPlayerKey, path + "Voices.ogg");
          }
        } else {
          if (!scene.cache.audio.exists(pd.voicesPlayerKey)) {
            scene.load.audio(
              pd.voicesPlayerKey,
              path + pd.get("audio.vocals.player.file", "Voices-bf.ogg")
            );
          }
          if (!scene.cache.audio.exists(pd.voicesOppKey)) {
            scene.load.audio(
              pd.voicesOppKey,
              path + pd.get("audio.vocals.opponent.file", "Voices-pico.ogg")
            );
          }
        }
      }
      
      ["missnote1", "missnote2", "missnote3"].forEach((missPath) => {
        const fullUrl = window.Path.skins + "Funkin/miss/" + missPath + ".ogg";
        const cacheKey = `default_${missPath}_miss`;
        if (!scene.cache.audio.exists(cacheKey)) {
          scene.load.audio(cacheKey, fullUrl);
        }
      });
      
      const jsonKey = pd.skinJsonKey;
      const loadMissSounds = (data) => {
        try {
          const basePath = data?.global?.basePath || "Funkin";
          const uniqueSkinId = pd.uniqueSkinId;
          let misses = data?.misses?.sounds?.path;
          if (misses) {
            if (typeof misses === "string") misses = [misses];
            if (Array.isArray(misses)) {
              let addedFiles = false;
              misses.forEach((missPath) => {
                let finalPath = missPath;
                if (!finalPath.match(/\.[0-9a-z]+$/i)) finalPath += ".ogg";
                const fullUrl = window.Path.skins + basePath + "/" + finalPath;
                const cacheKey = `${basePath}_${missPath}_${uniqueSkinId}_miss`;
                if (!scene.cache.audio.exists(cacheKey)) {
                  scene.load.audio(cacheKey, fullUrl);
                  addedFiles = true;
                }
              });
              if (addedFiles && !scene.load.isLoading()) {
                scene.load.start();
              }
            }
          }
        } catch (e) {
          console.warn("[Song] Error cargando miss sounds:", e);
        }
      };
      
      if (scene.cache.json.exists(jsonKey)) {
        loadMissSounds(scene.cache.json.get(jsonKey));
      } else {
        scene.load.once(`filecomplete-json-${jsonKey}`, (k, t, data) =>
          loadMissSounds(data)
        );
      }
    } catch (e) {
      console.error("[Song] Error crítico en preload:", e);
    }
  }
  constructor(scene) {
    this.scene = scene;
    const pd = scene.playData;
    this.bpm = pd.get("audio.bpm", 100);
    this.origin = pd.origin;
    this.needsVoices = pd.get("audio.needsVoices", true);
    this.multiVocal = pd.get("audio.multiVocal", false);
    this.muteMiss = false;
    this.instKey = pd.instKey;
    this.voicesPlayerKey = pd.voicesPlayerKey;
    this.voicesOppKey = pd.voicesOppKey;
    this.instTrack = null;
    this.playerTrack = null;
    this.opponentTrack = null;
    this.hasStarted = false;
    window.Conductor.mapTimeChanges([
      new window.SongTimeChange(0, this.bpm, 4, 4),
    ]);
    const crochet = (60 / this.bpm) * 1000;
    window.Conductor.songPosition = -(crochet * 4);
    this.setupTracks();
    this.setupMissSounds();
    this.scene.events.once("startSong", () => {
      this.play();
    });
    this.onNoteHitListener = this.onNoteHit.bind(this);
    this.onNoteMissListener = this.onNoteMiss.bind(this);
    this.onGhostMissListener = this.onGhostMiss.bind(this);
    this.scene.events.on("noteHit", this.onNoteHitListener);
    this.scene.events.on("noteMiss", this.onNoteMissListener);
    this.scene.events.on("ghostMiss", this.onGhostMissListener);
    this.scene.events.once("shutdown", this.shutdown, this);
  }
  setupTracks() {
    try {
      if (this.scene.cache.audio.exists(this.instKey)) {
        this.instTrack = this.scene.sound.add(this.instKey);
        this.instTrack.on("complete", () => this.onSongEnd());
      } else {
        console.warn(`[Song] Instrumental no encontrado en cache: ${this.instKey}. Se jugará sin música principal.`);
      }
      if (this.needsVoices) {
        if (this.scene.cache.audio.exists(this.voicesPlayerKey)) {
          this.playerTrack = this.scene.sound.add(this.voicesPlayerKey);
          if (!this.instTrack)
            this.playerTrack.on("complete", () => this.onSongEnd());
        }
        if (
          this.multiVocal &&
          this.scene.cache.audio.exists(this.voicesOppKey)
        ) {
          this.opponentTrack = this.scene.sound.add(this.voicesOppKey);
          if (!this.instTrack && !this.playerTrack)
            this.opponentTrack.on("complete", () => this.onSongEnd());
        }
      }
    } catch (e) {
      console.error("[Song] Error al configurar pistas:", e);
    }
  }
  setupMissSounds() {
    try {
      this.missSoundKeys = [];
      this.missVolume = 1.0;
      const skins = this.scene.referee.skins;
      if (!skins) return;
      let missPaths = skins.get("misses.sounds.path");
      this.missVolume = skins.get("misses.sounds.volume", 1.0);
      if (missPaths) {
        if (typeof missPaths === "string") missPaths = [missPaths];
        if (Array.isArray(missPaths)) {
          missPaths.forEach((path) => {
            const cacheKey = `${skins.basePath}_${path}_${skins.uniqueId}_miss`;
            this.missSoundKeys.push(cacheKey);
          });
        }
      } else {
        ["missnote1", "missnote2", "missnote3"].forEach((path) => {
          this.missSoundKeys.push(`default_${path}_miss`);
        });
      }
    } catch (e) {}
  }
  onNoteHit(data) {
    try {
      if (!data || !data.note || !data.note.noteData) return;
      const isPlayer = data.note.noteData.p === "pl";
      const isOpponent = data.note.noteData.p === "op";
      if (isPlayer) {
        if (this.playerTrack && this.playerTrack.volume === 0) {
          this.playerTrack.volume = 1;
        }
      } else if (isOpponent) {
        if (this.opponentTrack && this.opponentTrack.volume === 0) {
          this.opponentTrack.volume = 1;
        } else if (
          this.playerTrack &&
          this.playerTrack.volume === 0 &&
          !this.multiVocal
        ) {
          this.playerTrack.volume = 1;
        }
      }
    } catch (e) {}
  }
  onNoteMiss(data) {
    try {
      if (!data || !data.note || !data.note.noteData) return;
      const isPlayer = data.note.noteData.p === "pl";
      const isOpponent = data.note.noteData.p === "op";
      let isTwoPlayersActive = false;
      let playerEnemy = false;
      if (window.isMultiplayer && window.MultiplayerData) {
        playerEnemy = !window.MultiplayerData.isHost;
        isTwoPlayersActive = false;
      } else {
        isTwoPlayersActive = window.Preferences
          ? window.Preferences.twoPlayers
          : false;
        playerEnemy = window.Preferences
          ? window.Preferences.playerEnemy
          : false;
      }
      const isMainPlayerMiss = playerEnemy ? isOpponent : isPlayer;
      if (isMainPlayerMiss || (isTwoPlayersActive && !isMainPlayerMiss)) {
        if (isPlayer) {
          if (this.playerTrack && this.playerTrack.volume > 0) {
            this.playerTrack.volume = 0;
          }
        } else if (isOpponent) {
          if (this.opponentTrack && this.opponentTrack.volume > 0) {
            this.opponentTrack.volume = 0;
          } else if (
            this.playerTrack &&
            this.playerTrack.volume > 0 &&
            !this.multiVocal
          ) {
            this.playerTrack.volume = 0;
          }
        }
        let isMutedByPreference = isMainPlayerMiss
          ? window.Preferences
            ? window.Preferences.muteMissNote
            : false
          : window.Preferences
            ? window.Preferences.muteMissNoteEnemy
            : false;
        if (!isMutedByPreference && !this.muteMiss) {
          if (this.missSoundKeys.length > 0) {
            const randomKey =
              this.missSoundKeys[
                Math.floor(Math.random() * this.missSoundKeys.length)
              ];
            if (this.scene.cache.audio.exists(randomKey)) {
              this.scene.sound.play(randomKey, { volume: this.missVolume });
            }
          }
        }
      }
    } catch (e) {}
  }
  onGhostMiss(data) {
    try {
      if (!data) return;
      let isPlayer = true;
      let isOpponent = false;
      if (data.playerId) {
        const pId = data.playerId.toLowerCase();
        if (pId === "p1" || pId === "host" || pId === "local" || pId === "pl") {
          isPlayer = true;
          isOpponent = false;
        } else if (
          pId === "p2" ||
          pId === "guest" ||
          pId === "enemy" ||
          pId === "op"
        ) {
          isPlayer = false;
          isOpponent = true;
        }
      } else if (data.isOpponent !== undefined) {
        isOpponent = data.isOpponent;
        isPlayer = !isOpponent;
      }
      let isTwoPlayersActive = false;
      let playerEnemy = false;
      if (window.isMultiplayer && window.MultiplayerData) {
        playerEnemy = !window.MultiplayerData.isHost;
        isTwoPlayersActive = false;
      } else {
        isTwoPlayersActive = window.Preferences
          ? window.Preferences.twoPlayers
          : false;
        playerEnemy = window.Preferences
          ? window.Preferences.playerEnemy
          : false;
      }
      const isMainPlayerMiss = playerEnemy ? isOpponent : isPlayer;
      if (isMainPlayerMiss || (isTwoPlayersActive && !isMainPlayerMiss)) {
        if (isPlayer) {
          if (this.playerTrack && this.playerTrack.volume > 0) {
            this.playerTrack.volume = 0;
          }
        } else if (isOpponent) {
          if (this.opponentTrack && this.opponentTrack.volume > 0) {
            this.opponentTrack.volume = 0;
          } else if (
            this.playerTrack &&
            this.playerTrack.volume > 0 &&
            !this.multiVocal
          ) {
            this.playerTrack.volume = 0;
          }
        }
        let isMutedByPreference = isMainPlayerMiss
          ? window.Preferences
            ? window.Preferences.muteMissNote
            : false
          : window.Preferences
            ? window.Preferences.muteMissNoteEnemy
            : false;
        if (!isMutedByPreference && !this.muteMiss) {
          if (this.missSoundKeys.length > 0) {
            const randomKey =
              this.missSoundKeys[
                Math.floor(Math.random() * this.missSoundKeys.length)
              ];
            if (this.scene.cache.audio.exists(randomKey)) {
              this.scene.sound.play(randomKey, { volume: this.missVolume });
            }
          }
        }
      }
    } catch (e) {}
  }
  play() {
    if (this.hasStarted) return;
    this.hasStarted = true;
    try {
      if (this.instTrack) this.instTrack.play();
      if (this.playerTrack) this.playerTrack.play();
      if (this.opponentTrack) this.opponentTrack.play();
    } catch (e) {
      console.error("[Song] Error al iniciar audios:", e);
    }
  }
  pause() {
    try {
      if (this.instTrack && this.instTrack.isPlaying) this.instTrack.pause();
      if (this.playerTrack && this.playerTrack.isPlaying)
        this.playerTrack.pause();
      if (this.opponentTrack && this.opponentTrack.isPlaying)
        this.opponentTrack.pause();
    } catch (e) {}
  }
  resume() {
    try {
      if (this.instTrack && this.instTrack.isPaused) this.instTrack.resume();
      if (this.playerTrack && this.playerTrack.isPaused)
        this.playerTrack.resume();
      if (this.opponentTrack && this.opponentTrack.isPaused)
        this.opponentTrack.resume();
    } catch (e) {}
  }
  shutdown() {
    try {
      this.hasStarted = false;
      if (this.scene && this.scene.events) {
        this.scene.events.off("noteHit", this.onNoteHitListener);
        this.scene.events.off("noteMiss", this.onNoteMissListener);
        this.scene.events.off("ghostMiss", this.onGhostMissListener);
      }
      const tracks = [this.instTrack, this.playerTrack, this.opponentTrack];
      tracks.forEach((track) => {
        if (track) {
          try {
            track.stop();
            track.destroy();
          } catch (e) {}
        }
      });
      this.instTrack = null;
      this.playerTrack = null;
      this.opponentTrack = null;
      
      // FIX: Asegurar que el audio anterior se limpie de la RAM completamente al cerrar
      if (this.scene && this.scene.cache) {
        if (this.instKey) this.scene.cache.audio.remove(this.instKey);
        if (this.voicesPlayerKey) this.scene.cache.audio.remove(this.voicesPlayerKey);
        if (this.voicesOppKey) this.scene.cache.audio.remove(this.voicesOppKey);
      }
      
      if (window.Conductor) {
        window.Conductor.songPosition = 0;
      }
    } catch (e) {
      console.error("[Song] Fallo silencioso en shutdown", e);
    }
  }
  onSongEnd() {
    try {
      this.shutdown();
      const target =
        this.origin === "freeplay" ? "FreeplayScene" : "MainMenuScene";
      if (window.transitionTo) {
        window.transitionTo(this.scene, target);
      } else {
        this.scene.scene.start(target);
      }
    } catch (e) {
      console.error("[Song] Error al finalizar la canción:", e);
    }
  }
  update(time, delta) {
    if (!this.hasStarted) {
      window.Conductor.songPosition += delta;
      return;
    }
    try {
      let masterTrack = this.instTrack;
      if (!masterTrack || (!masterTrack.isPlaying && !masterTrack.isPaused)) {
        if (
          this.playerTrack &&
          (this.playerTrack.isPlaying || this.playerTrack.isPaused)
        ) {
          masterTrack = this.playerTrack;
        } else if (
          this.opponentTrack &&
          (this.opponentTrack.isPlaying || this.opponentTrack.isPaused)
        ) {
          masterTrack = this.opponentTrack;
        }
      }
      if (masterTrack && (masterTrack.isPlaying || masterTrack.isPaused)) {
        window.Conductor.update(masterTrack.seek * 1000);
        const masterTime = masterTrack.seek;
        if (
          this.playerTrack &&
          masterTrack !== this.playerTrack &&
          Math.abs(this.playerTrack.seek - masterTime) > 0.05
        ) {
          this.playerTrack.seek = masterTime;
        }
        if (
          this.opponentTrack &&
          masterTrack !== this.opponentTrack &&
          Math.abs(this.opponentTrack.seek - masterTime) > 0.05
        ) {
          this.opponentTrack.seek = masterTime;
        }
        if (
          this.instTrack &&
          masterTrack !== this.instTrack &&
          Math.abs(this.instTrack.seek - masterTime) > 0.05
        ) {
          this.instTrack.seek = masterTime;
        }
      } else {
        window.Conductor.songPosition += delta;
        window.Conductor.update(window.Conductor.songPosition);
      }
    } catch (e) {
      window.Conductor.songPosition += delta;
      window.Conductor.update(window.Conductor.songPosition);
    }
  }
}
window.Song = Song;