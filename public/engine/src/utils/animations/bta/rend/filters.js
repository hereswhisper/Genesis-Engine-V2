export function applyFilterAndDraw(targetCtx, element, drawCallback) {
  let blurVal = 0;

  if (element.F && element.F.length > 0) {
    for (const filter of element.F) {
      if (filter.N === "BLF") {
        blurVal = Math.max(filter.BLX || 0, filter.BLY || 0);
      }
    }
  }

  if (blurVal === 0) {
    drawCallback(targetCtx);
    return;
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = targetCtx.canvas.width;
  tempCanvas.height = targetCtx.canvas.height;
  const tempCtx = tempCanvas.getContext("2d");

  const currentTransform = targetCtx.getTransform();
  tempCtx.setTransform(currentTransform);

  drawCallback(tempCtx);

  targetCtx.save();
  targetCtx.setTransform(1, 0, 0, 1, 0, 0);
  targetCtx.filter = `blur(${blurVal / 2}px)`;
  targetCtx.drawImage(tempCanvas, 0, 0);
  targetCtx.restore();
}
