import { getMX, symbolLength, blendFromB } from "../utils.js";
import { applyFilterAndDraw } from "./filters.js";
import { renderTimeline } from "./core.js";

export function renderASI(ctx, atlas, asi) {
  applyFilterAndDraw(ctx, asi, (targetCtx) => {
    const sp = atlas.spriteMap.get(asi.N);
    if (!sp) return;
    const M = getMX(asi);
    targetCtx.save();
    targetCtx.transform(M[0], M[1], M[2], M[3], M[4], M[5]);

    const blendASI = blendFromB(asi.B);
    if (blendASI) targetCtx.globalCompositeOperation = blendASI;

    if (asi.C) {
      const C = asi.C;
      let aMult = 1;
      if (C.M === "CA" || C.M === "Alpha" || C.M === "AD" || C.M === "Advanced")
        aMult = C.AM != null ? C.AM : 1;
      if (aMult !== 1) targetCtx.globalAlpha *= Math.max(0, Math.min(1, aMult));
    }

    if (sp.rotated) {
      targetCtx.translate(0, sp.w);
      targetCtx.rotate(-Math.PI / 2);
      targetCtx.drawImage(
        atlas.image,
        sp.x,
        sp.y,
        sp.w,
        sp.h,
        0,
        0,
        sp.w,
        sp.h,
      );
    } else {
      targetCtx.drawImage(
        atlas.image,
        sp.x,
        sp.y,
        sp.w,
        sp.h,
        0,
        0,
        sp.w,
        sp.h,
      );
    }
    targetCtx.restore();
  });
}

export function renderSI(ctx, atlas, si, parentLocalFrame) {
  applyFilterAndDraw(ctx, si, (targetCtx) => {
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
        cf = Math.min(FF + parentLocalFrame, len - 1);
        break;
      default:
        cf = (((FF + parentLocalFrame) % len) + len) % len;
    }
    const M = getMX(si);
    targetCtx.save();
    targetCtx.transform(M[0], M[1], M[2], M[3], M[4], M[5]);

    if (si.C) {
      const C = si.C;
      let aMult = 1;
      if (C.M === "CA" || C.M === "Alpha" || C.M === "AD" || C.M === "Advanced")
        aMult = C.AM != null ? C.AM : 1;
      if (aMult !== 1) targetCtx.globalAlpha *= Math.max(0, Math.min(1, aMult));
    }

    const blend = blendFromB(si.B);
    if (blend) targetCtx.globalCompositeOperation = blend;

    renderTimeline(targetCtx, atlas, sym.TL, cf);

    targetCtx.restore();
  });
}
