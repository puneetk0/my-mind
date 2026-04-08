import React, { useState, useEffect, useCallback, useRef } from 'react';
import htm from 'htm';
const html = htm.bind(React.createElement);

// ==========================================
// Shortcuts Modal — Tactical Guide
// ==========================================
function ShortcutsModal({ onClose }) {
  const shortcuts = [
    { label: 'Toggle popover', keys: ['⌘', '⇧', 'P'] },
    { label: 'Pin / unpin open', keys: ['⌘', '⇧', 'L'] },
    { label: 'New mission', keys: ['⌘', 'N'] },
    { label: 'Launch / Save', keys: ['⌘', 'S'] },
    { label: 'Telemetry manual', keys: ['⌘', ','] },
    { label: 'Abort / Back', keys: ['Esc'] },
  ];

  return html`
    <div class="overlay-modal" onClick=${onClose}>
      <div class="shortcuts-panel carbon-fiber" onClick=${(e) => e.stopPropagation()}>
        <div class="detail-header">
          <div style=${{ justifySelf: 'start' }}>
            <button class="back-btn" onClick=${onClose}>
              <span class="back-arrow-box">×</span>
              CLOSE GUIDE
            </button>
          </div>
        </div>
        <div class="panel-eyebrow" style=${{ marginTop: '20px' }}>Tactical Control Shortcuts</div>
        <div class="shortcuts-grid">
          ${shortcuts.map(({ label, keys }) => html`
            <span class="shortcut-label" key=${label}>${label.toUpperCase()}</span>
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
// Celebration Overlay — Podium Finish
// ==========================================
function CelebrationOverlay({ task, onClose, onAdd }) {
  return html`
    <div class="overlay-modal glass-blur celebration-overlay">
      <div class="celebrating-card carbon-fiber">
        <div class="celebrating-header">
          <div class="trophy-icon">🏆</div>
          <div class="celebration-subtitle">PODIUM FINISH</div>
        </div>
        <div class="celebration-title">MISSION COMPLETE</div>
        
        <div class="celebration-actions" style=${{ marginTop: '30px', width: '280px' }}>
          <button class="btn-return-pit" onClick=${onClose} style=${{ fontWeight: 1000, letterSpacing: '3px' }}>
            RETURN TO TRACK
          </button>
          <button class="btn-stay-garage" onClick=${onAdd} style=${{ fontWeight: 900, letterSpacing: '2px' }}>
            NEXT MISSION
          </button>
        </div>
      </div>
    </div>
  `;
}

export { CelebrationOverlay, ShortcutsModal };
