import { getMX, findFrameBlock, blendFromB } from "../utils.js";
import { renderASI, renderSI } from "./elements.js";

export function renderFrame(atlas, animation, frameIndex, canvas, opts) {
  opts = opts || {};
  const ctx = canvas.getContext("2d");

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (opts.backgroundColor) {
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (opts.clear !== false) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (opts.tx || opts.ty) ctx.translate(opts.tx || 0, opts.ty || 0);

  const isSymbolAnim = animation && animation.type === "symbol";
  const tl = isSymbolAnim ? animation.symbol.TL : atlas.animation.AN.TL;
  const start = animation ? animation.start : 0;
  const useRoot = !isSymbolAnim;
  const globalFrame = start + (frameIndex | 0);

  ctx.save();
  if (useRoot) {
    const root = atlas.animation.AN.STI && atlas.animation.AN.STI.SI;
    if (root) {
      const M = getMX(root);
      ctx.transform(M[0], M[1], M[2], M[3], M[4], M[5]);
    }
  }

  renderTimeline(ctx, atlas, tl, globalFrame);

  ctx.restore();
}

export function renderTimeline(ctx, atlas, tl, frame) {
  const layers = tl.L;
  const clippingMasks = {};
  const clippedBy = {};

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (layer.LT === "Clp") clippingMasks[layer.LN] = layer;
    if (layer.Clpb) clippedBy[layer.LN] = layer.Clpb;
  }

  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (layer.LT === "Clp") continue;

    const block = findFrameBlock(layer, frame);
    if (!block) continue;

    const lf = frame - (block.I || 0);
    const frameBlend = blendFromB(block.B);

    ctx.save();
    if (frameBlend) ctx.globalCompositeOperation = frameBlend;

    if (layer.Clpb && clippingMasks[layer.Clpb]) {
      renderMaskedLayer(ctx, atlas, layer, clippingMasks[layer.Clpb], frame);
    } else {
      for (const el of block.E || []) {
        if (el.ASI) renderASI(ctx, atlas, el.ASI);
        else if (el.SI) renderSI(ctx, atlas, el.SI, lf);
      }
    }
    ctx.restore();
  }
}

export function renderMaskedLayer(ctx, atlas, contentLayer, maskLayer, frame) {
  const contentBlock = findFrameBlock(contentLayer, frame);
  const maskBlock = findFrameBlock(maskLayer, frame);

  if (!contentBlock || !maskBlock) return;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = ctx.canvas.width;
  tempCanvas.height = ctx.canvas.height;
  const tempCtx = tempCanvas.getContext("2d");

  const currentTransform = ctx.getTransform();
  tempCtx.setTransform(currentTransform);

  const clf = frame - (contentBlock.I || 0);
  for (const el of contentBlock.E || []) {
    if (el.ASI) renderASI(tempCtx, atlas, el.ASI);
    else if (el.SI) renderSI(tempCtx, atlas, el.SI, clf);
  }

  tempCtx.globalCompositeOperation = "destination-in";

  const mlf = frame - (maskBlock.I || 0);
  for (const el of maskBlock.E || []) {
    if (el.ASI) renderASI(tempCtx, atlas, el.ASI);
    else if (el.SI) renderSI(tempCtx, atlas, el.SI, mlf);
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(tempCanvas, 0, 0);
  ctx.restore();
}
