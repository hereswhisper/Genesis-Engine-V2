// src/funkin/play/stage/xml.js

class StageXML {
    static getImgPath(folder, namePath) {
        const hasExt = /\.[a-zA-Z0-9]+$/.test(namePath);
        const isCustomPath = namePath.includes('/');
        const finalName = hasExt ? namePath : namePath + '.png';

        return window.Path.stages + (isCustomPath ? finalName : folder + '/' + finalName);
    }

    static getXmlPath(folder, namePath) {
        const isCustomPath = namePath.includes('/');
        const base = namePath.replace(/\.[a-zA-Z0-9]+$/, '');

        return window.Path.stages + (isCustomPath ? base + '.xml' : folder + '/' + base + '.xml');
    }

    static preload(scene, folder, item) {
        const key = `stage_${folder}_${item.namePath}`;
        if (!scene.textures.exists(key)) {
            scene.load.atlasXML(key, this.getImgPath(folder, item.namePath), this.getXmlPath(folder, item.namePath));
        }
    }

    // FIX VISUAL: Los XML de FNF están recortados y rompen las coordenadas de Phaser.
    // Esto re-ensambla la textura antes de usarla.
    static fixTextureTrims(scene, atlasKey) {
        const texture = scene.textures.get(atlasKey);
        if (!texture || texture.key === '__MISSING' || texture.customTrimFixed) return;

        Object.values(texture.frames).forEach(frame => {
            if (frame.trimmed && frame.sourceSize) {
                frame.realWidth = frame.sourceSize.w;
                frame.realHeight = frame.sourceSize.h;
            }
        });
        texture.customTrimFixed = true;
    }

    static build(scene, folder, item) {
        const key = `stage_${folder}_${item.namePath}`;
        
        this.fixTextureTrims(scene, key);

        let firstFrame = null;
        const texture = scene.textures.get(key);
        if (texture && texture.key !== '__MISSING') {
            const frames = texture.getFrameNames();
            if (frames.length > 0) {
                firstFrame = frames.find(f => f !== '__BASE') || frames[0];
            }
        }

        const sprite = scene.add.sprite(0, 0, key, firstFrame);

        sprite.setOrigin(0, 0);
        // Desactivamos el pivot central automático si el frame estaba recortado
        if (sprite.frame && sprite.frame.trimmed) {
            sprite.setDisplayOrigin(0, 0); 
        }

        let firstAnimKey = null;

        if (item.animation && item.animation.play_list) {
            for (const [animName, animData] of Object.entries(item.animation.play_list)) {
                const animKey = `${key}_${animName}`;
                if (!firstAnimKey) firstAnimKey = animKey;

                if (!scene.anims.exists(animKey)) {
                    const prefix = animData.prefix || "";
                    const cleanPrefix = prefix.trim().toLowerCase().replace(/\s+/g, "");
                    
                    const allFrames = texture ? texture.getFrameNames().filter(f => {
                        if (f === '__BASE') return false;
                        const cleanF = f.trim().toLowerCase().replace(/\s+/g, "");
                        return f.startsWith(prefix) || cleanF.startsWith(cleanPrefix);
                    }).sort() : [];

                    let frames = [];

                    if (animData.indices && animData.indices.length > 0) {
                        frames = animData.indices.map(idx => {
                            const parsedIdx = parseInt(idx, 10);
                            return { key: key, frame: allFrames[parsedIdx] || allFrames[0] };
                        });
                    } else {
                        frames = allFrames.map(f => ({ key: key, frame: f }));
                    }

                    if (frames.length > 0 && frames[0].frame) {
                        scene.anims.create({
                            key: animKey,
                            frames: frames,
                            frameRate: item.animation.frameRate || 24,
                            repeat: item.animation.play_mode === 'Loop' ? -1 : 0
                        });
                    }
                }
            }

            if (firstAnimKey && scene.anims.exists(firstAnimKey)) {
                sprite.play(firstAnimKey);
                sprite.anims.update(0, 0); // Fuerzo render inmediato del primer frame

                if (item.animation.play_mode === 'Beat') {
                    sprite.anims.stop();
                }
            }
        }

        sprite.onBeatHit = function(curBeat) {
            if (item.animation && item.animation.play_mode === 'Beat') {
                const beatFreq = item.animation.beat ? item.animation.beat[0] : 1;
                if (curBeat % beatFreq === 0) {
                    const anims = Object.keys(item.animation.play_list);
                    if (anims.includes('left') && anims.includes('right')) {
                        const dir = (curBeat % 2 === 0) ? 'left' : 'right';
                        this.play(`${key}_${dir}`, true);
                    } else if (anims.length > 0) {
                        this.play(`${key}_${anims[0]}`, true);
                    }
                }
            }
        };

        sprite.update = function(time, delta) {};

        return sprite;
    }
}

window.StageXML = StageXML;