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
// Home Screen
// ==========================================
function Home({ tasks, onAddClick, onTaskClick }) {
  return html`
    <div class="home">
      ${tasks.length === 0
        ? html`<div class="empty-state">No tasks. Add one.</div>`
        : html`
            <div class="task-list">
              ${tasks.map(task => html`
                <${TaskCard}
                  key=${task.id}
                  title=${task.title}
                  onClick=${() => onTaskClick(task.id)}
                />
              `)}
            </div>
          `
      }
      <button class="add-button" onClick=${onAddClick}>
        + Add task
      </button>
    </div>
  `;
}

// ==========================================
// Add Task Screen
// ==========================================
function AddTask({ goHome }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [subtasks, setSubtasks] = useState([]);
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
    if (e.key === 'Enter') { e.preventDefault(); noteRef.current && noteRef.current.focus(); }
  };

  const handleSubtaskKey = (e, i) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtask();
    } else if (e.key === 'Backspace' && subtasks[i] === '') {
      e.preventDefault();
      removeSubtask(i);
      if (i > 0) setTimeout(() => subtaskRefs.current[i - 1] && subtaskRefs.current[i - 1].focus(), 50);
      else noteRef.current && noteRef.current.focus();
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await window.pond.addTask({
      title: title.trim(),
      note: note.trim() || null,
      subtasks: subtasks.filter(s => s.trim()),
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

      <div class="button-row">
        <button class="cancel-btn" onClick=${goHome}>Cancel</button>
        <button
          class="add-button"
          onClick=${handleSubmit}
          disabled=${!title.trim()}
        >
          Add task
        </button>
      </div>
    </div>
  `;
}

// ==========================================
// Task Detail Screen
// ==========================================
function TaskDetail({ task, goHome, refreshTasks }) {
  // If task not found, show a fallback instead of calling goHome during render
  if (!task) {
    return html`
      <div class="detail">
        <button class="back-button" onClick=${goHome}>←</button>
        <div class="empty-state">Task not found.</div>
      </div>
    `;
  }

  const handleToggle = async (subtaskId) => {
    await window.pond.toggleSubtask(subtaskId);
    await refreshTasks();
  };

  const handleMarkDone = async () => {
    await window.pond.completeTask(task.id);
    goHome();
  };

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  return html`
    <div class="detail">
      <button class="back-button" onClick=${goHome}>←</button>

      <h1 class="detail-title">${task.title}</h1>

      ${task.note ? html`<p class="detail-note">${task.note}</p>` : null}

      ${hasSubtasks ? html`
        <div class="divider" style=${{ margin: '12px 14px' }} />
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
      ` : null}

      <button class="mark-done-btn" onClick=${handleMarkDone}>
        Mark as done
      </button>
    </div>
  `;
}

// ==========================================
// App Root
// ==========================================
function App() {
  const [screen, setScreen] = useState('home');
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const refreshTasks = useCallback(async () => {
    try {
      const data = await window.pond.getTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, []);

  useEffect(() => { refreshTasks(); }, []);

  // Refresh tasks when popover is shown
  useEffect(() => {
    if (window.pond && window.pond.onShow) {
      const cleanup = window.pond.onShow(() => {
        refreshTasks();
        setScreen('home');
        setSelectedTaskId(null);
      });
      return cleanup;
    }
  }, [refreshTasks]);

  const goHome = useCallback(() => {
    refreshTasks();
    setScreen('home');
    setSelectedTaskId(null);
  }, [refreshTasks]);

  const goToAdd = useCallback(() => { setScreen('add'); }, []);

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
    return html`<${AddTask} goHome=${goHome} />`;
  }

  if (screen === 'detail') {
    const task = tasks.find(t => t.id === selectedTaskId) || null;
    return html`<${TaskDetail} task=${task} goHome=${goHome} refreshTasks=${refreshTasks} />`;
  }

  // Default: home
  return html`
    <${Home}
      tasks=${tasks}
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
