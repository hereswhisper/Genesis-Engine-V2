import { getAnimations, buildAtlas } from "./parser.js";
import { computeBounds, renderFrame } from "./renderer.js";

export const atlasCache = new Map();

function defineLoaderFile(Phaser) {
  class BTAFile extends Phaser.Loader.MultiFile {
    constructor(loader, key, pngURL, smURL, animURL) {
      const png = new Phaser.Loader.FileTypes.ImageFile(
        loader,
        key + "__bta_png",
        pngURL,
      );
      const sm = new Phaser.Loader.FileTypes.JSONFile(
        loader,
        key + "__bta_sm",
        smURL,
      );
      const anim = new Phaser.Loader.FileTypes.JSONFile(
        loader,
        key + "__bta_anim",
        animURL,
      );
      super(loader, "btaAtlas", key, [png, sm, anim]);
      this._userKey = key;
    }

    addToCache() {
      if (this.isReadyToProcess()) {
        const png = this.files[0];
        const sm = this.files[1];
        const anim = this.files[2];

        png.addToCache();
        sm.addToCache();
        anim.addToCache();

        const image = png.data;
        const smJson = this.loader.cacheManager.json.get(sm.key);
        const animJson = this.loader.cacheManager.json.get(anim.key);

        try {
          const atlas = buildAtlas(image, smJson, animJson);
          atlasCache.set(this._userKey, atlas);
          this.complete = true;
        } catch (err) {
          console.error(
            'WebMaps: failed to build atlas "' + this._userKey + '":',
            err,
          );
          this.complete = true;
        }
      }
    }
  }
  return BTAFile;
}

function defineGameObject(Phaser) {
  // Al heredar de Image, heredamos TODOS los métodos nativos de Phaser automáticamente
  class BTAGameObject extends Phaser.GameObjects.Image {
    constructor(scene, x, y, key) {
      const data = atlasCache.get(key);
      if (!data)
        throw new Error('WebMaps: BTA atlas not loaded: "' + key + '"');

      const startW = Math.max(2, data.width || 256);
      const startH = Math.max(2, data.height || 256);
      const texKey =
        "__bta__" + key + "_" + Math.random().toString(36).slice(2);
      const tex = scene.textures.createCanvas(texKey, startW, startH);

      super(scene, x, y, texKey);

      this.atlas = data;
      this.atlasKey = key;
      this._tex = tex;
      this._canvas = tex.getSourceImage();
      this.fps = data.fps;
      this.loop = true;
      this.onComplete = null;

      this.animations = getAnimations(data);
      this.labelNames = this.animations.map((a) => a.name);

      this._currentAnim = null;
      this._frame = 0;
      this._acc = 0;
      this._tx = 0;
      this._ty = 0;
      this._playing = false;
    }

    // Integración nativa para que la escena haga el "tick"
    preUpdate(time, delta) {
      if (!this._currentAnim || !this._playing) return;
      if (delta == null) delta = 1000 / 60;

      this._acc += delta;
      const fd = 1000 / Math.max(1, this.fps);
      let advanced = false;

      while (this._acc >= fd) {
        this._acc -= fd;
        this._frame++;
        if (this._frame >= this._currentAnim.duration) {
          if (this.loop) {
            this._frame = 0;
          } else {
            this._frame = this._currentAnim.duration - 1;
            this._playing = false;
            if (this.onComplete) this.onComplete(this._currentAnim.name);
            break;
          }
        }
        advanced = true;
      }
      if (advanced) this._renderCurrent();
    }

    playAnim(animName, force = false) {
      const a = this.animations.find((x) => x.name === animName);
      if (!a) {
        console.warn('WebMaps: animation not found: "' + animName + '"');
        return this;
      }
      if (!force && this._currentAnim === a) return this;

      this._currentAnim = a;
      this._frame = 0;
      this._acc = 0;
      this._playing = true;
      this._fitCanvas();
      this._renderCurrent();
      return this;
    }

    stopAnim() {
      this._playing = false;
      return this;
    }
    pauseAnim() {
      this._playing = false;
      return this;
    }
    resumeAnim() {
      if (this._currentAnim) this._playing = true;
      return this;
    }

    gotoFrame(i) {
      if (!this._currentAnim) return this;
      const total = this._currentAnim.duration;
      this._frame = Math.max(0, Math.min(total - 1, i | 0));
      this._renderCurrent();
      return this;
    }

    get currentAnimation() {
      return this._currentAnim ? this._currentAnim.name : null;
    }

    _fitCanvas() {
      const PAD = 8;
      const b = computeBounds(this.atlas, this._currentAnim);
      let w, h;
      if (b) {
        w = Math.max(2, b.width + PAD * 2);
        h = Math.max(2, b.height + PAD * 2);
        this._tx = -Math.floor(b.minX) + PAD;
        this._ty = -Math.floor(b.minY) + PAD;
      } else {
        w = Math.max(2, this.atlas.width || 256);
        h = Math.max(2, this.atlas.height || 256);
        this._tx = 0;
        this._ty = 0;
      }
      if (this._canvas.width !== w || this._canvas.height !== h) {
        this._tex.setSize(w, h);
      }
      this.setDisplayOrigin(this._tx, this._ty);
    }

    _renderCurrent() {
      renderFrame(this.atlas, this._currentAnim, this._frame, this._canvas, {
        tx: this._tx,
        ty: this._ty,
      });
      this._tex.refresh();
    }

    destroy(fromScene) {
      try {
        if (this._tex && this.scene && this.scene.textures) {
          this.scene.textures.remove(this._tex.key);
        }
      } catch (e) {}
      super.destroy(fromScene);
    }
  }
  return BTAGameObject;
}

let _registered = false;

export function registerPhaser(Phaser, WebMapsObj) {
  if (_registered) return;
  if (!Phaser || !Phaser.GameObjects || !Phaser.Loader) {
    throw new Error("WebMaps.registerPhaser: a Phaser 3 instance is required");
  }

  const BTAFile = defineLoaderFile(Phaser);
  const BTAGameObject = defineGameObject(Phaser);

  // --- LOADER NATIVO ---
  Phaser.Loader.FileTypesManager.register(
    "BTA",
    function (key, pathOrPng, smJson, animJson) {
      let png, sm, anim;

      if (typeof key === "object") {
        png = key.png;
        sm = key.spritemap;
        anim = key.animation;
        key = key.key;
      } else if (smJson && animJson) {
        // MODO MANUAL (los 3 archivos)
        png = pathOrPng;
        sm = smJson;
        anim = animJson;
      } else {
        // MODO CARPETA
        png = `${pathOrPng}/spritemap1.png`;
        sm = `${pathOrPng}/spritemap1.json`;
        anim = `${pathOrPng}/Animation.json`;
      }

      const multifile = new BTAFile(this, key, png, sm, anim);
      this.addFile(multifile.files);
      return this;
    },
  );

  // --- FACTORY NATIVO ---
  Phaser.GameObjects.GameObjectFactory.register("BTA", function (x, y, key) {
    const go = new BTAGameObject(this.scene, x, y, key);
    this.displayList.add(go);
    this.updateList.add(go); // Añade al bucle de físicas y preUpdate de Phaser
    return go;
  });

  Phaser.GameObjects.GameObjectCreator.register(
    "BTA",
    function (config, addToScene) {
      const go = new BTAGameObject(
        this.scene,
        config.x || 0,
        config.y || 0,
        config.key,
      );
      if (addToScene !== false) {
        this.displayList.add(go);
        this.updateList.add(go);
      }
      return go;
    },
  );

  WebMapsObj.BTA = BTAGameObject;
  Phaser.WebMaps = WebMapsObj;
  _registered = true;
}
