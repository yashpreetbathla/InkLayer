const Toolbar = (() => {
  let toolbarEl = null;
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let isMinimized = false;
  let callbacks = {};

  const TOOLS = [
    { id: 'freehand', label: 'Pen',    icon: '✏️', shortcut: 'F' },
    { id: 'rect',     label: 'Rect',   icon: '▭',  shortcut: 'R' },
    { id: 'circle',   label: 'Circle', icon: '○',  shortcut: 'C' },
    { id: 'arrow',    label: 'Arrow',  icon: '→',  shortcut: 'A' },
    { id: 'eraser',   label: 'Eraser', icon: '⌫',  shortcut: 'E' },
  ];

  function create(cbs) {
    if (toolbarEl) return toolbarEl;
    callbacks = cbs || {};

    toolbarEl = document.createElement('div');
    toolbarEl.id = 'screen-annotate-toolbar';
    toolbarEl.innerHTML = buildHTML();
    document.body.appendChild(toolbarEl);

    setupEvents();
    setActiveTool('freehand');

    return toolbarEl;
  }

  function buildHTML() {
    const toolButtons = TOOLS.map(t => `
      <button class="sa-tool-btn" data-tool="${t.id}" title="${t.label} (${t.shortcut})">
        <span class="sa-tool-icon">${t.icon}</span>
        <span class="sa-tool-label">${t.label}</span>
      </button>
    `).join('');

    return `
      <div id="sa-drag-handle" class="sa-drag-handle">
        <span class="sa-drag-dots">⠿</span>
        <span class="sa-title">InkLayer</span>
        <button class="sa-icon-btn" id="sa-minimize-btn" title="Minimize / Expand">−</button>
        <button class="sa-icon-btn sa-close-btn" id="sa-close-btn" title="Close (Esc)">✕</button>
      </div>

      <div class="sa-collapsible">
        <div class="sa-section">
          <div class="sa-tools">${toolButtons}</div>
        </div>

        <div class="sa-section sa-section-row">
          <label class="sa-label">Color</label>
          <input type="color" id="sa-color-picker" value="#ff0000" class="sa-color-picker" title="Color">
          <div class="sa-preset-colors">
            <button class="sa-preset-color" data-color="#ff0000" style="background:#ff0000" title="Red"></button>
            <button class="sa-preset-color" data-color="#00cc44" style="background:#00cc44" title="Green"></button>
            <button class="sa-preset-color" data-color="#1a6ef5" style="background:#1a6ef5" title="Blue"></button>
            <button class="sa-preset-color" data-color="#ffdd00" style="background:#ffdd00" title="Yellow"></button>
            <button class="sa-preset-color" data-color="#ff6600" style="background:#ff6600" title="Orange"></button>
            <button class="sa-preset-color" data-color="#ffffff" style="background:#ffffff;border:1px solid #666" title="White"></button>
            <button class="sa-preset-color" data-color="#111111" style="background:#111111" title="Black"></button>
          </div>
        </div>

        <div class="sa-section sa-section-row">
          <label class="sa-label">Size</label>
          <input type="range" id="sa-brush-size" min="1" max="30" value="3" class="sa-range" title="Brush Size">
          <span id="sa-brush-size-val" class="sa-size-val">3</span>
        </div>

        <div class="sa-section sa-actions">
          <button class="sa-action-btn" id="sa-undo-btn" title="Undo (Ctrl+Z)">↩ Undo</button>
          <button class="sa-action-btn" id="sa-clear-btn" title="Clear annotations">🗑 Clear</button>
          <button class="sa-action-btn sa-action-primary" id="sa-save-btn" title="Screenshot + annotations → PNG">💾 Save</button>
          <button class="sa-action-btn sa-action-primary" id="sa-copy-btn" title="Screenshot + annotations → clipboard">📋 Copy</button>
        </div>
      </div>
    `;
  }

  function setupEvents() {
    // Drag handle — drag starts here
    const dragHandle = toolbarEl.querySelector('#sa-drag-handle');
    dragHandle.addEventListener('mousedown', onDragStart);

    // Block mousedown only — prevents canvas from starting a stroke when
    // clicking toolbar buttons. mousemove/mouseup must NOT be stopped here
    // because that would swallow the document-level mouseup that ends a drag.
    // Drawing is already guarded by isDrawing in the engine so this is safe.
    toolbarEl.addEventListener('mousedown', e => e.stopPropagation());

    // Minimize / expand
    toolbarEl.querySelector('#sa-minimize-btn').addEventListener('click', toggleMinimize);

    // Tool buttons
    toolbarEl.querySelectorAll('.sa-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        setActiveTool(tool);
        if (callbacks.onToolChange) callbacks.onToolChange(tool);
      });
    });

    // Color picker
    const colorPicker = toolbarEl.querySelector('#sa-color-picker');
    colorPicker.addEventListener('input', () => {
      if (callbacks.onColorChange) callbacks.onColorChange(colorPicker.value);
    });

    // Preset colors
    toolbarEl.querySelectorAll('.sa-preset-color').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        colorPicker.value = color;
        if (callbacks.onColorChange) callbacks.onColorChange(color);
      });
    });

    // Brush size
    const brushSize = toolbarEl.querySelector('#sa-brush-size');
    const brushSizeVal = toolbarEl.querySelector('#sa-brush-size-val');
    brushSize.addEventListener('input', () => {
      brushSizeVal.textContent = brushSize.value;
      if (callbacks.onBrushSizeChange) callbacks.onBrushSizeChange(parseInt(brushSize.value));
    });

    // Action buttons
    toolbarEl.querySelector('#sa-undo-btn').addEventListener('click', () => {
      if (callbacks.onUndo) callbacks.onUndo();
    });
    toolbarEl.querySelector('#sa-clear-btn').addEventListener('click', () => {
      if (callbacks.onClear) callbacks.onClear();
    });
    toolbarEl.querySelector('#sa-save-btn').addEventListener('click', () => {
      if (callbacks.onSave) callbacks.onSave();
    });
    toolbarEl.querySelector('#sa-copy-btn').addEventListener('click', () => {
      if (callbacks.onCopy) callbacks.onCopy();
    });
    toolbarEl.querySelector('#sa-close-btn').addEventListener('click', () => {
      if (callbacks.onClose) callbacks.onClose();
    });
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
    const body = toolbarEl.querySelector('.sa-collapsible');
    const btn = toolbarEl.querySelector('#sa-minimize-btn');
    if (isMinimized) {
      // Convert right-based position to left-based BEFORE collapsing.
      // Without this, width:auto on a fixed element with only `right` set
      // causes it to stretch across the entire viewport.
      const rect = toolbarEl.getBoundingClientRect();
      toolbarEl.style.left = rect.left + 'px';
      toolbarEl.style.top  = rect.top  + 'px';
      toolbarEl.style.right  = 'auto';
      toolbarEl.style.bottom = 'auto';

      body.style.display = 'none';
      btn.textContent = '+';
      btn.title = 'Expand';
      toolbarEl.classList.add('sa-minimized');
    } else {
      body.style.display = '';
      btn.textContent = '−';
      btn.title = 'Minimize';
      toolbarEl.classList.remove('sa-minimized');
    }
  }

  function onDragStart(e) {
    // Don't start drag if clicking a button in the handle
    if (e.target.closest('#sa-close-btn') || e.target.closest('#sa-minimize-btn')) return;

    isDragging = true;
    const rect = toolbarEl.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    e.stopPropagation();
    e.preventDefault();

    // Capture phase ensures these fire even if a child calls stopPropagation
    document.addEventListener('mousemove', onDragMove, true);
    document.addEventListener('mouseup', onDragEnd, true);
  }

  function onDragMove(e) {
    if (!isDragging) return;

    const x = e.clientX - dragOffsetX;
    const y = e.clientY - dragOffsetY;

    // Clamp to viewport
    const rect = toolbarEl.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;

    toolbarEl.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
    toolbarEl.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    toolbarEl.style.right = 'auto';
    toolbarEl.style.bottom = 'auto';
  }

  function onDragEnd() {
    isDragging = false;
    document.removeEventListener('mousemove', onDragMove, true);
    document.removeEventListener('mouseup', onDragEnd, true);
  }

  function setActiveTool(toolId) {
    if (!toolbarEl) return;
    toolbarEl.querySelectorAll('.sa-tool-btn').forEach(btn => {
      btn.classList.toggle('sa-active', btn.dataset.tool === toolId);
    });
  }

  function show() {
    if (toolbarEl) toolbarEl.style.display = '';
  }

  function hide() {
    if (toolbarEl) toolbarEl.style.display = 'none';
  }

  function getElement() {
    return toolbarEl;
  }

  function destroy() {
    if (toolbarEl) {
      toolbarEl.remove();
      toolbarEl = null;
    }
    isMinimized = false;
    document.removeEventListener('mousemove', onDragMove, true);
    document.removeEventListener('mouseup', onDragEnd, true);
    isDragging = false;
  }

  return {
    create,
    setActiveTool,
    show,
    hide,
    getElement,
    destroy,
  };
})();
