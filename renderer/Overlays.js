// ==========================================
// Shortcuts Modal
// ==========================================
function ShortcutsModal({ onClose }) {
  return html`
    <div class="overlay-modal" onClick=${onClose}>
      <div class="shortcuts-panel" onClick=${(e) => e.stopPropagation()}>
        <div class="detail-header">
          <button class="back-btn" onClick=${onClose}>
            <span class="back-arrow-box">←</span>
            Back to Track
          </button>
        </div>
        <div class="panel-eyebrow" style=${{ marginTop: '10px' }}>Keyboard Shortcuts</div>
        <div class="shortcuts-grid">
          <span class="shortcut-label">New Task</span>
          <div class="shortcut-keys">
            <span class="key">⌘</span><span class="key">N</span>
          </div>
          <span class="shortcut-label">Save / Launch</span>
          <div class="shortcut-keys">
            <span class="key">⌘</span><span class="key">S</span>
          </div>
          <span class="shortcut-label">Save / Launch</span>
          <div class="shortcut-keys">
            <span class="key">⌘</span><span class="key">↵</span>
          </div>
          <span class="shortcut-label">Go Back / Close</span>
          <div class="shortcut-keys">
            <span class="key">Esc</span>
          </div>
          <span class="shortcut-label">Toggle Popover</span>
          <div class="shortcut-keys">
            <span class="key">⌘</span><span class="key">⇧</span><span class="key">P</span>
          </div>
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
