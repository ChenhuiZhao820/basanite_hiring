// Relay messages from the Basanite web app (CopilotLivePanel) into
// chrome.storage.local so the Meet content script can render the overlay,
// and listen for probe actions coming from the Meet overlay and relay them
// back into the page.

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'BASANITE_COPILOT_TICK') {
    chrome.storage.local.set({ copilotData: msg.payload });
    return;
  }

  if (msg.type === 'BASANITE_COPILOT_ENABLE_OVERLAY') {
    chrome.storage.local.set({ overlayEnabled: true });
    return;
  }

  if (msg.type === 'BASANITE_COPILOT_DISABLE_OVERLAY') {
    chrome.storage.local.remove(['copilotData', 'overlayEnabled']);
    return;
  }
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request && request.type === 'RELAY_PROBE_ACTION') {
    window.postMessage(
      { type: 'BASANITE_COPILOT_PROBE_ACTION', payload: request.payload },
      '*'
    );
    sendResponse({ ok: true });
    return false;
  }
  return false;
});
