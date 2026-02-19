(function () {
  'use strict';

  let isActive = false;

  function activate() {
    if (isActive) return;
    isActive = true;

    // Create and activate the canvas overlay
    const canvas = CanvasOverlay.create();
    CanvasOverlay.activate();

    // Wire up the drawing engine to the canvas
    DrawingEngine.init(canvas);

    // Build the toolbar with all callback handlers
    Toolbar.create({
      onToolChange(tool) {
        DrawingEngine.setTool(tool);
      },
      onColorChange(color) {
        DrawingEngine.setColor(color);
      },
      onBrushSizeChange(size) {
        DrawingEngine.setBrushSize(size);
      },
      onUndo() {
        DrawingEngine.undo();
      },
      onClear() {
        DrawingEngine.clearCanvas();
      },
      async onSave() {
        try {
          await DrawingEngine.saveAsPng(Toolbar.getElement());
        } catch (err) {
          showToast('Save failed: ' + err.message, true);
        }
      },
      async onCopy() {
        try {
          await DrawingEngine.copyToClipboard(Toolbar.getElement());
          showToast('Copied to clipboard!');
        } catch (err) {
          showToast('Copy failed: ' + err.message, true);
        }
      },
      onClose() {
        deactivate();
      },
    });
  }

  function deactivate() {
    if (!isActive) return;
    isActive = false;
    Toolbar.destroy();
    CanvasOverlay.destroy();
  }

  function showToast(message, isError) {
    const existing = document.getElementById('screen-annotate-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'screen-annotate-toast';
    toast.textContent = message;
    toast.style.cssText = [
      'position: fixed !important',
      'bottom: 20px !important',
      'left: 50% !important',
      'transform: translateX(-50%) !important',
      `background: ${isError ? '#e53e3e' : '#2d3748'} !important`,
      'color: white !important',
      'padding: 10px 20px !important',
      'border-radius: 6px !important',
      'z-index: 2147483647 !important',
      'font-family: -apple-system, BlinkMacSystemFont, sans-serif !important',
      'font-size: 14px !important',
      'pointer-events: none !important',
      'box-shadow: 0 2px 8px rgba(0,0,0,0.35) !important',
    ].join(';');
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Alt+Shift+A — toggle annotator from anywhere
    if (e.altKey && e.shiftKey && e.key === 'A') {
      if (isActive) {
        deactivate();
      } else {
        activate();
      }
      return;
    }

    if (!isActive) return;

    // Esc — close annotator
    if (e.key === 'Escape') {
      deactivate();
      return;
    }

    // Ctrl/Cmd+Z — undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      DrawingEngine.undo();
      return;
    }

    // Tool shortcuts — skip when focus is inside an input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key.toLowerCase()) {
      case 'f':
        DrawingEngine.setTool('freehand');
        Toolbar.setActiveTool('freehand');
        break;
      case 'r':
        DrawingEngine.setTool('rect');
        Toolbar.setActiveTool('rect');
        break;
      case 'c':
        DrawingEngine.setTool('circle');
        Toolbar.setActiveTool('circle');
        break;
      case 'a':
        DrawingEngine.setTool('arrow');
        Toolbar.setActiveTool('arrow');
        break;
      case 'e':
        DrawingEngine.setTool('eraser');
        Toolbar.setActiveTool('eraser');
        break;
    }
  });

  // Listen for toggle message from popup (used when content script was already running)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TOGGLE_ANNOTATOR') {
      if (isActive) {
        deactivate();
      } else {
        activate();
      }
    }
  });

  // Expose a global so popup.js can call this directly via executeScript
  // after programmatic injection (more reliable than sendMessage post-inject)
  window.__saToggle = function () {
    if (isActive) {
      deactivate();
    } else {
      activate();
    }
  };
})();
