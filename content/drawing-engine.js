const DrawingEngine = (() => {
  const MAX_UNDO = 30;

  let canvas = null;
  let ctx = null;
  let undoStack = [];
  let isDrawing = false;

  const state = {
    tool: 'freehand',
    color: '#ff0000',
    brushSize: 3,
    isDrawing: false,
  };

  const tools = {
    freehand: FreehandTool,
    rect: RectTool,
    circle: CircleTool,
    arrow: ArrowTool,
    eraser: EraserTool,
  };

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
  }

  function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function pushUndo() {
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (undoStack.length > MAX_UNDO) {
      undoStack.shift();
    }
  }

  function undo() {
    if (undoStack.length === 0) return;
    const imageData = undoStack.pop();
    ctx.putImageData(imageData, 0, 0);
  }

  function onMouseDown(e) {
    if (e.button !== 0) return;

    const { x, y } = getCoords(e);
    isDrawing = true;
    state.isDrawing = true;

    pushUndo();

    applyCtxStyle();

    const tool = tools[state.tool];
    if (tool) tool.onMouseDown(ctx, x, y, state);
  }

  function onMouseMove(e) {
    if (!isDrawing) return;

    const { x, y } = getCoords(e);

    applyCtxStyle();

    const tool = tools[state.tool];
    if (tool) tool.onMouseMove(ctx, x, y, state);
  }

  function onMouseUp(e) {
    if (!isDrawing) return;

    const { x, y } = getCoords(e);
    isDrawing = false;
    state.isDrawing = false;

    const tool = tools[state.tool];
    if (tool) tool.onMouseUp(ctx, x, y, state);
  }

  function applyCtxStyle() {
    ctx.strokeStyle = state.color;
    ctx.fillStyle = state.color;
    ctx.lineWidth = state.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function setTool(toolName) {
    if (tools[toolName]) {
      state.tool = toolName;
    }
  }

  function setColor(color) {
    state.color = color;
  }

  function setBrushSize(size) {
    state.brushSize = size;
  }

  // Capture the page screenshot + current annotations composited together.
  // Returns a blob. Does NOT modify the live canvas.
  async function captureComposite(toolbar) {
    // Hide toolbar and canvas so they don't appear in the screenshot
    if (toolbar) toolbar.style.display = 'none';
    canvas.style.setProperty('opacity', '0', 'important');

    // Two rAF frames to let the browser repaint before capture
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => requestAnimationFrame(resolve));

    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, resolve);
    });

    // Restore visibility
    canvas.style.setProperty('opacity', '1', 'important');
    if (toolbar) toolbar.style.display = '';

    if (!response || !response.dataUrl) {
      throw new Error('Screenshot capture failed');
    }

    // Composite: draw screenshot then annotations on an offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width  = canvas.width;
    offscreen.height = canvas.height;
    const offCtx = offscreen.getContext('2d');

    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        offCtx.drawImage(img, 0, 0, offscreen.width, offscreen.height);
        resolve();
      };
      img.onerror = reject;
      img.src = response.dataUrl;
    });

    // Overlay the annotations from the live canvas
    offCtx.drawImage(canvas, 0, 0);

    return new Promise((resolve, reject) => {
      offscreen.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png');
    });
  }

  async function saveAsPng(toolbar) {
    const blob = await captureComposite(toolbar);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screen-annotate-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard(toolbar) {
    const blob = await captureComposite(toolbar);
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
  }

  function clearCanvas() {
    pushUndo();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return {
    init,
    undo,
    setTool,
    setColor,
    setBrushSize,
    saveAsPng,
    copyToClipboard,
    clearCanvas,
    getState: () => ({ ...state }),
  };
})();
