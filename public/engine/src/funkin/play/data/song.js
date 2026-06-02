// src/funkin/play/data/song.js

class Song {
    static preload(scene) {
        const pd = scene.playData;
        const path = window.Path.songs + pd.songId + '/song/';

        const timestamp = Date.now();
        const randomId = Math.floor(Math.random() * 100000);
        const bpmHash = pd.get('audio.bpm', 100);
        pd.uniqueSessionId = `${pd.songId}_${bpmHash}_${timestamp}_${randomId}`;

        pd.instKey = `inst_${pd.uniqueSessionId}`;
        pd.voicesPlayerKey = `voicesPlayer_${pd.uniqueSessionId}`;
        pd.voicesOppKey = `voicesOpp_${pd.uniqueSessionId}`;

        scene.load.audio(pd.instKey, path + pd.get('audio.instrumental.inst.file', 'Inst.ogg'));

        if (pd.get('audio.needsVoices', true)) {
            if (!pd.get('audio.multiVocal', false)) {
                scene.load.audio(pd.voicesPlayerKey, path + 'Voices.ogg');
            } else {
                scene.load.audio(pd.voicesPlayerKey, path + pd.get('audio.vocals.player.file', 'Voices-bf.ogg'));
                scene.load.audio(pd.voicesOppKey, path + pd.get('audio.vocals.opponent.file', 'Voices-pico.ogg'));
            }
        }

        ['missnote1', 'missnote2', 'missnote3'].forEach((missPath) => {
            const fullUrl = window.Path.skins + 'Funkin/miss/' + missPath + '.ogg';
            const cacheKey = `default_${missPath}_miss`;

            if (!scene.cache.audio.exists(cacheKey)) {
                scene.load.audio(cacheKey, fullUrl);
            }
        });

        const jsonKey = pd.skinJsonKey;
        const loadMissSounds = (data) => {
            const basePath = data?.global?.basePath || 'Funkin';
            const uniqueSkinId = pd.uniqueSkinId;

            let misses = data?.misses?.sounds?.path;

            if (misses) {
                if (typeof misses === 'string') misses = [misses];

                if (Array.isArray(misses)) {
                    let addedFiles = false;
                    misses.forEach((missPath) => {
                        let finalPath = missPath;
                        if (!finalPath.match(/\.[0-9a-z]+$/i)) finalPath += '.ogg';

                        const fullUrl = window.Path.skins + basePath + '/' + finalPath;
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
        };

        if (scene.cache.json.exists(jsonKey)) {
            loadMissSounds(scene.cache.json.get(jsonKey));
        } else {
            scene.load.once(`filecomplete-json-${jsonKey}`, (k, t, data) => loadMissSounds(data));
        }
    }

    constructor(scene) {
        this.scene = scene;
        const pd = scene.playData;

        this.bpm = pd.get('audio.bpm', 100);
        this.origin = pd.origin;
        this.needsVoices = pd.get('audio.needsVoices', true);
        this.multiVocal = pd.get('audio.multiVocal', false);

        this.muteMiss = false;

        this.instKey = pd.instKey;
        this.voicesPlayerKey = pd.voicesPlayerKey;
        this.voicesOppKey = pd.voicesOppKey;

        this.instTrack = null;
        this.playerTrack = null;
        this.opponentTrack = null;

        this.hasStarted = false;

        window.Conductor.mapTimeChanges([
            new window.SongTimeChange(0, this.bpm, 4, 4)
        ]);

        const crochet = (60 / this.bpm) * 1000;
        window.Conductor.songPosition = -(crochet * 4);

        this.setupTracks();
        this.setupMissSounds();

        this.scene.events.once('startSong', () => {
            this.play();
        });

        this.onNoteHitListener = this.onNoteHit.bind(this);
        this.onNoteMissListener = this.onNoteMiss.bind(this);
        this.onGhostMissListener = this.onGhostMiss.bind(this);

        this.scene.events.on('noteHit', this.onNoteHitListener);
        this.scene.events.on('noteMiss', this.onNoteMissListener);
        this.scene.events.on('ghostMiss', this.onGhostMissListener);

        this.scene.events.once('shutdown', this.shutdown, this);
    }

    setupTracks() {
        if (this.scene.cache.audio.exists(this.instKey)) {
            this.instTrack = this.scene.sound.add(this.instKey);
            this.instTrack.on('complete', () => {
                this.onSongEnd();
            });
        }

        if (this.needsVoices) {
            if (this.scene.cache.audio.exists(this.voicesPlayerKey)) {
                this.playerTrack = this.scene.sound.add(this.voicesPlayerKey);
            }
            if (this.multiVocal && this.scene.cache.audio.exists(this.voicesOppKey)) {
                this.opponentTrack = this.scene.sound.add(this.voicesOppKey);
            }
        }
    }

    setupMissSounds() {
        this.missSoundKeys = [];
        this.missVolume = 1.0;

        const skins = this.scene.referee.skins;
        if (!skins) return;

        let missPaths = skins.get('misses.sounds.path');
        this.missVolume = skins.get('misses.sounds.volume', 1.0);

        if (missPaths) {
            if (typeof missPaths === 'string') missPaths = [missPaths];
            if (Array.isArray(missPaths)) {
                missPaths.forEach(path => {
                    const cacheKey = `${skins.basePath}_${path}_${skins.uniqueId}_miss`;
                    this.missSoundKeys.push(cacheKey);
                });
            }
        } else {
            ['missnote1', 'missnote2', 'missnote3'].forEach(path => {
                this.missSoundKeys.push(`default_${path}_miss`);
            });
        }
    }

    onNoteHit(data) {
        if (!data || !data.note || !data.note.noteData) return;

        const isPlayer = data.note.noteData.p === 'pl';
        const isOpponent = data.note.noteData.p === 'op';

        if (isPlayer) {
            if (this.playerTrack && this.playerTrack.volume === 0) {
                this.playerTrack.volume = 1;
            }
        } else if (isOpponent) {
            if (this.opponentTrack && this.opponentTrack.volume === 0) {
                this.opponentTrack.volume = 1;
            } else if (this.playerTrack && this.playerTrack.volume === 0 && !this.multiVocal) {
                this.playerTrack.volume = 1;
            }
        }
    }

    onNoteMiss(data) {
        if (!data || !data.note || !data.note.noteData) return;

        const isPlayer = data.note.noteData.p === 'pl';
        const isOpponent = data.note.noteData.p === 'op';

        let isTwoPlayersActive = false;
        let playerEnemy = false;

        // CORRECCIÓN: Asignación estricta para Host = false (No es enemigo), Cliente = true (Sí es enemigo)
        if (window.isMultiplayer && window.MultiplayerData) {
            playerEnemy = !window.MultiplayerData.isHost;
            isTwoPlayersActive = false;
        } else {
            isTwoPlayersActive = window.Preferences ? window.Preferences.twoPlayers : false;
            playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;
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
                } else if (this.playerTrack && this.playerTrack.volume > 0 && !this.multiVocal) {
                    this.playerTrack.volume = 0;
                }
            }

            let isMutedByPreference = isMainPlayerMiss
                ? (window.Preferences ? window.Preferences.muteMissNote : false)
                : (window.Preferences ? window.Preferences.muteMissNoteEnemy : false);

            if (!isMutedByPreference && !this.muteMiss) {
                if (this.missSoundKeys.length > 0) {
                    const randomKey = this.missSoundKeys[Math.floor(Math.random() * this.missSoundKeys.length)];
                    if (this.scene.cache.audio.exists(randomKey)) {
                        this.scene.sound.play(randomKey, { volume: this.missVolume });
                    }
                }
            }
        }
    }

    onGhostMiss(data) {
        if (!data) return;

        let isPlayer = true;
        let isOpponent = false;

        if (data.playerId) {
            const pId = data.playerId.toLowerCase();
            if (pId === 'p1' || pId === 'host' || pId === 'local' || pId === 'pl') {
                isPlayer = true;
                isOpponent = false;
            } else if (pId === 'p2' || pId === 'guest' || pId === 'enemy' || pId === 'op') {
                isPlayer = false;
                isOpponent = true;
            }
        } else if (data.isOpponent !== undefined) {
            isOpponent = data.isOpponent;
            isPlayer = !isOpponent;
        }

        let isTwoPlayersActive = false;
        let playerEnemy = false;

        // CORRECCIÓN: Asignación estricta para Host = false (No es enemigo), Cliente = true (Sí es enemigo)
        if (window.isMultiplayer && window.MultiplayerData) {
            playerEnemy = !window.MultiplayerData.isHost;
            isTwoPlayersActive = false;
        } else {
            isTwoPlayersActive = window.Preferences ? window.Preferences.twoPlayers : false;
            playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;
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
                } else if (this.playerTrack && this.playerTrack.volume > 0 && !this.multiVocal) {
                    this.playerTrack.volume = 0;
                }
            }

            let isMutedByPreference = isMainPlayerMiss
                ? (window.Preferences ? window.Preferences.muteMissNote : false)
                : (window.Preferences ? window.Preferences.muteMissNoteEnemy : false);

            if (!isMutedByPreference && !this.muteMiss) {
                if (this.missSoundKeys.length > 0) {
                    const randomKey = this.missSoundKeys[Math.floor(Math.random() * this.missSoundKeys.length)];
                    if (this.scene.cache.audio.exists(randomKey)) {
                        this.scene.sound.play(randomKey, { volume: this.missVolume });
                    }
                }
            }
        }
    }

    play() {
        if (this.hasStarted) return;
        this.hasStarted = true;

        if (this.instTrack) this.instTrack.play();
        if (this.playerTrack) this.playerTrack.play();
        if (this.opponentTrack) this.opponentTrack.play();
    }

    shutdown() {
        this.hasStarted = false;

        this.scene.events.off('noteHit', this.onNoteHitListener);
        this.scene.events.off('noteMiss', this.onNoteMissListener);
        this.scene.events.off('ghostMiss', this.onGhostMissListener);

        const tracks = [this.instTrack, this.playerTrack, this.opponentTrack];
        tracks.forEach(track => {
            if (track) {
                track.stop();
                track.destroy();
            }
        });

        if (this.scene && this.scene.cache && this.scene.cache.audio) {
            if (this.instKey) this.scene.cache.audio.remove(this.instKey);
            if (this.voicesPlayerKey) this.scene.cache.audio.remove(this.voicesPlayerKey);
            if (this.voicesOppKey) this.scene.cache.audio.remove(this.voicesOppKey);

            if (this.missSoundKeys) {
                this.missSoundKeys.forEach(key => {
                    if (this.scene.cache.audio.exists(key)) {
                        this.scene.cache.audio.remove(key);
                    }
                });
            }
        }

        this.instTrack = null;
        this.playerTrack = null;
        this.opponentTrack = null;

        if (this.scene && this.scene.sound) {
            this.scene.sound.stopAll();
        }

        if (window.Conductor) {
            window.Conductor.songPosition = 0;
        }
    }

    onSongEnd() {
        this.shutdown();
        const target = this.origin === 'freeplay' ? 'FreeplayScene' : 'MainMenuScene';
        if (window.transitionTo) {
            window.transitionTo(this.scene, target);
        } else {
            this.scene.scene.start(target);
        }
    }

    update(time, delta) {
        if (!this.hasStarted) {
            window.Conductor.songPosition += delta;
            return;
        }

        if (!this.instTrack || !this.instTrack.isPlaying) return;

        window.Conductor.update(this.instTrack.seek * 1000);

        const masterTime = this.instTrack.seek;
        if (this.playerTrack?.isPlaying && Math.abs(this.playerTrack.seek - masterTime) > 0.01) {
            this.playerTrack.seek = masterTime;
        }
        if (this.opponentTrack?.isPlaying && Math.abs(this.opponentTrack.seek - masterTime) > 0.01) {
            this.opponentTrack.seek = masterTime;
        }
    }
}

window.Song = Song;
