// public/engine/src/funkin/play/data/chars.js
class CharsData {
  static preload(scene) {
    const pd = scene.playData;
    const charsMeta = pd.get("characters") || {};
    const players = charsMeta.players || ["bf"];
    const opponents = charsMeta.opponents || ["dad"];
    const spectators = charsMeta.spectator || ["gf"];
    const allChars = [...new Set([...players, ...opponents, ...spectators])];
    
    if (!window.dataChars) {
      window.dataChars = {};
    }
    
    allChars.forEach(charId => {
      const jsonKey = `charData_${charId}`;
      const jsonPath = window.Path.dataChars + charId + ".json";
      
      if (!scene.cache.json.exists(jsonKey)) {
        scene.load.json(jsonKey, jsonPath);
        scene.load.once(`filecomplete-json-${jsonKey}`, (key, type, data) => {
          window.dataChars[charId] = data;
          this.loadCharacterAssets(scene, charId, data);
          if (window.SafeLoadStart) window.SafeLoadStart(scene);
        });
      } else {
        const data = scene.cache.json.get(jsonKey);
        window.dataChars[charId] = data;
        this.loadCharacterAssets(scene, charId, data);
      }
    });
  }

  static loadCharacterAssets(scene, charId, data) {
    let imgPath = data.image?.path;
    let imgExt = data.image?.extension;
    let imgRender = data.image?.render;
    
    if (!imgPath && typeof data.image === 'string') {
      imgPath = data.image.split('/').pop(); 
      imgRender = data.type ? data.type.toLowerCase() : "xml";
      imgExt = "png";
    } else {
      imgPath = imgPath || charId;
      imgExt = imgExt ? imgExt.replace('.', '') : "png";
      imgRender = imgRender || "xml";
    }
    
    const fullImgPath = `${window.Path.chars}${imgRender}/${imgPath}.${imgExt}`;
    const cacheKey = `char_atlas_${charId}`;
    
    if (imgRender.toLowerCase() === "xml") {
      const fullXmlPath = `${window.Path.chars}${imgRender}/${imgPath}.xml`;
      if (!scene.textures.exists(cacheKey)) {
        scene.load.atlasXML(cacheKey, fullImgPath, fullXmlPath);
      }
    } else {
      if (!scene.textures.exists(cacheKey)) {
        scene.load.image(cacheKey, fullImgPath);
      }
    }
  }

  constructor(scene) {
    this.scene = scene;
    this.logic = new window.CharacterLogic(this.scene);
  }
}
window.CharsData = CharsData;