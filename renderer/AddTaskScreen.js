// ==========================================
// Add Task Screen
// ==========================================
function AddTask({ goHome, constructors, preSelectedConstructorId, editTask }) {
  const [title, setTitle] = useState(editTask ? editTask.title : '');
  const [note, setNote] = useState(editTask ? (editTask.note || '') : '');
  const [subtasks, setSubtasks] = useState(() => {
    if (editTask && editTask.subtasks) {
      return [...editTask.subtasks];
    }
    return [];
  });
  const [constructorId, setConstructorId] = useState(editTask ? editTask.constructor_id : (preSelectedConstructorId || null));
  const [error, setError] = useState('');
  const titleRef = useRef(null);
  const noteRef = useRef(null);
  const subtaskRefs = useRef([]);

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

  const handleDrop = (e, i) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragItemIndex !== null && dragItemIndex !== i) {
      setSubtasks(prev => {
        const copy = [...prev];
        const item = copy.splice(dragItemIndex, 1)[0];
        copy.splice(i, 0, item);
        return copy;
      });
    }
    setDragItemIndex(null);
    setDragOverItemIndex(null);
  };

  const handleDragEnd = () => {
    setDragItemIndex(null);
    setDragOverItemIndex(null);
  };

  // --- Focus ---
  useEffect(() => { titleRef.current && titleRef.current.focus(); }, []);

  // --- Cmd+S / Cmd+Enter save hook ---
  useEffect(() => {
    const handleSaveLaunch = () => { handleSubmit(); };
    document.addEventListener('pond:save-launch', handleSaveLaunch);
    return () => document.removeEventListener('pond:save-launch', handleSaveLaunch);
  }, [title, note, subtasks, constructorId, editTask]);

  // --- Subtask helpers ---
  const addSubtask = () => {
    setSubtasks(prev => [...prev, { title: '', completed: false }]);
    setTimeout(() => {
      const refs = subtaskRefs.current;
      if (refs[refs.length - 1]) refs[refs.length - 1].focus();
    }, 50);
  };

  const updateSubtask = (i, val) => {
    setSubtasks(prev => { 
      const n = [...prev]; 
      n[i] = typeof n[i] === 'string' ? { title: val, completed: false } : { ...n[i], title: val }; 
      return n; 
    });
  };

  const removeSubtask = (i) => {
    setSubtasks(prev => prev.filter((_, idx) => idx !== i));
  };

  // --- Keyboard handlers ---
  const handleTitleKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  };

  const handleSubtaskKey = (e, i) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) { addSubtask(); } else { handleSubmit(); }
    } else if (e.key === 'Backspace') {
      const titleStr = typeof subtasks[i] === 'string' ? subtasks[i] : subtasks[i].title;
      if (titleStr === '') {
        e.preventDefault();
        removeSubtask(i);
        if (i > 0) setTimeout(() => subtaskRefs.current[i - 1] && subtaskRefs.current[i - 1].focus(), 50);
        else noteRef.current && noteRef.current.focus();
      }
    }
  };

  // --- Submit ---
  const handleSubmit = useCallback(async () => {
    if (!title.trim()) { setError('Title required'); return; }
    if (!constructorId) { setError('Choose a constructor'); return; }
    setError('');
    
    if (editTask) {
      await window.pond.updateTask({
        id: editTask.id,
        title: title.trim(),
        note: note.trim() || null,
        subtasks: subtasks.filter(s => {
          const t = typeof s === 'string' ? s : s.title;
          return t && t.trim();
        }),
        constructor_id: constructorId
      });
    } else {
      await window.pond.addTask({
        title: title.trim(),
        note: note.trim() || null,
        subtasks: subtasks.map(s => typeof s === 'string' ? s : s.title).filter(t => t && t.trim()),
        constructor_id: constructorId
      });
    }
    goHome();
  }, [title, note, subtasks, constructorId, editTask, goHome]);

  const selectedConstr = (constructors || []).find(c => c.id === constructorId);

  // --- Objectives sub-template ---
  const objectivesContent = html`
    <div class="objectives-section">
      <div class="section-eyebrow">Objectives</div>
      <div class=${'subtask-scroll' + (editTask ? ' edit-spacing' : '')}>
        ${subtasks.map((st, i) => html`
          <div class="objective-row" key=${st.id || i}
               draggable="true"
               onDragStart=${(e) => handleDragStart(e, i)}
               onDragEnter=${(e) => handleDragEnter(e, i)}
               onDragOver=${handleDragOver}
               onDrop=${(e) => handleDrop(e, i)}
               onDragEnd=${handleDragEnd}
               style=${dragItemIndex === i ? { opacity: 0.3 } : (dragOverItemIndex === i && dragItemIndex !== i ? { borderTop: dragItemIndex > i ? '2px solid #fff' : '', borderBottom: dragItemIndex < i ? '2px solid #fff' : '' } : {})}
          >
            <span class="obj-bullet" style=${{ cursor: 'grab' }}>≡</span>
            <input
              ref=${(el) => { subtaskRefs.current[i] = el; }}
              class="objective-input"
              type="text"
              placeholder=${'Objective ' + (i + 1)}
              value=${typeof st === 'string' ? st : st.title}
              onInput=${(e) => updateSubtask(i, e.target.value)}
              onKeyDown=${(e) => handleSubtaskKey(e, i)}
            />
            <button class="obj-remove" onClick=${() => removeSubtask(i)}>×</button>
          </div>
        `)}
        <button class="add-objective-btn" onClick=${addSubtask}>+ Add Objective</button>
      </div>
    </div>
  `;

  // --- Render ---
  return html`
    <div class=${'overlay-modal' + (editTask ? ' no-anim' : '')}>
      <div class="detail-shell">
        <div class="detail-header">
          <div style=${{ justifySelf: 'start', display: 'flex' }}>
            <button class="back-btn" onClick=${goHome}>
              <span class="back-arrow-box">←</span>
              Pit Lane
            </button>
          </div>
          <div style=${{ justifySelf: 'center', display: 'flex' }}>
            ${selectedConstr ? html`
              <div class="team-badge" style=${{ borderColor: selectedConstr.primary_color + '88', background: selectedConstr.primary_color + '33' }}>
                <span class="badge-team" style=${{ color: selectedConstr.primary_color }}>${selectedConstr.name.toUpperCase()}</span>
              </div>
            ` : null}
          </div>
          <div style=${{ justifySelf: 'end', display: 'flex' }}></div>
        </div>

        <div class="add-task-garage">

        <!-- Left: Telemetry panel -->
        <div class="garage-left-panel">
          <div class="panel-eyebrow">Race Engineer — Task Brief</div>

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

          <div class="note-wrapper" style=${editTask ? { flex: 1, minHeight: 0, display: 'flex' } : {}}>
            <textarea
              ref=${noteRef}
              class="task-note-input"
              placeholder="Telemetry notes (optional)"
              value=${note}
              onInput=${(e) => setNote(e.target.value)}
              style=${editTask ? { flex: 1, height: '100%', resize: 'none' } : {}}
            />
            <span class="note-close-btn" onMouseDown=${(e) => { e.preventDefault(); noteRef.current.blur(); }}>DONE</span>
          </div>

          ${!editTask ? objectivesContent : null}
          
          ${editTask ? html`
            <div class="launch-row" style=${{ marginTop: 'auto' }}>
              <button class="btn-abort" onClick=${goHome}>Abort</button>
              <button
                class="btn-launch"
                style=${{ background: selectedConstr ? selectedConstr.primary_color : '#ffffff' }}
                onClick=${handleSubmit}
              >
                Save Pit Stop ▶
              </button>
            </div>
          ` : null}
        </div>

        ${editTask ? html`
          <div class="garage-right-panel" style=${{ padding: 0, border: 'none', background: 'transparent' }}>
            <div class="garage-left-panel" style=${{ flex: 1, margin: 0 }}>
              ${objectivesContent}
            </div>
          </div>
        ` : html`
        <!-- Right: Garage / Constructor picker -->
        <div class="garage-right-panel">
          <div class="panel-top-bar" style=${{ background: 'rgba(255,255,255,0.1)' }}></div>
          <div class="panel-eyebrow">Garage Bay — Constructor</div>

          ${error ? html`<div class="garage-error-pill" style=${{ marginTop: '10px' }}>${error}</div>` : null}

          <div class="constructor-grid">
            ${(constructors || []).map(c => html`
              <div
                key=${c.id}
                class=${'constructor-tile' + (!c.available ? ' tile-disabled' : '') + (constructorId === c.id ? ' tile-selected' : '')}
                style=${{
                  borderColor: constructorId === c.id ? c.primary_color : 'transparent',
                  boxShadow: constructorId === c.id ? ('0 0 0 1px ' + c.primary_color + ', inset 0 0 20px rgba(0,0,0,0.3)') : 'none',
                  cursor: 'pointer'
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
        `}

        </div>
      </div>
    </div>
  `;
}
