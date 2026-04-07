import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import htm from 'htm';
import './styles.css';
import Home from './HomeScreen';
import AddTask from './AddTaskScreen';
import TaskDetail from './TaskDetailScreen';
import { CelebrationOverlay, ShortcutsModal } from './Overlays';
import confetti from 'canvas-confetti';

window.confetti = confetti;
const html = htm.bind(React.createElement);


// App Root
// ==========================================
function App() {
  const [screen, setScreen] = useState('home');
  const [tasks, setTasks] = useState([]);
  const [constructors, setConstructors] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [intendedConstructorId, setIntendedConstructorId] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [finishing, setFinishing] = useState(null);
  const [celebratedTask, setCelebratedTask] = useState(null);

  // --- Data fetching ---
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

  // --- Lane swap ---
  const handleSwapLanes = useCallback(async (laneA, laneB) => {
    if (laneA === laneB) return;
    await window.pond.swapLanes(laneA, laneB);
    await refreshData();
  }, [refreshData]);

  // --- Initial load + popover show ---
  useEffect(() => { refreshData(); }, [refreshData]);

  useEffect(() => {
    if (window.pond && window.pond.onShow) {
      const cleanup = window.pond.onShow(() => {
        setScreen('home');
        setSelectedTaskId(null);
      });
      return cleanup;
    }
  }, []);

  // --- Navigation ---
  const goHome = useCallback(() => {
    setScreen('home');
    setTaskToEdit(null);
    refreshData();
  }, [refreshData]);

  const goToAdd = useCallback((constructorId, taskObj = null) => {
    setIntendedConstructorId(constructorId || null);
    setTaskToEdit(taskObj);
    setScreen('add');
  }, []);

  const goToDetail = useCallback((id) => {
    setSelectedTaskId(id);
    setScreen('detail');
  }, []);

  // --- Task completion: finish line animation ---
  const handleCompleteTask = useCallback(async (task) => {
    // Optimistically remove from task list so car doesn't linger
    setTasks(prev => prev.filter(t => t.id !== task.id));

    // Start finish animation on the track
    setFinishing({ task, lane: task.lane, offscreen: false });
    setScreen('home');
    setSelectedTaskId(null);

    // Drive car offscreen after a brief moment
    setTimeout(() => {
      setFinishing(prev => (prev ? { ...prev, offscreen: true } : prev));
    }, 80);

    // Persist to DB and clean up after animation completes
    try {
      await window.pond.completeTask(task.id);
    } catch (err) {
      console.error('completeTask failed:', err);
    }

    setTimeout(() => {
      setFinishing(null);
      refreshData();
    }, 650);
  }, [refreshData]);

  // --- Celebration: confetti + overlay (fires BEFORE completion) ---
  const handleCelebrateTask = useCallback((task) => {
    setCelebratedTask(task);
    if (typeof window.confetti === 'function') {
      const laneConstr = constructors.find(c => c.id === task.constructor_id) || {};
      const accentColor = laneConstr.primary_color || '#ffffff';
      window.confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: [accentColor, laneConstr.secondary_color || '#ffffff', '#ffffff'],
        zIndex: 2000
      });
    }
  }, [constructors]);

  // --- Cmd+S / Cmd+Enter dispatch ---
  const handleSaveOrLaunch = useCallback(() => {
    if (screen === 'add') {
      const event = new CustomEvent('pond:save-launch');
      document.dispatchEvent(event);
    }
  }, [screen]);

  // --- Global keyboard shortcuts ---
useEffect(() => {
  const handler = (e) => {
    const isMeta = e.metaKey || e.ctrlKey;

    if (isMeta && e.key === ',') {
      e.preventDefault();
      setShowShortcuts(prev => !prev);
      return;
    }

    if (isMeta && e.key === 'n') {
      e.preventDefault();
      if (screen === 'home' && !celebratedTask) {
        const occupiedLanes = tasks.map(t => t.lane);
        const freeLane = [1,2,3,4,5,6,7,8,9,10].find(l => !occupiedLanes.includes(l)) || null;
        goToAdd(freeLane);
      }
      return;
    }

    if (isMeta && e.key === 's') {
      e.preventDefault();
      if (screen === 'add') {
        document.dispatchEvent(new CustomEvent('pond:save-launch'));
      }
      return;
    }

    if (e.key === 'Escape') {
      if (showShortcuts) { setShowShortcuts(false); return; }
      if (celebratedTask) { goHome(); return; }
      if (screen !== 'home') { setScreen('home'); return; }
      if (window.pond && window.pond.escape) { window.pond.escape(); }
    }
  };

  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [screen, tasks, celebratedTask, showShortcuts, goToAdd, goHome]);
  // --- Render ---
  return html`
    <div class="pond-root">
      <div class="track-container">
        <${Home}
          tasks=${tasks}
          constructors=${constructors}
          onAddClick=${goToAdd}
          onTaskClick=${goToDetail}
          onShortcutsClick=${() => setShowShortcuts(true)}
          finishing=${finishing}
          onSwapLanes=${handleSwapLanes}
        />
        ${screen === 'add' ? html`
          <${AddTask}
            goHome=${goHome}
            constructors=${constructors}
            preSelectedConstructorId=${intendedConstructorId}
            editTask=${taskToEdit}
          />
        ` : null}
        ${screen === 'detail' ? html`
          <${TaskDetail}
            task=${tasks.find(t => t.id === selectedTaskId) || null}
            tasks=${tasks} 
            goHome=${goHome}
            goToAdd=${goToAdd}
            refreshTasks=${refreshData}
            constructors=${constructors}
            onCompleteTask=${handleCelebrateTask}
          />
        ` : null}
        ${celebratedTask ? html`
          <${CelebrationOverlay}
            task=${celebratedTask}
            onClose=${() => { 
              const t = celebratedTask;
              setCelebratedTask(null); 
              handleCompleteTask(t);
            }}
            onAdd=${() => { 
              const t = celebratedTask;
              setCelebratedTask(null); 
              handleCompleteTask(t);
              setTimeout(() => goToAdd(null), 700);
            }}
          />
        ` : null}
        ${showShortcuts ? html`
          <${ShortcutsModal} onClose=${() => setShowShortcuts(false)} />
        ` : null}
      </div>
    </div>
  `;
}

// --- Mount ---
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);