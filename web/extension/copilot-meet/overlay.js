const content = document.getElementById('content');

let currentData = null;
let minimized = false;

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function dimClass(status) {
  if (status === 'saturated') return 'saturated';
  if (status === 'partial') return 'partial';
  return 'none';
}

function renderDimName(name) {
  return escapeHtml(name.replace(/_/g, ' '));
}

function renderProbeActions(probe) {
  return `
    <div class="probe-actions">
      <button class="asked" data-action="asked">Asked</button>
      <button class="adapted" data-action="adapted">Adapted</button>
      <button class="dismissed" data-action="dismissed">Dismiss</button>
    </div>
  `;
}

function renderProbe(probe) {
  if (!probe || !probe.text) return '';
  return `
    <div class="section">
      <div class="section-title">Suggested probe</div>
      <p class="probe-text">${escapeHtml(probe.text)}</p>
      ${probe.reason ? `<p class="probe-reason">${escapeHtml(probe.reason)}</p>` : ''}
      ${renderProbeActions(probe)}
    </div>
  `;
}

function renderSaturation(saturation) {
  if (!saturation || Object.keys(saturation).length === 0) return '';
  const dims = Object.entries(saturation)
    .map(([key, status]) => `<span class="dim ${dimClass(status)}">${renderDimName(key)}</span>`)
    .join('');
  return `
    <div class="section">
      <div class="section-title">Saturation</div>
      <div class="dims">${dims}</div>
    </div>
  `;
}

function renderFlags(flags) {
  if (!Array.isArray(flags) || flags.length === 0) return '';
  const items = flags.map((f) => `<li>${escapeHtml(f)}</li>`).join('');
  return `
    <div class="section flags">
      <div class="section-title">Flags</div>
      <ul>${items}</ul>
    </div>
  `;
}

function renderPacing(pacing) {
  if (!pacing) return '';
  const lower = pacing.toLowerCase();
  const tone = lower.includes('slow') || lower.includes('fast') ? 'warn' : 'ok';
  return `<div class="pacing ${tone}">${escapeHtml(pacing)}</div>`;
}

function renderMeta(data) {
  const name = escapeHtml(data.candidateName || 'Candidate');
  const elapsed = formatDuration(data.elapsed || 0);
  const target = typeof data.targetMinutes === 'number' ? data.targetMinutes : 30;
  return `<div class="meta"><span>${name}</span><span>${elapsed} / ${target} min</span></div>`;
}

function render(data) {
  currentData = data;

  if (!data) {
    content.innerHTML = '<p class="empty-state">No active interview. Open the Basanite live panel to start.</p>';
    attachProbeListeners();
    return;
  }

  content.innerHTML = `
    ${renderMeta(data)}
    ${renderPacing(data.pacing)}
    ${renderSaturation(data.saturation)}
    ${renderProbe(data.probe)}
    ${renderFlags(data.flags)}
  `;

  attachProbeListeners();
}

function attachProbeListeners() {
  document.querySelectorAll('.probe-actions button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      const data = currentData;
      const probe = data?.probe;
      if (!probe) return;

      parent.postMessage(
        {
          type: 'COPILOT_PROBE_ACTION',
          payload: {
            action,
            sessionId: data.sessionId,
            dimension_key: probe.dimension,
            technique: probe.technique,
            probe_text: probe.text,
            reason: probe.reason,
            probe: probe,
          },
        },
        '*'
      );

      // Visually remove the probe after the user acts.
      const section = btn.closest('.section');
      if (section) section.remove();
      if (currentData) currentData.probe = null;
    });
  });
}

window.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg && msg.type === 'COPILOT_DATA') {
    render(msg.payload);
  }
});

// Notify the parent content script that the overlay is ready to receive data.
parent.postMessage({ type: 'OVERLAY_READY' }, '*');

// Header controls.
document.getElementById('close-btn').addEventListener('click', () => {
  parent.postMessage({ type: 'CLOSE_OVERLAY' }, '*');
});

document.getElementById('minimize-btn').addEventListener('click', () => {
  minimized = !minimized;
  content.classList.toggle('hidden', minimized);
  document.getElementById('minimize-btn').textContent = minimized ? '+' : '−';
});
