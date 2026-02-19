const ArrowTool = {
  startX: 0,
  startY: 0,
  snapshot: null,

  onMouseDown(ctx, x, y, state) {
    this.startX = x;
    this.startY = y;
    // Cache pre-draw snapshot for live preview
    this.snapshot = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  },

  onMouseMove(ctx, x, y, state) {
    if (!state.isDrawing || !this.snapshot) return;

    // Restore snapshot to remove previous preview frame
    ctx.putImageData(this.snapshot, 0, 0);

    this._drawArrow(ctx, this.startX, this.startY, x, y, state);
  },

  onMouseUp(ctx, x, y, state) {
    this.snapshot = null;
  },

  _drawArrow(ctx, fromX, fromY, toX, toY, state) {
    const headLength = Math.max(15, state.brushSize * 4);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Shaft
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.brushSize;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Arrowhead left wing
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    // Arrowhead right wing
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.brushSize;
    ctx.lineCap = 'round';
    ctx.stroke();
  },
};
