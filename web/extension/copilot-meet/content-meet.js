const HOST_ID = 'basanite-copilot-meet-host';
const FRAME_ID = 'basanite-copilot-meet-frame';

let hostEl = null;
let frameEl = null;

function createHost() {
  if (hostEl) return { host: hostEl, iframe: frameEl };

  hostEl = document.createElement('div');
  hostEl.id = HOST_ID;
  hostEl.setAttribute('role', 'complementary');
  hostEl.setAttribute('aria-label', 'Basanite Copilot');

  const shadow = hostEl.attachShadow({ mode: 'open' });

  frameEl = document.createElement('iframe');
  frameEl.id = FRAME_ID;
  frameEl.src = chrome.runtime.getURL('overlay.html');
  frameEl.setAttribute('title', 'Basanite Copilot overlay');
  frameEl.setAttribute('scrolling', 'no');
  frameEl.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 12px;
    background: transparent;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
    overflow: hidden;
  `;

  shadow.appendChild(frameEl);
  document.body.appendChild(hostEl);
  return { host: hostEl, iframe: frameEl };
}

function removeHost() {
  if (hostEl) {
    hostEl.remove();
    hostEl = null;
    frameEl = null;
  }
}

function setHostVisible(visible) {
  if (!hostEl) return;
  hostEl.style.display = visible ? 'block' : 'none';
}

function postToOverlay(message) {
  if (frameEl && frameEl.contentWindow) {
    try {
      frameEl.contentWindow.postMessage(message, '*');
    } catch {}
  }
}

function syncOverlay({ data, enabled }) {
  if (!data && !enabled) {
    setHostVisible(false);
    return;
  }
  if (enabled && data) {
    createHost();
    setHostVisible(true);
    postToOverlay({ type: 'COPILOT_DATA', payload: data });
  }
}

// Initial state.
chrome.storage.local.get(['copilotData', 'overlayEnabled'], (result) => {
  syncOverlay({ data: result.copilotData, enabled: result.overlayEnabled });
});

// React to changes from the Basanite tab.
chrome.storage.local.onChanged.addListener((changes) => {
  const data = changes.copilotData ? changes.copilotData.newValue : undefined;
  const enabled = changes.overlayEnabled ? changes.overlayEnabled.newValue : undefined;

  if (enabled === false) {
    setHostVisible(false);
    return;
  }

  chrome.storage.local.get(['copilotData', 'overlayEnabled'], (result) => {
    syncOverlay({
      data: data ?? result.copilotData,
      enabled: enabled ?? result.overlayEnabled,
    });
  });
});

// Messages coming from the overlay iframe itself.
window.addEventListener('message', (event) => {
  if (!frameEl || event.source !== frameEl.contentWindow) return;
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'COPILOT_PROBE_ACTION') {
    chrome.runtime.sendMessage({ type: 'RELAY_PROBE_ACTION', payload: msg.payload });
    return;
  }

  if (msg.type === 'CLOSE_OVERLAY') {
    chrome.storage.local.set({ overlayEnabled: false });
    setHostVisible(false);
    return;
  }

  if (msg.type === 'OVERLAY_READY') {
    chrome.storage.local.get(['copilotData'], (result) => {
      if (result.copilotData) {
        postToOverlay({ type: 'COPILOT_DATA', payload: result.copilotData });
      }
    });
  }
});
