// ==========================================
// Task Detail Screen
// ==========================================
function TaskDetail({ task, tasks, goHome, goToAdd, refreshTasks, onCompleteTask, constructors }) {
  if (!task) {
    return html`
      <div class="overlay-modal">
        <div class="detail-shell">
          <div class="detail-header">
            <button class="back-btn" onClick=${goHome}>
              <span class="back-arrow-box">←</span>
              Pit Lane
            </button>
          </div>
          <div class="empty-state">Task lost on track.</div>
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

  const handleDragStart = (e, i) => {
    setDragItemIndex(i);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e, i) => {
    e.preventDefault();
    setDragOverItemIndex(i);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

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

  const handleDragEnd = () => {
    setDragItemIndex(null);
    setDragOverItemIndex(null);
  };

  // --- Subtask toggle ---
  const handleToggle = async (subtaskId) => {
    const current = localSubtasks.find(s => s.id === subtaskId);
    const newState = current ? !current.completed : true;
    await window.pond.toggleSubtask(subtaskId);
    
    const evaluated = localSubtasks.map(ch =>
      ch.id === subtaskId ? { ...ch, completed: newState } : ch
    );
    setLocalSubtasks(evaluated);
    
    const fullyDone = evaluated.length > 0 && evaluated.every(st => st.completed);
    if (fullyDone) { onCompleteTask(task); } else { await refreshTasks(); }
  };

  // --- Progress calculations ---
  const hasSubtasks = localSubtasks && localSubtasks.length > 0;
  const completedCount = hasSubtasks ? localSubtasks.filter(s => s.completed).length : 0;
  const totalCount = hasSubtasks ? localSubtasks.length : 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // --- Sector breakdown ---
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
    if (total === 0) return 'rgba(255,255,255,0.08)';
    const r = done / total;
    if (r === 1) return '#00d066';
    if (r > 0) return '#ffe000';
    return 'rgba(255,255,255,0.08)';
  };

  // --- Progress circle ---
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  const laneConstr = constructors.find(c => c.id === task.constructor_id) || {};
  const accentColor = laneConstr.primary_color || '#ffffff';
const position = (() => {
  if (!tasks || tasks.length === 0) return 1;
  const ranked = [...tasks].sort((a, b) => {
    const pctA = a.subtasks.length > 0
      ? a.subtasks.filter(s => s.completed).length / a.subtasks.length
      : 0;
    const pctB = b.subtasks.length > 0
      ? b.subtasks.filter(s => s.completed).length / b.subtasks.length
      : 0;
    return pctB - pctA;
  });
  return ranked.findIndex(t => t.id === task.id) + 1;
})();

  // --- Render ---
  return html`
    <div class="overlay-modal">
      <div class="detail-shell">

        <!-- Header -->
        <div class="detail-header">
          <div style=${{ justifySelf: 'start', display: 'flex' }}>
            <button class="back-btn" onClick=${goHome}>
              <span class="back-arrow-box">←</span>
              Pit Lane
            </button>
          </div>
          <div style=${{ justifySelf: 'center', display: 'flex' }}>
            ${laneConstr.name ? html`
              <div class="team-badge" style=${{ borderColor: accentColor + '88', background: accentColor + '33' }}>
               
                <span class="badge-team" style=${{ color: accentColor }}>${laneConstr.name.toUpperCase()}</span>
              </div>
            ` : null}
          </div>
          <div style=${{ justifySelf: 'end', display: 'flex' }}>
            <button class="back-btn" style=${{ paddingRight: 0 }} onClick=${() => goToAdd(task.constructor_id, task)}>
              Edit
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="detail-body">

          <!-- Left: task info + subtasks -->
          <div class="detail-left-panel">
            <div class="detail-task-title">${task.title}</div>
            ${task.note ? html`<p class="detail-task-note">${task.note}</p>` : null}

            <div class="objectives-header">
              <span class="section-eyebrow">Objectives</span>
              <span class="section-eyebrow">${completedCount} / ${totalCount} complete</span>
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
                  style=${dragItemIndex === i ? { opacity: 0.3 } : (dragOverItemIndex === i && dragItemIndex !== i ? { borderTop: dragItemIndex > i ? '2px solid rgba(255,255,255,0.4)' : '', borderBottom: dragItemIndex < i ? '2px solid rgba(255,255,255,0.4)' : '' } : {})}
                >
                  <div class=${'detail-chk' + (st.completed ? ' chk-filled' : '')}
                    style=${{ borderColor: st.completed ? accentColor : 'rgba(255,255,255,0.2)', background: st.completed ? accentColor : 'transparent' }}
                  >
                    ${st.completed ? '✓' : ''}
                  </div>
                  <span class=${st.completed ? 'st-label done' : 'st-label'}>${st.title}</span>
                </div>
              `) : html`<div class="empty-state" style=${{ flex: 1, fontSize: '12px' }}>No objectives set.</div>`}
            </div>
          </div>

          <!-- Right: race data -->
          <div class="detail-right-col">
            <!-- Progress circle card -->
            <div class="race-data-card">
              <div class="section-eyebrow">Race Progress</div>

              <div class="progress-circle-wrap">
                <svg width="90" height="90" viewBox="0 0 90 90" style=${{ transform: 'rotate(-90deg)' }}>
                  <circle cx="45" cy="45" r=${radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7"/>
                  <circle
                    cx="45" cy="45" r=${radius}
                    fill="none"
                    stroke=${accentColor}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray=${circumference}
                    strokeDashoffset=${dashOffset}
                    style=${{ transition: 'stroke-dashoffset 0.5s ease' }}
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
                        background: sectorColor(done, total)
                      }}></div>
                    </div>
                  </div>
                `)}
              </div>
            </div>

            <!-- Stats + flag card -->
            <div class="race-data-card flag-card">
              <div class="pit-stats">
                <div class="pit-stat-row">
                  <span class="pit-key">Position</span>
                  <span class="pit-val">P${position}</span>
                </div>
                <div class="pit-stat-row">
                  <span class="pit-key">Remaining</span>
                  <span class="pit-val">${totalCount - completedCount} obj</span>
                </div>
              </div>
              <button
                class="chequered-btn"
                onClick=${() => onCompleteTask(task)}
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
