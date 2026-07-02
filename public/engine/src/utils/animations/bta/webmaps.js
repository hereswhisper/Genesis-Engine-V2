import { buildAtlas, getAnimations, getFrameCount, getFps } from "./parser.js";
import { computeBounds, renderFrame } from "./renderer.js";
import { registerPhaser, atlasCache } from "./phaser-plugin.js";

async function load(png, smJson, animJson) {
  function readText(input) {
    if (typeof input === "string") return fetch(input).then((r) => r.text());
    if (input && typeof input.text === "function") return input.text();
    return Promise.reject(new Error("Expected URL/File/Blob"));
  }
  function readImage(input) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let url,
        revoke = false;
      if (typeof input === "string") {
        img.crossOrigin = "anonymous";
        url = input;
      } else {
        url = URL.createObjectURL(input);
        revoke = true;
      }
      img.onload = () => {
        if (revoke) URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        if (revoke) URL.revokeObjectURL(url);
        reject(new Error("PNG load failed"));
      };
      img.src = url;
    });
  }

  const [smT, animT, image] = await Promise.all([
    typeof smJson === "object" && !smJson.text ? null : readText(smJson),
    typeof animJson === "object" && !animJson.text ? null : readText(animJson),
    readImage(png),
  ]);

  const sm = smT ? smT : smJson;
  const anim = animT ? animT : animJson;

  return buildAtlas(image, sm, anim);
}

const WebMaps = {
  load,
  buildAtlas,
  getAnimations,
  getFrameCount,
  getFps,
  computeBounds,
  renderFrame,
  _atlasCache: atlasCache,
  registerPhaser: function (PhaserObj) {
    registerPhaser(PhaserObj, WebMaps);
  },
};

export default WebMaps;

// Auto-registro global si se usa vía CDN en un navegador web
if (typeof window !== "undefined") {
  window.WebMaps = WebMaps;
  if (window.Phaser && window.Phaser.GameObjects) {
    try {
      WebMaps.registerPhaser(window.Phaser);
    } catch (e) {
      console.error(e);
    }
  }
}
