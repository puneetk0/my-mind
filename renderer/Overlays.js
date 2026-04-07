// ==========================================
// Shortcuts Modal
// ==========================================
function ShortcutsModal({ onClose }) {
  const shortcuts = [
    { label: 'Toggle popover', keys: ['⌘', '⇧', 'P'] },
    { label: 'Pin / unpin open', keys: ['⌘', '⇧', 'L'] },
    { label: 'New task', keys: ['⌘', 'N'] },
    { label: 'Save / launch', keys: ['⌘', 'S'] },
    { label: 'This screen', keys: ['⌘', ','] },
    { label: 'Go back / close', keys: ['Esc'] },
  ];

  return html`
    <div class="overlay-modal" onClick=${onClose}>
      <div class="shortcuts-panel" onClick=${(e) => e.stopPropagation()}>
        <div class="detail-header">
          <button class="back-btn" onClick=${onClose}>
            <span class="back-arrow-box">X</span>
            Back to Track
          </button>
        </div>
        <div class="panel-eyebrow" style=${{ marginTop: '10px' }}>Keyboard Shortcuts</div>
        <div class="shortcuts-grid">
          ${shortcuts.map(({ label, keys }) => html`
            <span class="shortcut-label" key=${label}>${label}</span>
            <div class="shortcut-keys" key=${label + '-keys'}>
              ${keys.map(k => html`<span class="key" key=${k}>${k}</span>`)}
            </div>
          `)}
        </div>
      </div>
    </div>
  `;
}
// ==========================================
// Celebration Overlay
// ==========================================
function CelebrationOverlay({ task, onClose, onAdd }) {
  return html`
    <div class="overlay-modal glass-blur celebration-overlay">
      <div class="celebrating-card">
        <div class="celebrating-header">
          <div class="trophy-icon">🏁</div>
          <div class="celebration-subtitle">Task Finished</div>
        </div>
        <div class="celebration-title">CONGRATULATIONS</div>
        
        <div class="celebration-actions" style=${{ marginTop: '24px', width: '260px' }}>
          <button class="btn-return-pit" onClick=${onClose}>
            Return to Track
          </button>
          <button class="btn-stay-garage" onClick=${onAdd}>
            Add New Task
          </button>
        </div>
      </div>
    </div>
  `;
}
