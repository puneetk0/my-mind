import React, { useState, useEffect, useCallback, useRef } from 'react';
import htm from 'htm';
const html = htm.bind(React.createElement);

// ==========================================
// Task Detail Screen — Race Telemetry Mode
// ==========================================
function TaskDetail({ task, tasks, goHome, goToAdd, refreshTasks, onCompleteTask, constructors }) {
  if (!task) {
    return html`
      <div class="overlay-modal">
        <div class="detail-shell">
          <div class="detail-header">
            <button class="back-btn" onClick=${goHome}>
              <span class="back-arrow-box">←</span>
              PIT LANE
            </button>
          </div>
          <div class="empty-state">SIGNAL LOST... CHECK TRACK CONNECTION</div>
        </div>
      </div>
    `;
  }

  const [localSubtasks, setLocalSubtasks] = useState(task ? [...task.subtasks] : []);
  
  useEffect(() => {
    if (task) setLocalSubtasks([...task.subtasks]);
  }, [task]);

  // --- Drag and Drop state ---
  const [dragItemIndex, setDragItemIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);

  const handleDragStart = (e, i) => { setDragItemIndex(i); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragEnter = (e, i) => { e.preventDefault(); setDragOverItemIndex(i); };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const handleDrop = async (e, i) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragItemIndex !== null && dragItemIndex !== i) {
      const copy = [...localSubtasks];
      const item = copy.splice(dragItemIndex, 1)[0];
      copy.splice(i, 0, item);
      setLocalSubtasks(copy);

      const newIds = copy.map(s => s.id);
      try {
        if (window.pond.reorderSubtasks) {
          await window.pond.reorderSubtasks(task.id, newIds);
        }
      } finally {
        refreshTasks();
      }
    }
    setDragItemIndex(null);
    setDragOverItemIndex(null);
  };

  const handleDragEnd = () => { setDragItemIndex(null); setDragOverItemIndex(null); };

  const handleToggle = async (subtaskId) => {
    const current = localSubtasks.find(s => s.id === subtaskId);
    const newState = current ? !current.completed : true;
    
    let evaluated = localSubtasks.map(ch =>
      ch.id === subtaskId ? { ...ch, completed: newState } : ch
    );
    evaluated = [...evaluated].sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      return 0;
    });
    setLocalSubtasks(evaluated);

    await window.pond.toggleSubtask(subtaskId);
    const newIds = evaluated.map(s => s.id);
    if (window.pond.reorderSubtasks) {
      await window.pond.reorderSubtasks(task.id, newIds);
    }
    
    const fullyDone = evaluated.length > 0 && evaluated.every(st => st.completed);
    if (fullyDone) { onCompleteTask(task); } else { await refreshTasks(); }
  };

  const hasSubtasks = localSubtasks && localSubtasks.length > 0;
  const completedCount = hasSubtasks ? localSubtasks.filter(s => s.completed).length : 0;
  const totalCount = hasSubtasks ? localSubtasks.length : 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Sector breakdown
  let s1Total = 0, s2Total = 0, s3Total = 0;
  let s1Done = 0, s2Done = 0, s3Done = 0;
  
  if (totalCount > 0) {
    s1Total = Math.ceil(totalCount / 3);
    s2Total = Math.ceil((totalCount - s1Total) / 2);
    s3Total = totalCount - s1Total - s2Total;

    const s1Items = localSubtasks.slice(0, s1Total);
    const s2Items = localSubtasks.slice(s1Total, s1Total + s2Total);
    const s3Items = localSubtasks.slice(s1Total + s2Total);

    s1Done = s1Items.filter(s => s.completed).length;
    s2Done = s2Items.filter(s => s.completed).length;
    s3Done = s3Items.filter(s => s.completed).length;
  }

  const sectorColor = (done, total) => {
    if (total === 0) return 'rgba(255,255,255,0.05)';
    return done === total ? '#00ff88' : (done > 0 ? '#ffdd00' : 'rgba(255,255,255,0.08)');
  };

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  const laneConstr = constructors.find(c => c.id === task.constructor_id) || {};
  const accentColor = laneConstr.primary_color || '#ffffff';

  const position = (() => {
    const activeTasks = tasks ? tasks.filter(t => t.lane >= 1 && t.lane <= 10) : [];
    const ranked = [...activeTasks].sort((a, b) => {
      const pctA = a.subtasks.length > 0 ? a.subtasks.filter(s => s.completed).length / a.subtasks.length : 0;
      const pctB = b.subtasks.length > 0 ? b.subtasks.filter(s => s.completed).length / b.subtasks.length : 0;
      return pctB - pctA;
    });
    const idx = ranked.findIndex(t => t.id === task.id);
    return idx !== -1 ? idx + 1 : 1;
  })();

  return html`
    <div class="overlay-modal">
      <div class="detail-shell">

        <!-- Header -->
        <div class="detail-header">
          <div style=${{ justifySelf: 'start' }}>
            <button class="back-btn" onClick=${goHome}>
              <span class="back-arrow-box">←</span>
              PIT LANE
            </button>
          </div>
          <div style=${{ justifySelf: 'center' }}>
            ${laneConstr.name ? html`
              <div class="team-badge" style=${{ 
                borderColor: accentColor + '88', 
                background: accentColor + '22',
                boxShadow: '0 0 20px ' + accentColor + '33'
              }}>
                <span class="badge-team" style=${{ color: accentColor }}>${laneConstr.name.toUpperCase()}</span>
              </div>
            ` : null}
          </div>
          <div style=${{ justifySelf: 'end' }}>
            <button class="back-btn" style=${{ paddingRight: 0 }} onClick=${() => goToAdd(task.constructor_id, task)}>
              MODIFY SPECS
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="detail-body">

          <!-- Left: Mission Status & Objectives -->
          <div class="detail-left-panel">
            <div class="panel-eyebrow">Active Mission Telemetry</div>
            <div class="detail-task-title">${task.title.toUpperCase()}</div>
            ${task.note ? html`<p class="detail-task-note">${task.note}</p>` : null}

            <div class="panel-eyebrow" style=${{ marginTop: '10px' }}>
               Tactical Objectives 
               <span style=${{ marginLeft: 'auto', color: accentColor }}>${completedCount}/${totalCount}</span>
            </div>

            <div class="detail-subtask-list">
              ${hasSubtasks ? localSubtasks.map((st, i) => html`
                <div
                  class=${'detail-st-row' + (st.completed ? ' st-done' : '')}
                  key=${st.id}
                  draggable="true"
                  onClick=${() => handleToggle(st.id)}
                  onDragStart=${(e) => handleDragStart(e, i)}
                  onDragEnter=${(e) => handleDragEnter(e, i)}
                  onDragOver=${handleDragOver}
                  onDrop=${(e) => handleDrop(e, i)}
                  onDragEnd=${handleDragEnd}
                  style=${dragItemIndex === i ? { opacity: 0.3 } : (dragOverItemIndex === i && dragItemIndex !== i ? { borderTop: '2px solid ' + accentColor } : {})}
                >
                  <div class="detail-chk" style=${{ 
                    borderColor: st.completed ? accentColor : 'rgba(255,255,255,0.2)', 
                    background: st.completed ? accentColor : 'transparent',
                    boxShadow: st.completed ? '0 0 10px ' + accentColor : 'none'
                  }}>
                    ${st.completed ? html`<span style=${{ color: '#000' }}>✓</span>` : ''}
                  </div>
                  <span class=${st.completed ? 'st-label done' : 'st-label'}>${st.title}</span>
                </div>
              `) : html`<div class="empty-state">NO OBJECTIVES ASSIGNED</div>`}
            </div>
          </div>

          <!-- Right: Race Metrics -->
          <div class="detail-right-col">
            <div class="race-data-card">
              <div class="panel-eyebrow">Race Progress</div>

              <div class="progress-circle-wrap">
                <svg width="110" height="110" viewBox="0 0 110 110" style=${{ transform: 'rotate(-90deg)' }}>
                  <circle cx="55" cy="55" r=${radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10"/>
                  <circle
                    cx="55" cy="55" r=${radius}
                    fill="none"
                    stroke=${accentColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray=${circumference}
                    strokeDashoffset=${dashOffset}
                    style=${{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </svg>
                <div class="circle-label">
                  <span class="circle-pct">${progressPct}</span>
                  <span class="circle-unit">PCT</span>
                </div>
              </div>

              <div class="sector-bars">
                ${[
                  ['S1', s1Done, s1Total],
                  ['S2', s2Done, s2Total],
                  ['S3', s3Done, s3Total],
                ].map(([label, done, total]) => html`
                  <div class="sector-row" key=${label}>
                    <span class="sector-label">${label}</span>
                    <div class="sector-track">
                      <div class="sector-fill" style=${{
                        width: (total > 0 ? Math.round((done / total) * 100) : 0) + '%',
                        background: sectorColor(done, total),
                        boxShadow: done === total ? '0 0 10px #00ff88' : 'none'
                      }}></div>
                    </div>
                  </div>
                `)}
              </div>
            </div>

            <div class="race-data-card" style=${{ flex: 1, justifyContent: 'space-between' }}>
              <div class="pit-stats">
                <div class="pit-stat-row">
                  <span class="pit-key">GRID POS</span>
                  <span class="pit-val" style=${{ color: accentColor }}>P${position}</span>
                </div>
                <div class="pit-stat-row">
                  <span class="pit-key">REMAINING</span>
                  <span class="pit-val">${totalCount - completedCount} OBJ</span>
                </div>
              </div>
              
              <button
                class="chequered-btn"
                onClick=${() => onCompleteTask(task)}
                style=${{ 
                   background: progressPct === 100 ? '#fff' : 'rgba(255,255,255,0.1)',
                   color: progressPct === 100 ? '#000' : 'rgba(255,255,255,0.3)',
                   border: progressPct === 100 ? 'none' : '1px solid rgba(255,255,255,0.1)',
                   boxShadow: progressPct === 100 ? '0 0 30px rgba(255,255,255,0.4)' : 'none'
                }}
              >
                CHEQUERED FLAG
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

export default TaskDetail;
