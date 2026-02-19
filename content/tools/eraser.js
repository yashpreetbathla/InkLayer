const EraserTool = {
  onMouseDown(ctx, x, y, state) {
    ctx.beginPath();
    ctx.moveTo(x, y);
  },

  onMouseMove(ctx, x, y, state) {
    if (!state.isDrawing) return;

    const eraserSize = state.brushSize * 4;
    ctx.clearRect(
      x - eraserSize / 2,
      y - eraserSize / 2,
      eraserSize,
      eraserSize
    );
  },

  onMouseUp(ctx, x, y, state) {
    // Nothing needed
  },
};
