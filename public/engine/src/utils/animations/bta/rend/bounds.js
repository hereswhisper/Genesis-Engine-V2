import { getMX, symbolLength, findFrameBlock } from "../utils.js";

export function computeBounds(atlas, animation) {
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  const isSymbolAnim = animation && animation.type === "symbol";
  const tl = isSymbolAnim ? animation.symbol.TL : atlas.animation.AN.TL;
  const start = animation ? animation.start : 0;
  const end = animation
    ? animation.start + animation.duration
    : atlas.totalFrames;

  const useRoot = !isSymbolAnim;
  const root = useRoot && atlas.animation.AN.STI && atlas.animation.AN.STI.SI;
  const rootM = root ? getMX(root) : [1, 0, 0, 1, 0, 0];

  function mul(A, B) {
    return [
      A[0] * B[0] + A[2] * B[1],
      A[1] * B[0] + A[3] * B[1],
      A[0] * B[2] + A[2] * B[3],
      A[1] * B[2] + A[3] * B[3],
      A[0] * B[4] + A[2] * B[5] + A[4],
      A[1] * B[4] + A[3] * B[5] + A[5],
    ];
  }
  function applyP(M, x, y) {
    return [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
  }

  function walkASI(asi, M) {
    const sp = atlas.spriteMap.get(asi.N);
    if (!sp) return;
    const M2 = mul(M, getMX(asi));
    const dw = sp.rotated ? sp.h : sp.w;
    const dh = sp.rotated ? sp.w : sp.h;
    for (const [x, y] of [
      [0, 0],
      [dw, 0],
      [0, dh],
      [dw, dh],
    ]) {
      const [wx, wy] = applyP(M2, x, y);
      if (wx < minX) minX = wx;
      if (wx > maxX) maxX = wx;
      if (wy < minY) minY = wy;
      if (wy > maxY) maxY = wy;
    }
  }

  function walkSI(si, plf, M) {
    const sym = atlas.symbolMap.get(si.SN);
    if (!sym) return;
    const len = symbolLength(sym);
    const FF = si.FF || 0;
    let cf;
    switch (si.LP || "LP") {
      case "SF":
      case "singleframe":
        cf = FF;
        break;
      case "PO":
      case "playonce":
        cf = Math.min(FF + plf, len - 1);
        break;
      default:
        cf = (((FF + plf) % len) + len) % len;
    }
    walkTL(sym.TL, cf, mul(M, getMX(si)));
  }

  function walkTL(timeline, frame, M) {
    for (let i = timeline.L.length - 1; i >= 0; i--) {
      const layer = timeline.L[i];
      if (layer.LT === "Clp") continue;
      const block = findFrameBlock(layer, frame);
      if (!block) continue;
      const lf = frame - (block.I || 0);
      for (const el of block.E || []) {
        if (el.ASI) walkASI(el.ASI, M);
        else if (el.SI) walkSI(el.SI, lf, M);
      }
    }
  }

  for (let f = start; f < end; f++) walkTL(tl, f, rootM);

  if (minX === Infinity) return null;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.ceil(maxX - minX),
    height: Math.ceil(maxY - minY),
  };
}
