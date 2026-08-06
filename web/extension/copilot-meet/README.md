# Basanite Copilot for Google Meet

A Chrome extension that overlays live Basanite Copilot suggestions inside a Google Meet call.

## What it does

When a Basanite copilot session is running, the live panel in the Basanite app broadcasts the same `saturation`, `probe`, `flags`, and `pacing` data the interviewer already sees. This extension renders those suggestions in a small, draggable-looking panel in the top-right of the Meet tab, so the interviewer never has to switch tabs mid-call.

## How it works

1. **Basanite live panel** posts `BASANITE_COPILOT_TICK` messages to the page window.
2. **The Basanite content script** (`content-basanite.js`) picks those up and writes them to `chrome.storage.local`.
3. **The Meet content script** (`content-meet.js`) reads from storage and injects an `iframe` pointing at `overlay.html`.
4. **The overlay** displays the latest suggestions and can send `COPILOT_PROBE_ACTION` messages back.
5. **The background service worker** forwards probe actions from the Meet tab to the Basanite tab, where the live panel logs the event.

## Installation (developer / unpacked)

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this `copilot-meet` directory.
4. Pin the extension if you want; it does not need an icon click to work.

## Usage

1. Start a copilot interview in Basanite and choose **Google Meet — bot joins the call**.
2. Once the interview is live, click **Open in Meet** in the Basanite live panel. This tells the extension to show the overlay.
3. Switch to the Google Meet tab. A Basanite Copilot overlay appears in the top-right.
4. As suggestions update every tick, they appear in the overlay. You can mark a probe as **Asked**, **Adapted**, or **Dismiss** directly from the overlay.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (v3). |
| `content-meet.js` | Injected on `meet.google.com`; creates the overlay iframe and syncs storage. |
| `content-meet.css` | Host-level styles for the overlay container. |
| `content-basanite.js` | Injected on Basanite pages; relays live panel messages to storage. |
| `background.js` | Forwards probe actions from the Meet tab to the Basanite tab. |
| `overlay.html` / `overlay.css` / `overlay.js` | The overlay UI rendered inside the Meet tab. |
| `icons/` | Extension icons. |

## Notes

- The extension only reads data that the Basanite live panel already sends to the page; it does not capture Meet audio or video.
- It is read-only unless the interviewer clicks a probe action, which is still logged through the existing `/probe-event` API.
