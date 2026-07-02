import { stripBOM, totalFrames, symbolLength } from "./utils.js";

export function buildAtlas(image, sm, anim) {
  if (typeof sm === "string") {
    try {
      sm = JSON.parse(stripBOM(sm));
    } catch (e) {
      throw new Error("Spritemap JSON parse failed");
    }
  }
  if (typeof anim === "string") {
    try {
      anim = JSON.parse(stripBOM(anim));
    } catch (e) {
      throw new Error("Animation JSON parse failed");
    }
  }

  if (!sm || !sm.ATLAS || !sm.ATLAS.SPRITES)
    throw new Error("Invalid spritemap JSON");
  if (!anim || !anim.AN || !anim.SD) throw new Error("Invalid Animation JSON");

  const spriteMap = new Map();
  for (const s of sm.ATLAS.SPRITES) spriteMap.set(s.SPRITE.name, s.SPRITE);

  const symbolMap = new Map();
  for (const s of anim.SD.S || []) symbolMap.set(s.SN, s);

  return {
    image,
    spriteMap,
    symbolMap,
    animation: anim,
    fps: (anim.MD && anim.MD.FRT) || 24,
    width: (anim.MD && anim.MD.W) || 0,
    height: (anim.MD && anim.MD.H) || 0,
    totalFrames: totalFrames(anim),
  };
}

export function getAnimations(atlas) {
  const animation = atlas.animation;
  const out = [];
  const seen = new Set();

  for (const layer of animation.AN.TL.L)
    for (const fr of layer.FR)
      if (fr.N && fr.N !== "None" && !seen.has(fr.N)) {
        seen.add(fr.N);
        out.push({
          name: fr.N,
          type: "label",
          start: fr.I || 0,
          duration: fr.DU || 1,
        });
      }

  if (out.length > 0) {
    out.sort((a, b) => a.start - b.start);
    return out;
  }

  const layers = animation.AN.TL.L;
  const layersWithSI = layers.filter(
    (L) => L.FR && L.FR.some((fr) => (fr.E || []).some((e) => e.SI || e.ASI)),
  );

  const spansByLayer = layers.map((L) => {
    if (!L.FR || !L.FR.length) return [];
    const sorted = [...L.FR].sort((a, b) => (a.I || 0) - (b.I || 0));
    let curName = null,
      curStart = 0,
      frameEnd = 0;
    const sp = [];
    for (const fr of sorted) {
      const I = fr.I || 0,
        DU = fr.DU || 1;
      const e = fr.E && fr.E[0];
      const sn = (e && e.SI && e.SI.SN) || null;
      if (sn !== curName) {
        if (curName != null)
          sp.push({ name: curName, start: curStart, duration: I - curStart });
        curName = sn;
        curStart = I;
      }
      frameEnd = I + DU;
    }
    if (curName != null)
      sp.push({
        name: curName,
        start: curStart,
        duration: frameEnd - curStart,
      });
    return sp.filter((s) => s.name && s.duration > 0);
  });

  let bestSpans = [];
  for (const sp of spansByLayer)
    if (sp.length > bestSpans.length) bestSpans = sp;

  if (layersWithSI.length === 1 && bestSpans.length >= 2) {
    for (const sp of bestSpans)
      out.push({
        name: sp.name,
        type: "label",
        start: sp.start,
        duration: sp.duration,
      });
    return out;
  }

  if (layersWithSI.length >= 2) {
    const refs = new Set();
    for (const L of layers)
      for (const fr of L.FR)
        for (const el of fr.E || []) if (el.SI && el.SI.SN) refs.add(el.SI.SN);
    for (const sn of refs) {
      const s = atlas.symbolMap.get(sn);
      if (!s || seen.has(sn)) continue;
      seen.add(sn);
      const len = symbolLength(s);
      if (len < 2) continue;
      out.push({
        name: sn,
        type: "symbol",
        symbol: s,
        start: 0,
        duration: len,
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }
  return out;
}

export function getFrameCount(atlas, animation) {
  return animation ? animation.duration | 0 : atlas.totalFrames;
}

export function getFps(atlas) {
  return atlas.fps;
}
