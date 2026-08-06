// Background service worker for Basanite Copilot for Google Meet.
// Its only job is to forward probe-action messages from the Meet tab's
// content script to the Basanite tab's content script, since the two tabs
// cannot message each other directly.

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (!request || request.type !== 'RELAY_PROBE_ACTION') {
    sendResponse({ ok: false, error: 'unknown message' });
    return false;
  }

  const payload = request.payload;

  chrome.tabs.query(
    {
      url: ['https://*.basanite.co.uk/*', 'http://localhost:3000/*'],
    },
    (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({ ok: false, error: 'No Basanite tab found' });
        return;
      }

      // Prefer the active Basanite tab, otherwise use the first match.
      const target = tabs.find((t) => t.active) || tabs[0];

      chrome.tabs.sendMessage(
        target.id,
        { type: 'RELAY_PROBE_ACTION', payload },
        (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ ok: true, response });
          }
        }
      );
    }
  );

  // Async response.
  return true;
});
