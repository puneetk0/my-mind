import React, { useState, useEffect, useCallback, useRef } from 'react';
import htm from 'htm';
const html = htm.bind(React.createElement);

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
  
  const [noteFocused, setNoteFocused] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(() => {
    if (constructors && constructors.length > 0) {
      if (editTask && editTask.constructor_id) {
        const idx = constructors.findIndex(c => c.id === editTask.constructor_id);
        return idx >= 0 ? idx : 0;
      }
      if (preSelectedConstructorId) {
        const idx = constructors.findIndex(c => c.id === preSelectedConstructorId);
        return idx >= 0 ? idx : 0;
      }
    }
    return 0;
  });

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

  // --- Smart Note Formatter ---
  const formatNoteHTML = (text) => {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return html`<a key=${i} class="smart-note-link" href="#" onClick=${(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (window.pond && window.pond.openExternal) {
            window.pond.openExternal(part);
          }
        }}>${part}</a>`;
      }
      return html`<span key=${i}>${part}</span>`;
    });
  };

  const selectedConstr = constructors && constructors.length > 0 ? constructors[carouselIndex] : null;

  // --- Objectives sub-template ---
  const objectivesContent = html`
    <div class="objectives-section">
      <div class="section-eyebrow">Objectives</div>
      <div class="subtask-scroll">
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
            ${constructorId ? html`
              <div class="team-badge" style=${{ 
                borderColor: ((constructors || []).find(c => c.id === constructorId)?.primary_color || '#fff') + '88', 
                background: ((constructors || []).find(c => c.id === constructorId)?.primary_color || '#fff') + '33' 
              }}>
                <span class="badge-team" style=${{ color: ((constructors || []).find(c => c.id === constructorId)?.primary_color || '#fff') }}>
                  ${((constructors || []).find(c => c.id === constructorId)?.name || '').toUpperCase()}
                </span>
              </div>
            ` : null}
          </div>
          <div style=${{ justifySelf: 'end', display: 'flex' }}></div>
        </div>

        <div class="add-task-garage">

          <!-- Left: Information & Constructor Picker -->
          <div class="garage-left-panel" style=${{ flex: 1.4, paddingRight: '20px' }}>
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

            <!-- Smart Notes -->
            <div class="note-wrapper smart-note-container" 
                 onClick=${() => { if (!noteFocused) { setNoteFocused(true); setTimeout(() => noteRef.current && noteRef.current.focus(), 50); } }}>
              ${noteFocused ? html`
                <textarea
                  ref=${noteRef}
                  class="task-note-input editing"
                  placeholder="Telemetry notes (optional, links will be clickable)"
                  value=${note}
                  onInput=${(e) => setNote(e.target.value)}
                  onBlur=${() => setNoteFocused(false)}
                />
              ` : html`
                <div class=${'task-note-view ' + (!note ? 'empty-note' : '')}>
                  ${note ? formatNoteHTML(note) : 'Telemetry notes (optional, links will be clickable)'}
                </div>
              `}
            </div>

            <!-- Car Carousel Picker -->
            <div class="car-carousel-container">
              <button class="carousel-arrow-btn" onClick=${() => setCarouselIndex(prev => prev > 0 ? prev - 1 : constructors.length - 1)}>
                ‹
              </button>
              
              <div class="carousel-display">
                ${selectedConstr ? html`
                  <img src=${'../../assets/cars/car' + selectedConstr.id + '.png'} class="carousel-img" />
                ` : null}
              </div>

              <button class="carousel-arrow-btn" onClick=${() => setCarouselIndex(prev => prev < constructors.length - 1 ? prev + 1 : 0)}>
                ›
              </button>
            </div>
            
            <div class="carousel-selection-row">
              ${error ? html`<div class="garage-error-pill" style=${{ marginTop: '0', marginBottom: '8px' }}>${error}</div>` : null}
              ${selectedConstr ? html`
                <button
                  class=${'btn-choose-car ' + (selectedConstr.available || (editTask && editTask.constructor_id === selectedConstr.id) ? '' : 'btn-car-disabled')}
                  style=${{ 
                    background: constructorId === selectedConstr.id ? selectedConstr.primary_color + '22' : 'rgba(255,255,255,0.03)',
                    color: constructorId === selectedConstr.id ? '#fff' : (selectedConstr.available || (editTask && editTask.constructor_id === selectedConstr.id) ? selectedConstr.primary_color : '#888'),
                    border: '1px solid ' + ((selectedConstr.available || (editTask && editTask.constructor_id === selectedConstr.id)) ? selectedConstr.primary_color + '55' : 'rgba(255,255,255,0.1)'),
                    boxShadow: constructorId === selectedConstr.id ? '0 0 10px ' + selectedConstr.primary_color + '33' : 'none'
                  }}
                  onClick=${() => {
                    if (selectedConstr.available || (editTask && editTask.constructor_id === selectedConstr.id)) {
                      setConstructorId(selectedConstr.id);
                      setError('');
                    }
                  }}
                >
                  ${constructorId === selectedConstr.id ? '✓ Selected: ' + selectedConstr.name : 
                    (!selectedConstr.available && !(editTask && editTask.constructor_id === selectedConstr.id) ? 'Garage Occupied' : 'Select ' + selectedConstr.name)}
                </button>
              ` : null}
            </div>
          </div>

          <!-- Right: Objectives & Controls -->
          <div class="garage-right-panel">
            <div class="panel-top-bar" style=${{ background: 'rgba(255,255,255,0.1)' }}></div>
            
            ${objectivesContent}
            
            <!-- Launch Controls -->
            <div class="launch-row" style=${{ marginTop: 'auto' }}>
              <button class="btn-abort" onClick=${goHome}>Abort</button>
              <button
                class="btn-launch"
                style=${{ background: constructorId ? ((constructors || []).find(c => c.id === constructorId)?.primary_color || '#fff') : '#ffffff' }}
                onClick=${handleSubmit}
              >
                ${editTask ? 'Save Pit Stop ▶' : 'Launch ▶'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

export default AddTask;
