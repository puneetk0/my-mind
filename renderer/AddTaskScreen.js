import React, { useState, useEffect, useCallback, useRef } from 'react';
import htm from 'htm';
const html = htm.bind(React.createElement);

// ==========================================
// Add Task Screen — Race Garage Mode
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

  const handleDragEnter = (e, i) => { e.preventDefault(); setDragOverItemIndex(i); };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

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

  const handleDragEnd = () => { setDragItemIndex(null); setDragOverItemIndex(null); };

  useEffect(() => { titleRef.current && titleRef.current.focus(); }, []);

  useEffect(() => {
    const handleSaveLaunch = () => { handleSubmit(); };
    document.addEventListener('pond:save-launch', handleSaveLaunch);
    return () => document.removeEventListener('pond:save-launch', handleSaveLaunch);
  }, [title, note, subtasks, constructorId, editTask]);

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

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) { setError('MISSION NAME REQUIRED'); return; }
    if (!constructorId) { setError('SELECT A CONSTRUCTOR'); return; }
    setError('');
    
    const taskData = {
      title: title.trim(),
      note: note.trim() || null,
      subtasks: subtasks.map(s => typeof s === 'string' ? s : s.title).filter(t => t && t.trim()),
      constructor_id: constructorId
    };

    if (editTask) {
      await window.pond.updateTask({ ...taskData, id: editTask.id });
    } else {
      await window.pond.addTask(taskData);
    }
    goHome();
  }, [title, note, subtasks, constructorId, editTask, goHome]);

  const formatNoteHTML = (text) => {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return html`<a key=${i} class="smart-note-link" href="#" onClick=${(e) => {
          e.preventDefault(); e.stopPropagation(); window.pond.openExternal(part);
        }}>${part}</a>`;
      }
      return html`<span key=${i}>${part}</span>`;
    });
  };

  const selectedConstr = constructors && constructors.length > 0 ? constructors[carouselIndex] : null;
  const activeConstr = constructors.find(c => c.id === constructorId);

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
            ${activeConstr ? html`
              <div class="team-badge" style=${{ 
                borderColor: activeConstr.primary_color + '88', 
                background: activeConstr.primary_color + '22' 
              }}>
                <span class="badge-team" style=${{ color: activeConstr.primary_color }}>
                  ${activeConstr.name.toUpperCase()}
                </span>
              </div>
            ` : html`<div class="section-eyebrow" style=${{ marginBottom: 0 }}>Garage Entry</div>`}
          </div>
          <div style=${{ justifySelf: 'end' }}>
            <div class="start-lights-row">
              ${[1, 2, 3, 4, 5].map(i => html`
                <div key=${i} class=${'start-light' + (title.length / 5 >= i ? ' on' : '')}></div>
              `)}
            </div>
          </div>
        </div>

        <div class="add-task-garage">

          <!-- Left Panel: Mission Brief -->
          <div class="garage-left-panel">
            <div class="panel-eyebrow">Race Engineer — Mission Brief</div>

            <div class="title-section">
              <input
                ref=${titleRef}
                class="task-title-input"
                type="text"
                placeholder="MISSION NAME..."
                value=${title}
                onInput=${(e) => setTitle(e.target.value)}
                onKeyDown=${(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            <div class="note-wrapper smart-note-container" 
                 onClick=${() => { if (!noteFocused) { setNoteFocused(true); setTimeout(() => noteRef.current && noteRef.current.focus(), 50); } }}>
              ${noteFocused ? html`
                <textarea
                  ref=${noteRef}
                  class="task-note-input editing"
                  placeholder="TELEMETRY NOTES (Optional, links will be active)"
                  value=${note}
                  onInput=${(e) => setNote(e.target.value)}
                  onBlur=${() => setNoteFocused(false)}
                />
              ` : html`
                <div class=${'task-note-view ' + (!note ? 'empty-note' : '')}>
                  ${note ? formatNoteHTML(note) : 'TELEMETRY NOTES (Links will be parsed automatically...)'}
                </div>
              `}
            </div>

            <div class="panel-eyebrow" style=${{ marginTop: '10px' }}>Vehicle Selection</div>
            
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
            
            <div style=${{ display: 'flex', flexDirection: 'column' }}>
              ${error ? html`<div class="garage-error-pill">${error}</div>` : null}
              ${selectedConstr ? html`
                <button
                  class=${'btn-choose-car ' + (selectedConstr.available || (editTask && editTask.constructor_id === selectedConstr.id) ? '' : 'btn-car-disabled')}
                  style=${{ 
                    background: constructorId === selectedConstr.id ? selectedConstr.primary_color : 'rgba(255,255,255,0.05)',
                    color: constructorId === selectedConstr.id ? '#000' : (selectedConstr.available || (editTask && editTask.constructor_id === selectedConstr.id) ? selectedConstr.primary_color : '#555'),
                    border: '2px solid ' + ((selectedConstr.available || (editTask && editTask.constructor_id === selectedConstr.id)) ? selectedConstr.primary_color : 'rgba(255,255,255,0.1)'),
                    boxShadow: constructorId === selectedConstr.id ? '0 0 20px ' + selectedConstr.primary_color + '44' : 'none'
                  }}
                  onClick=${() => {
                    if (selectedConstr.available || (editTask && editTask.constructor_id === selectedConstr.id)) {
                      setConstructorId(selectedConstr.id);
                      setError('');
                    }
                  }}
                >
                  ${constructorId === selectedConstr.id ? '✓ ENGINE READY: ' + selectedConstr.name : 
                    (!selectedConstr.available && !(editTask && editTask.constructor_id === selectedConstr.id) ? 'VEHICLE DEPLOYED' : 'ASSIGN ' + selectedConstr.name)}
                </button>
              ` : null}
            </div>
          </div>

          <!-- Right Panel: Objectives -->
          <div class="garage-right-panel">
            <div class="panel-eyebrow">Tactical Objectives</div>
            
            <div class="objectives-section">
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
                    <span class="obj-bullet">≡</span>
                    <input
                      ref=${(el) => { subtaskRefs.current[i] = el; }}
                      class="objective-input"
                      type="text"
                      placeholder=${'OBJECTIVE ' + (i + 1)}
                      value=${typeof st === 'string' ? st : st.title}
                      onInput=${(e) => updateSubtask(i, e.target.value)}
                      onKeyDown=${(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? addSubtask() : handleSubmit(); }
                        if (e.key === 'Backspace' && (typeof st === 'string' ? st : st.title) === '') {
                          e.preventDefault(); removeSubtask(i);
                          if (i > 0) setTimeout(() => subtaskRefs.current[i - 1]?.focus(), 50);
                        }
                      }}
                    />
                    <button class="obj-remove" onClick=${() => removeSubtask(i)}>×</button>
                  </div>
                `)}
                <button class="add-objective-btn" onClick=${addSubtask}>+ ADD NEW OBJECTIVE</button>
              </div>
            </div>
            
            <div class="launch-row" style=${{ marginTop: 'auto' }}>
              <button class="btn-abort" onClick=${goHome}>ABORT</button>
              <button
                class="btn-launch"
                style=${{ 
                  background: constructorId ? ((constructors || []).find(c => c.id === constructorId)?.primary_color || '#fff') : '#ffffff',
                  boxShadow: constructorId ? '0 0 25px ' + ((constructors || []).find(c => c.id === constructorId)?.primary_color || '#fff') + '66' : 'none'
                }}
                onClick=${handleSubmit}
              >
                ${editTask ? 'UPDATE SPECS' : 'LAUNCH MISSION ▶'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

export default AddTask;
