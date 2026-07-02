export function stripBOM(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export function getMX(el) {
  if (el.MX) return el.MX;
  if (el.M3D) {
    const m = el.M3D;
    return [m[0], m[1], m[4], m[5], m[12], m[13]];
  }
  return [1, 0, 0, 1, 0, 0];
}

export function blendFromB(b) {
  if (b == null) return null;
  if (typeof b === "string") return b.toLowerCase();
  switch (b) {
    case 0:
      return "lighter";
    case 1:
      return null;
    case 2:
      return "darken";
    case 3:
      return "difference";
    case 4:
      return "destination-out";
    case 5:
      return "hard-light";
    case 6:
      return "exclusion";
    case 7:
      return "source-over";
    case 8:
      return "lighten";
    case 9:
      return "multiply";
    case 10:
      return "source-over";
    case 11:
      return "overlay";
    case 12:
      return "screen";
    case 13:
      return "source-over";
    case 14:
      return "difference";
    default:
      return "source-over";
  }
}

export function findFrameBlock(layer, frame) {
  const arr = layer.FR;
  for (let i = 0; i < arr.length; i++) {
    const fr = arr[i];
    const I = fr.I || 0,
      DU = fr.DU || 1;
    if (frame >= I && frame < I + DU) return fr;
  }
  return null;
}

export function symbolLength(sym) {
  let max = 0;
  for (const layer of sym.TL.L)
    for (const fr of layer.FR) max = Math.max(max, (fr.I || 0) + (fr.DU || 1));
  return max || 1;
}

export function totalFrames(animation) {
  let max = 0;
  for (const layer of animation.AN.TL.L)
    for (const fr of layer.FR) max = Math.max(max, (fr.I || 0) + (fr.DU || 1));
  return max || 1;
}
