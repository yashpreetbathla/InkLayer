const btn = document.getElementById('toggle-btn');
const statusMsg = document.getElementById('status-msg');

// Must be injected in this exact order (tools before engine)
const CONTENT_SCRIPTS = [
  'content/tools/freehand.js',
  'content/tools/rect.js',
  'content/tools/circle.js',
  'content/tools/arrow.js',
  'content/tools/eraser.js',
  'content/drawing-engine.js',
  'content/canvas-overlay.js',
  'content/toolbar.js',
  'content/content.js',
];

btn.addEventListener('click', async () => {
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (err) {
    showError('Could not query active tab.');
    return;
  }

  if (!tab) {
    showError('No active tab found.');
    return;
  }

  if (
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://') ||
    tab.url.startsWith('edge://') ||
    tab.url.startsWith('about:')
  ) {
    showError('Cannot annotate browser system pages.');
    return;
  }

  try {
    // Check if content scripts are already present by probing the global
    const [probe] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => typeof window.__saToggle === 'function',
    });

    if (probe.result) {
      // Already injected — call the global directly
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.__saToggle(),
      });
    } else {
      // Not yet injected — insert CSS then each JS file in order
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content/content.css'],
      });
      for (const file of CONTENT_SCRIPTS) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [file],
        });
      }
      // Call the global that content.js just registered
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.__saToggle(),
      });
    }

    window.close();
  } catch (err) {
    showError('Error: ' + (err.message || err));
  }
});

function showError(msg) {
  statusMsg.textContent = msg;
  setTimeout(() => { statusMsg.textContent = ''; }, 4000);
}
