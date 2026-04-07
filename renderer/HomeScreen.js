import React, { useState, useEffect, useCallback, useRef } from 'react';
import htm from 'htm';
const html = htm.bind(React.createElement);

// ==========================================
// Home Screen (Track View)
// ==========================================
function Home({ tasks, constructors, onAddClick, onTaskClick, onShortcutsClick, finishing, onSwapLanes }) {
  const [dragOverLane, setDragOverLane] = useState(null);
  const [pinned, setPinned] = useState(false);

useEffect(() => {
  if (window.pond.onPinned) {
    return window.pond.onPinned((val) => setPinned(val));
  }
}, []);

const handlePin = () => {
  window.pond.pin();
};

  return html`
    <div class="lanes-wrapper">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lane => {
        const task = tasks.find(t => t.lane === lane);
        const isFinishingLane = finishing && finishing.lane === lane;
        const laneTask = isFinishingLane ? finishing.task : task;
        const laneConstr = constructors.find(c => c.id === lane);

        let progress = 0;
        if (laneTask && laneTask.subtasks && laneTask.subtasks.length > 0) {
          const comp = laneTask.subtasks.filter(s => s.completed).length;
          progress = comp / laneTask.subtasks.length;
        }

        let bottomPx = laneTask ? Math.round(24 + (progress * 323)) : 24;
        if (isFinishingLane && finishing.offscreen) bottomPx = 560;
        const carImgSrc = laneConstr ? '../../assets/cars/car' + laneConstr.id + '.png' : '';

        return html`
          <div
            key=${lane}
            class=${'lane' + (dragOverLane === lane ? ' drag-over-lane' : '')}
            data-lane=${lane}
            onDragEnter=${(e) => e.preventDefault()}
            onDragOver=${(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverLane(lane);
            }}
            onDragLeave=${() => setDragOverLane(null)}
            onDrop=${(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOverLane(null);
              const source = e.dataTransfer.getData('sourceLane');
              if (source && parseInt(source, 10) !== lane) {
                onSwapLanes(parseInt(source, 10), lane);
              }
            }}
            onClick=${() => laneTask ? onTaskClick(laneTask.id) : onAddClick(lane)}
          >
            ${laneTask ? html`
              <div class="car-img" style=${{ bottom: bottomPx + 'px', cursor: 'grab' }}
                   draggable="true"
                   onDragStart=${(e) => {
                     e.stopPropagation();
                     e.dataTransfer.setData('sourceLane', lane);
                     e.dataTransfer.effectAllowed = 'move';
                   }}
              >
                <img
                  src=${carImgSrc}
                  onError=${(e) => { e.target.style.display = 'none'; }}
                  style=${{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                />
              </div>
              <div class="task-label">${laneTask.title}</div>
            ` : null}
            ${!laneTask ? html`
              <button
                class="add-lane-btn"
                onClick=${(e) => { e.stopPropagation(); onAddClick(lane); }}
              >+</button>
            ` : null}
          </div>
        `;
      })}
    </div>
    <div class="home-footer">
      <span class="watermark">Made by Puneet Kathuria</span>
      <div class="pin-diff">
      <button class="shortcuts-trigger" onClick=${onShortcutsClick}>
  ⌘ Shortcuts
</button>
      <button 
  class=${'pin-btn' + (pinned ? ' pinned' : '')} 
  onClick=${handlePin}
  title=${pinned ? 'Unpin' : 'Pin open'}
>
  ${pinned ? 'Unpin' : 'Pin'}
</button>
</div>
    </div>
  `;
}

export default Home;
