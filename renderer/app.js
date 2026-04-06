// HTM + React — no build step needed
const html = htm.bind(React.createElement);
const { useState, useEffect, useCallback, useRef } = React;

// ==========================================
// Checkbox Component
// ==========================================
function Checkbox({ checked, onChange }) {
  return html`
    <button
      class=${checked ? 'checkbox checked' : 'checkbox'}
      onClick=${onChange}
    >
      ${checked ? '✓' : ''}
    </button>
  `;
}

// ==========================================
// Home Screen (Track View)
// ==========================================
function Home({ tasks, constructors, onAddClick, onTaskClick }) {
  return html`
    <div class="lanes-wrapper">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lane => {
        const task = tasks.find(t => t.lane === lane);
        const laneConstr = constructors.find(c => c.id === lane);

        let progress = 0;
        if (task && task.subtasks && task.subtasks.length > 0) {
          const comp = task.subtasks.filter(s => s.completed).length;
          progress = comp / task.subtasks.length;
        }

        const bottomPx = task ? Math.round(24 + (progress * 323)) : 24;
        const carImgSrc = laneConstr ? '../assets/cars/car.png' : '';

        return html`
          <div
            key=${lane}
            class="lane"
            data-lane=${lane}
            onClick=${() => task ? onTaskClick(task.id) : onAddClick(lane)}
          >
            ${task ? html`
              <div class="car-img" style=${{ bottom: bottomPx + 'px' }}>
                <img
                  src=${carImgSrc}
                  onError=${(e) => { e.target.style.display = 'none'; }}
                  style=${{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div class="task-label">${task.title}</div>
            ` : null}
            ${!task ? html`
              <button
                class="add-lane-btn"
                onClick=${(e) => { e.stopPropagation(); onAddClick(lane); }}
              >+</button>
            ` : null}
          </div>
        `;
      })}
    </div>
  `;
}

// ==========================================
// Add Task Screen
// ==========================================
function AddTask({ goHome, constructors, preSelectedConstructorId }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [constructorId, setConstructorId] = useState(preSelectedConstructorId || null);
  const [error, setError] = useState('');
  const titleRef = useRef(null);
  const noteRef = useRef(null);
  const subtaskRefs = useRef([]);

  useEffect(() => { titleRef.current && titleRef.current.focus(); }, []);

  const addSubtask = () => {
    setSubtasks(prev => [...prev, '']);
    setTimeout(() => {
      const refs = subtaskRefs.current;
      if (refs[refs.length - 1]) refs[refs.length - 1].focus();
    }, 50);
  };

  const updateSubtask = (i, val) => {
    setSubtasks(prev => { const n = [...prev]; n[i] = val; return n; });
  };

  const removeSubtask = (i) => {
    setSubtasks(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleTitleKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  };

  const handleSubtaskKey = (e, i) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) { addSubtask(); } else { handleSubmit(); }
    } else if (e.key === 'Backspace' && subtasks[i] === '') {
      e.preventDefault();
      removeSubtask(i);
      if (i > 0) setTimeout(() => subtaskRefs.current[i - 1] && subtaskRefs.current[i - 1].focus(), 50);
      else noteRef.current && noteRef.current.focus();
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title required'); return; }
    if (!constructorId) { setError('Choose a constructor'); return; }
    setError('');
    await window.pond.addTask({
      title: title.trim(),
      note: note.trim() || null,
      subtasks: subtasks.filter(s => s.trim()),
      constructor_id: constructorId
    });
    goHome();
  };

  const selectedConstr = (constructors || []).find(c => c.id === constructorId);

  return html`
    <div class="overlay-modal">
      <div class="add-task-garage">

        <!-- Left: Telemetry panel -->
        <div class="garage-left-panel">
          <div class="panel-top-bar" style=${{ background: selectedConstr ? selectedConstr.primary_color : 'rgba(255,255,255,0.15)' }}></div>
          <div class="panel-eyebrow">Race Engineer — Task Brief</div>

          <div class="rpm-bar">
            ${[...Array(12)].map((_, i) => html`
              <div key=${i} class=${'rpm-seg' + (i < 3 ? ' green' : i < 5 ? ' yellow' : i < 7 ? ' red' : '')}></div>
            `)}
          </div>

          <div class="title-section">
            <input
              ref=${titleRef}
              class="task-title-input"
              type="text"
              placeholder="Mission name..."
              value=${title}
              onInput=${(e) => setTitle(e.target.value)}
              onKeyDown=${handleTitleKey}
            />
          </div>

          <textarea
            ref=${noteRef}
            class="task-note-input"
            placeholder="Telemetry notes (optional)"
            value=${note}
            onInput=${(e) => setNote(e.target.value)}
          />

          <div class="objectives-section">
            <div class="section-eyebrow">Objectives</div>
            <div class="subtask-scroll">
              ${subtasks.map((st, i) => html`
                <div class="objective-row" key=${i}>
                  <span class="obj-bullet">○</span>
                  <input
                    ref=${(el) => { subtaskRefs.current[i] = el; }}
                    class="objective-input"
                    type="text"
                    placeholder="Objective ${i + 1}"
                    value=${st}
                    onInput=${(e) => updateSubtask(i, e.target.value)}
                    onKeyDown=${(e) => handleSubtaskKey(e, i)}
                  />
                  <button class="obj-remove" onClick=${() => removeSubtask(i)}>×</button>
                </div>
              `)}
            </div>
            <button class="add-objective-btn" onClick=${addSubtask}>+ Add Objective</button>
          </div>
        </div>

        <!-- Right: Garage / Constructor picker -->
        <div class="garage-right-panel">
          <div class="panel-top-bar" style=${{ background: 'rgba(255,255,255,0.1)' }}></div>
          <div class="panel-eyebrow">Garage Bay — Constructor</div>

          <div class="start-lights-row">
            <div class="start-light on"></div>
            <div class="start-light on"></div>
            <div class="start-light on"></div>
            <div class="start-light on"></div>
            <div class="start-light"></div>
            ${error ? html`<span class="garage-error-pill">${error}</span>` : html`<span class="select-team-label">Select Team</span>`}
          </div>

          <div class="constructor-grid">
            ${(constructors || []).map(c => html`
              <div
                key=${c.id}
                class=${'constructor-tile' + (!c.available ? ' tile-disabled' : '') + (constructorId === c.id ? ' tile-selected' : '')}
                style=${{
                  borderColor: constructorId === c.id ? c.primary_color : 'transparent',
                  boxShadow: constructorId === c.id ? ('0 0 0 1px ' + c.primary_color + ', inset 0 0 20px rgba(0,0,0,0.3)') : 'none'
                }}
                onClick=${() => { if (c.available) { setConstructorId(c.id); setError(''); } }}
              >
                <div class="tile-color-bar" style=${{ background: c.primary_color }}></div>
                <span class="tile-name">${c.name}</span>
                ${!c.available ? html`<span class="tile-occupied">●</span>` : null}
              </div>
            `)}
          </div>

          <div class="launch-row">
            <button class="btn-abort" onClick=${goHome}>Abort</button>
            <button
              class="btn-launch"
              style=${{ background: selectedConstr ? selectedConstr.primary_color : '#ffffff' }}
              onClick=${handleSubmit}
            >
              Launch ▶
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

// ==========================================
// Task Detail Screen
// ==========================================
function TaskDetail({ task, goHome, refreshTasks, onCompleteTask, constructors }) {
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

  const handleToggle = async (subtaskId) => {
    const current = task.subtasks.find(s => s.id === subtaskId);
    const newState = current ? !current.completed : true;
    await window.pond.toggleSubtask(subtaskId);
    const evaluated = task.subtasks.map(ch =>
      ch.id === subtaskId ? { ...ch, completed: newState } : ch
    );
    const fullyDone = evaluated.length > 0 && evaluated.every(st => st.completed);
    if (fullyDone) { onCompleteTask(task); } else { await refreshTasks(); }
  };

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedCount = hasSubtasks ? task.subtasks.filter(s => s.completed).length : 0;
  const totalCount = hasSubtasks ? task.subtasks.length : 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Sector breakdown: split subtasks into 3 roughly equal sectors
  const s1End = Math.ceil(totalCount / 3);
  const s2End = Math.ceil(totalCount * 2 / 3);
  const s1Done = hasSubtasks ? task.subtasks.slice(0, s1End).filter(s => s.completed).length : 0;
  const s2Done = hasSubtasks ? task.subtasks.slice(s1End, s2End).filter(s => s.completed).length : 0;
  const s3Done = hasSubtasks ? task.subtasks.slice(s2End).filter(s => s.completed).length : 0;
  const s1Total = s1End;
  const s2Total = s2End - s1End;
  const s3Total = totalCount - s2End;

  const sectorColor = (done, total) => {
    if (total === 0) return '#333';
    const r = done / total;
    if (r === 1) return '#00d066';
    if (r > 0) return '#ffe000';
    return 'rgba(255,255,255,0.08)';
  };

  // Circle arc
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  const laneConstr = constructors.find(c => c.id === task.constructor_id) || {};
  const accentColor = laneConstr.primary_color || '#ffffff';

  // Position display: task with most progress = P1
  const position = 1;

  return html`
    <div class="overlay-modal">
      <div class="detail-shell">

        <!-- Header -->
        <div class="detail-header">
          <button class="back-btn" onClick=${goHome}>
            <span class="back-arrow-box">←</span>
            Pit Lane
          </button>
          <div class="lap-counter">
            Lap ${completedCount} / ${totalCount}
          </div>
          ${laneConstr.name ? html`
            <div class="team-badge" style=${{ borderColor: accentColor + '55', background: accentColor + '18' }}>
              <div class="badge-pip" style=${{ background: accentColor }}></div>
              <span class="badge-team" style=${{ color: accentColor }}>${laneConstr.name.toUpperCase()}</span>
            </div>
          ` : null}
        </div>

        <!-- Body -->
        <div class="detail-body">

          <!-- Left: task info + subtasks -->
          <div class="detail-left-panel">
            <div class="panel-top-bar" style=${{ background: accentColor }}></div>
            <div class="detail-task-title">${task.title}</div>
            ${task.note ? html`<p class="detail-task-note">${task.note}</p>` : null}

            <div class="objectives-header">
              <span class="section-eyebrow">Objectives</span>
              <span class="section-eyebrow">${completedCount} / ${totalCount} complete</span>
            </div>

            <div class="detail-subtask-list">
              ${hasSubtasks ? task.subtasks.map(st => html`
                <div
                  class=${'detail-st-row' + (st.completed ? ' st-done' : '')}
                  key=${st.id}
                  onClick=${() => handleToggle(st.id)}
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
              <div class="panel-top-bar" style=${{ background: 'rgba(255,255,255,0.07)' }}></div>
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
              <div class="panel-top-bar" style=${{ background: 'rgba(255,255,255,0.07)' }}></div>
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

// ==========================================
// App Root
// ==========================================
function App() {
  const [screen, setScreen] = useState('home');
  const [tasks, setTasks] = useState([]);
  const [constructors, setConstructors] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [intendedConstructorId, setIntendedConstructorId] = useState(null);

  const refreshData = useCallback(async () => {
    try {
      if (window.pond.getConstructors) {
        const [tData, cData] = await Promise.all([
          window.pond.getTasks(),
          window.pond.getConstructors()
        ]);
        setConstructors(cData);
        setTasks(tData);
      } else {
        const data = await window.pond.getTasks();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  useEffect(() => {
    if (window.pond && window.pond.onShow) {
      const cleanup = window.pond.onShow(() => {
        refreshData();
        setScreen('home');
        setSelectedTaskId(null);
      });
      return cleanup;
    }
  }, [refreshData]);

  const goHome = useCallback(() => {
    refreshData();
    setScreen('home');
    setSelectedTaskId(null);
  }, [refreshData]);

  const handleCompleteTask = useCallback(async (task) => {
    setScreen('home');
    setSelectedTaskId(null);
    setTimeout(() => {
      const laneEl = document.querySelector('.lane[data-lane="' + task.lane + '"]');
      if (!laneEl) {
        window.pond.completeTask(task.id).then(refreshData);
        return;
      }
      const carEl = laneEl.querySelector('.car-img');
      if (carEl) {
        carEl.style.transition = 'bottom 0.4s ease-in';
        carEl.style.bottom = '560px';
        setTimeout(() => {
          laneEl.style.backgroundColor = 'rgba(255,255,255,0.15)';
          laneEl.style.transition = 'background-color 0.1s';
          setTimeout(() => {
            laneEl.style.backgroundColor = 'transparent';
            window.pond.completeTask(task.id).then(refreshData);
          }, 200);
        }, 400);
      } else {
        window.pond.completeTask(task.id).then(refreshData);
      }
    }, 50);
  }, [refreshData]);

  const goToAdd = useCallback((constructorId) => {
    setIntendedConstructorId(constructorId || null);
    setScreen('add');
  }, []);

  const goToDetail = useCallback((id) => {
    setSelectedTaskId(id);
    setScreen('detail');
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (screen !== 'home') { setScreen('home'); }
        else if (window.pond && window.pond.escape) { window.pond.escape(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [screen]);

  return html`
    <div class="pond-root">
      <div class="track-container">
        <${Home}
          tasks=${tasks}
          constructors=${constructors}
          onAddClick=${goToAdd}
          onTaskClick=${goToDetail}
        />
        ${screen === 'add' ? html`
          <${AddTask}
            goHome=${goHome}
            constructors=${constructors}
            preSelectedConstructorId=${intendedConstructorId}
          />
        ` : null}
        ${screen === 'detail' ? html`
          <${TaskDetail}
            task=${tasks.find(t => t.id === selectedTaskId) || null}
            goHome=${goHome}
            refreshTasks=${refreshData}
            constructors=${constructors}
            onCompleteTask=${handleCompleteTask}
          />
        ` : null}
      </div>
    </div>
  `;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);