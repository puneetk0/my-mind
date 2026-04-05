// HTM + React — no build step needed
const html = htm.bind(React.createElement);
const { useState, useEffect, useCallback, useRef } = React;

// ==========================================
// TaskCard Component
// ==========================================
function TaskCard({ title, onClick }) {
  return html`
    <button class="task-card" onClick=${onClick}>
      ${title}
    </button>
  `;
}

// ==========================================
// Checkbox Component (pure CSS, no SVG)
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
function Home({ tasks, onAddClick, onTaskClick, constructors }) {
  // We have 10 lanes, fixed 1 to 10
  const lanes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return html`
    <div class="pond-root">
      <div class="track-container">
        
        <div class="lanes-wrapper">
          ${lanes.map(lane => {
            const laneConstr = constructors.find(c => c.id === lane);
            const task = tasks.find(t => t.lane === lane);
            
            // Calculate progress (0 to 1)
            let progress = 0;
            if (task && task.subtasks && task.subtasks.length > 0) {
              const comp = task.subtasks.filter(s => s.completed).length;
              progress = comp / task.subtasks.length;
            }

            // Starts at bottom: 40px (above start line), finishes at upper bounds
            const bottomPx = task ? Math.round(50 + (progress * 420)) : 0;
            const primaryColor = laneConstr ? laneConstr.primary_color : '#333';
            const carImgSrc = laneConstr ? ('../assets/cars/' + laneConstr.car_file) : '';

            return html`
              <div 
                key=${lane} 
                class="lane" 
                data-lane=${lane}
                onClick=${() => task ? onTaskClick(task.id) : null}
              >
                ${task ? html`
                  <div 
                    class="car-img" 
                    style=${{ 
                      bottom: bottomPx + 'px',
                      backgroundColor: primaryColor, // fallback if img fails
                    }}
                  >
                    <img 
                      src=${carImgSrc} 
                      onError=${(e) => { e.target.style.display = 'none'; }} 
                      style=${{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                    <div class="task-label">${task.title}</div>
                  </div>
                ` : null}

                ${!task ? html`
                  <button 
                    class="add-lane-btn" 
                    onClick=${(e) => { e.stopPropagation(); onAddClick(lane); }}
                  >
                    +
                  </button>
                ` : null}
              </div>
            `;
          })}
        </div>
      </div>
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
    if (e.key === 'Enter') { 
      e.preventDefault(); 
      handleSubmit(); 
    }
  };

  const handleSubtaskKey = (e, i) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        addSubtask();
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Backspace' && subtasks[i] === '') {
      e.preventDefault();
      removeSubtask(i);
      if (i > 0) setTimeout(() => subtaskRefs.current[i - 1] && subtaskRefs.current[i - 1].focus(), 50);
      else noteRef.current && noteRef.current.focus();
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (!constructorId) { setError('Choose a car'); return; }
    setError('');
    
    await window.pond.addTask({
      title: title.trim(),
      note: note.trim() || null,
      subtasks: subtasks.filter(s => s.trim()),
      constructor_id: constructorId
    });
    goHome();
  };

  return html`
    <div class="add-task">
      <input
        ref=${titleRef}
        class="add-title-input"
        type="text"
        placeholder="Task title"
        value=${title}
        onInput=${(e) => setTitle(e.target.value)}
        onKeyDown=${handleTitleKey}
      />

      <div class="divider" />

      <textarea
        ref=${noteRef}
        class="add-note-input"
        placeholder="Notes (optional)"
        value=${note}
        onInput=${(e) => setNote(e.target.value)}
      />

      <div class="divider" />

      <div class="subtask-section">
        <span class="section-label">SUBTASKS</span>

        ${subtasks.map((st, i) => html`
          <div class="subtask-row-edit" key=${i}>
            <span class="subtask-bullet">○</span>
            <input
              ref=${(el) => { subtaskRefs.current[i] = el; }}
              class="subtask-input"
              type="text"
              placeholder="Subtask"
              value=${st}
              onInput=${(e) => updateSubtask(i, e.target.value)}
              onKeyDown=${(e) => handleSubtaskKey(e, i)}
            />
            <button class="remove-btn" onClick=${() => removeSubtask(i)}>×</button>
          </div>
        `)}

        <button class="add-subtask-btn" onClick=${addSubtask}>
          + Add subtask
        </button>
      </div>

      <div class="divider" style=${{ margin: '12px 14px 4px' }} />

      <span class="section-label">CHOOSE YOUR CAR</span>
      
      <div class="constructor-grid">
        ${(constructors || []).map(c => html`
          <div
            key=${c.id}
            class=${'constructor-chip ' + (c.available ? '' : 'disabled ') + (constructorId === c.id ? 'selected' : '')}
            style=${{ backgroundColor: c.primary_color, borderColor: constructorId === c.id ? c.secondary_color : 'transparent' }}
            onClick=${() => { if(c.available) { setConstructorId(c.id); setError(''); } }}
          >
            <span class="constructor-chip-label">${c.name}</span>
          </div>
        `)}
      </div>

      ${error ? html`<div class="error-text">${error}</div>` : null}

      <div class="button-row">
        <button class="cancel-btn" onClick=${goHome}>Cancel</button>
        <button
          class="add-button"
          onClick=${handleSubmit}
        >
          Add task →
        </button>
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
      <div class="detail">
        <div class="detail-header">
          <button class="back-button" onClick=${goHome}>← Back</button>
        </div>
        <div class="empty-state">Task not found.</div>
      </div>
    `;
  }

  const handleToggle = async (subtaskId) => {
    await window.pond.toggleSubtask(subtaskId);
    await refreshTasks();
  };

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedCount = hasSubtasks ? task.subtasks.filter(s => s.completed).length : 0;
  const totalCount = hasSubtasks ? task.subtasks.length : 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  const laneConstr = constructors.find(c => c.id === task.constructor_id) || {};

  return html`
    <div class="detail">
      <div class="detail-header">
        <button class="back-button" onClick=${goHome}>← Back</button>
        ${laneConstr.name ? html`
          <span class="constructor-badge" style=${{ backgroundColor: laneConstr.primary_color }}>
            ${laneConstr.name}
          </span>
        ` : null}
      </div>

      <h1 class="detail-title">${task.title}</h1>
      ${task.note ? html`<p class="detail-note">${task.note}</p>` : null}

      ${hasSubtasks ? html`
        <div class="divider" style=${{ margin: '14px 14px 4px' }} />
        <div class="section-label" style=${{ display: 'flex', justifyContent: 'space-between' }}>
          <span>SUBTASKS</span>
          <span>${completedCount} / ${totalCount} complete</span>
        </div>
        
        <div class="subtask-list">
          ${task.subtasks.map(st => html`
            <div class="subtask-row" key=${st.id}>
              <${Checkbox}
                checked=${st.completed}
                onChange=${() => handleToggle(st.id)}
              />
              <span class=${st.completed ? 'subtask-label-done' : 'subtask-label'}>
                ${st.title}
              </span>
            </div>
          `)}
        </div>
      ` : html`<div class="subtask-list"></div>`}

      <div class="detail-footer">
        ${hasSubtasks ? html`
          <div class="progress-track">
            <div 
              class="progress-fill" 
              style=${{ 
                width: progressPercent + '%', 
                backgroundColor: laneConstr.primary_color || '#fff' 
              }} 
            />
          </div>
        ` : null}
        
        <button class="mark-done-btn" onClick=${() => onCompleteTask(task)}>
          Mark as done
        </button>
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
      const data = await window.pond.getTasks();
      setTasks(data);
      if (window.pond.getConstructors) {
        const cData = await window.pond.getConstructors();
        setConstructors(cData);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  // Refresh tasks when popover is shown
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
    // 1. Go to home screen immediately to see the track
    setScreen('home');
    setSelectedTaskId(null);

    // 2. Wait for DOM to render the home screen
    setTimeout(() => {
      const laneEl = document.querySelector('.lane[data-lane="' + task.lane + '"]');
      if (!laneEl) {
         window.pond.completeTask(task.id).then(refreshData);
         return;
      }
      
      const carEl = laneEl.querySelector('.car-img');
      const colorBar = laneEl.querySelector('.lane-color-bar');
      const constructorColor = colorBar ? colorBar.style.backgroundColor : '#fff';

      if (carEl) {
        // Car drives off the top of the lane
        carEl.style.transition = 'bottom 0.4s ease-in';
        carEl.style.bottom = '560px'; // off screen top

        // Flash the lane
        setTimeout(() => {
          laneEl.style.backgroundColor = constructorColor;
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

  // Global Escape — go back or close popover
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (screen !== 'home') {
          setScreen('home');
        } else if (window.pond && window.pond.escape) {
          window.pond.escape();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [screen]);

  if (screen === 'add') {
    return html`<${AddTask} 
      goHome=${goHome} 
      constructors=${constructors} 
      preSelectedConstructorId=${intendedConstructorId}
    />`;
  }

  if (screen === 'detail') {
    const task = tasks.find(t => t.id === selectedTaskId) || null;
    return html`<${TaskDetail} 
      task=${task} 
      goHome=${goHome} 
      refreshTasks=${refreshData} 
      constructors=${constructors}
      onCompleteTask=${handleCompleteTask}
    />`;
  }

  // Default: home
  return html`
    <${Home}
      tasks=${tasks}
      constructors=${constructors}
      onAddClick=${goToAdd}
      onTaskClick=${goToDetail}
    />
  `;
}

// ==========================================
// Mount
// ==========================================
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
