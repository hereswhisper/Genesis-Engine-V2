class HealthLogic {
    static preload(scene) {
        const pd = scene.playData;
        const jsonKey = pd.skinJsonKey;

        const loadHealthBar = (data) => {
            const basePath = data?.global?.basePath || 'Funkin';
            const uniqueSkinId = pd.uniqueSkinId;

            const barPath = data?.ui?.bars?.health?.path || 'bars/healthBar';

            let finalPath = barPath;
            if (!finalPath.match(/\.[0-9a-z]+$/i)) finalPath += '.png';

            const fullUrl = window.Path.skins + basePath + '/' + finalPath;
            const cacheKey = `health_bar_${uniqueSkinId}`;

            if (!scene.textures.exists(cacheKey)) {
                scene.load.image(cacheKey, fullUrl);
            }
        };

        if (scene.cache.json.exists(jsonKey)) {
            loadHealthBar(scene.cache.json.get(jsonKey));
        } else {
            scene.load.once(`filecomplete-json-${jsonKey}`, (k, t, data) => loadHealthBar(data));
        }
    }

    constructor(scene) {
        this.scene = scene;

        // Rango de Valores: Mínimo 0 (Oponente P2 gana), Máximo 2 (Jugador P1 gana)
        this.health = 1.0;
        this.healthLerp = 1.0;
        this.currentHealth = 1.0;
        this.isGameOver = false;

        window.Health = this;

        this.renderer = new window.HealthRenderer(this.scene, this);
    }

    resetHealth() {
        this.health = 1.0;
        this.healthLerp = 1.0;
        this.currentHealth = 1.0;
        this.isGameOver = false;
    }

    applyHit(rating, isOpponent = false) {
        const isTwoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;
        const playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;
        const isBotplay = window.Preferences ? window.Preferences.botplay : false;

        const isMainPlayerAction = playerEnemy ? isOpponent : !isOpponent;

        // Si es botplay y la accion es del humano, ignoramos
        if (isMainPlayerAction && isBotplay) return;
        // En un jugador, ignoramos los aciertos de la IA
        if (!isTwoPlayers && !isMainPlayerAction) return;

        let healthChange = 0;
        switch (rating?.toLowerCase()) {
            case 'perfect':
            case 'killer': healthChange = 0.04; break;
            case 'sick': healthChange = 0.03; break;
            case 'good': healthChange = 0.015; break;
            case 'bad': healthChange = 0.0; break;
            case 'shit': healthChange = -0.02; break;
        }

        // LÓGICA DIRECCIONAL: P2 (isOpponent) empuja a 0, P1 empuja a 2.
        if (isOpponent) {
            this.health -= healthChange;
        } else {
            this.health += healthChange;
        }

        this.health = Phaser.Math.Clamp(this.health, 0, 2);
        this.currentHealth = this.health;
    }

    applyMiss(isOpponent = false) {
        const isTwoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;
        const playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;
        const isBotplay = window.Preferences ? window.Preferences.botplay : false;

        const isMainPlayerAction = playerEnemy ? isOpponent : !isOpponent;

        // Botplay no castiga fallos
        if (isMainPlayerAction && isBotplay) return;
        // Ignoramos fallos del bot en 1 jugador
        if (!isTwoPlayers && !isMainPlayerAction) return;

        const missLoss = 0.08;
        if (isOpponent) {
            this.health += missLoss; // P2 falla -> P1 gana
        } else {
            this.health -= missLoss; // P1 falla -> P2 gana
        }

        this.health = Phaser.Math.Clamp(this.health, 0, 2);
        this.currentHealth = this.health;
    }

    applyGhostMiss(isOpponent = false) {
        const isTwoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;
        const playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;
        const isBotplay = window.Preferences ? window.Preferences.botplay : false;

        const isMainPlayerAction = playerEnemy ? isOpponent : !isOpponent;

        if (isMainPlayerAction && isBotplay) return;
        if (!isTwoPlayers && !isMainPlayerAction) return;

        const ghostLoss = 0.04;
        if (isOpponent) {
            this.health += ghostLoss; // P2 falla
        } else {
            this.health -= ghostLoss; // P1 falla
        }

        this.health = Phaser.Math.Clamp(this.health, 0, 2);
        this.currentHealth = this.health;
    }

    applyHold(delta, isOpponent = false) {
        const isTwoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;
        const playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;
        const isBotplay = window.Preferences ? window.Preferences.botplay : false;

        const isMainPlayerAction = playerEnemy ? isOpponent : !isOpponent;

        if (isMainPlayerAction && isBotplay) return;
        if (!isTwoPlayers && !isMainPlayerAction) return;

        const holdGain = 0.005 * (delta / 16);
        if (isOpponent) {
            this.health -= holdGain;
        } else {
            this.health += holdGain;
        }

        this.health = Phaser.Math.Clamp(this.health, 0, 2);
        this.currentHealth = this.health;
    }

    checkGameOver(scene) {
        const playerEnemy = window.Preferences ? window.Preferences.playerEnemy : false;
        const isTwoPlayers = window.Preferences ? window.Preferences.twoPlayers : false;
        const evtScene = scene || this.scene;

        if (this.health <= 0) {
            this.health = 0;
            this.currentHealth = 0;

            if (!this.isGameOver) {
                this.isGameOver = true;
                if (isTwoPlayers) {
                    console.log("[HealthLogic] Game Over: ¡El Jugador 1 (P1) ha perdido!");
                    if (evtScene.events) evtScene.events.emit('gameover_p1');
                } else {
                    if (playerEnemy) {
                        console.log("[HealthLogic] ¡Felicidades! Has derrotado al bot (Jugador 1).");
                    } else {
                        console.log("[HealthLogic] Game Over: ¡Has perdido la partida!");
                        if (evtScene.events) evtScene.events.emit('gameover');
                    }
                }
            }
        }
        else if (this.health >= 2) {
            this.health = 2;
            this.currentHealth = 2;

            if (!this.isGameOver) {
                this.isGameOver = true;
                if (isTwoPlayers) {
                    console.log("[HealthLogic] Game Over: ¡El Jugador 2 (P2) ha perdido!");
                    if (evtScene.events) evtScene.events.emit('gameover_p2');
                } else {
                    if (playerEnemy) {
                        console.log("[HealthLogic] Game Over: ¡Has perdido (jugando como Enemigo)!");
                        if (evtScene.events) evtScene.events.emit('gameover');
                    } else {
                        console.log("[HealthLogic] ¡Felicidades! Has derrotado al Enemigo (P2/bot).");
                    }
                }
            }
        }
        else {
            // Si la vida vuelve a estar en el rango seguro (mayor a 0 y menor a 2), reseteamos el GameOver
            this.isGameOver = false;
        }
    }

    update(time, delta) {
        this.healthLerp = this.healthLerp + (this.health - this.healthLerp) * 0.15;
        if (isNaN(this.healthLerp)) this.healthLerp = this.health;

        if (this.renderer && typeof this.renderer.update === 'function') {
            this.renderer.update(time, delta);
        }
    }

    shutdown() {
        if (this.renderer && typeof this.renderer.destroy === 'function') {
            this.renderer.destroy();
        }
    }
}

window.HealthLogic = HealthLogic;
