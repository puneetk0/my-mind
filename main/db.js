const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { randomUUID } = require('crypto');
const initSqlJs = require('sql.js/dist/sql-asm.js');

let db;
let dbPath;

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
async function init() {
  dbPath = path.join(app.getPath('userData'), 'pond.db');
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    try {
      db = new SQL.Database(fs.readFileSync(dbPath));
    } catch (err) {
      console.error('DB load failed, creating fresh:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  _applySchema();
  save();
  console.log('Pond DB ready at', dbPath);
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
function _applySchema() {
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    note          TEXT,
    completed     INTEGER NOT NULL DEFAULT 0,
    position      INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL,
    constructor_id INTEGER,
    lane          INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS subtasks (
    id        TEXT PRIMARY KEY,
    task_id   TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title     TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    position  INTEGER NOT NULL DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS constructors (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,
    primary_color   TEXT NOT NULL,
    secondary_color TEXT NOT NULL,
    car_file        TEXT NOT NULL
  )`);

  // Migrate: add columns if they don't exist yet (safe on fresh DBs too)
  try { db.run(`ALTER TABLE tasks ADD COLUMN constructor_id INTEGER`); } catch (_) {}
  try { db.run(`ALTER TABLE tasks ADD COLUMN lane INTEGER`); } catch (_) {}

  // Seed constructors once
  const count = db.exec('SELECT COUNT(*) FROM constructors')[0].values[0][0];
  if (count === 0) {
    db.run(`INSERT INTO constructors VALUES
      (1,  'Red Bull Racing', '#3671C6', '#FF1E00', 'car1.png'),
      (2,  'Ferrari',         '#E8002D', '#FFCC00', 'car2.png'),
      (3,  'McLaren',         '#FF8000', '#000000', 'car3.png'),
      (4,  'Mercedes',        '#00D2BE', '#000000', 'car4.png'),
      (5,  'Aston Martin',    '#006F62', '#CEDC00', 'car5.png'),
      (6,  'Alpine',          '#FF87BC', '#0090FF', 'car6.png'),
      (7,  'Williams',        '#005AFF', '#FFFFFF', 'car7.png'),
      (8,  'Haas',            '#B6BABD', '#E8002D', 'car8.png'),
      (9,  'Visa RB',         '#6692FF', '#C8001E', 'car9.png'),
      (10, 'Kick Sauber',     '#52E252', '#000000', 'car10.png')`);
  }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
function save() {
  if (!db || !dbPath) return;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function _row(sql, params = []) {
  const r = db.exec(sql, params);
  return r.length ? r[0].values[0] : null;
}

function _rows(sql, params = []) {
  const r = db.exec(sql, params);
  return r.length ? r[0].values : [];
}

function _transaction(fn) {
  try {
    db.run('BEGIN');
    const result = fn();
    db.run('COMMIT');
    save();
    return result;
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
function getAllTasks() {
  const taskRows = _rows(
    `SELECT t.id, t.title, t.note, t.completed, t.position, t.created_at,
            t.constructor_id, t.lane,
            c.name, c.primary_color, c.secondary_color, c.car_file
     FROM tasks t
     LEFT JOIN constructors c ON t.constructor_id = c.id
     WHERE t.completed = 0
     ORDER BY t.position ASC, t.created_at ASC`
  );

  return taskRows.map(([id, title, note, completed, position, created_at,
                         constructor_id, lane, c_name, c_pri, c_sec, c_car]) => {
    const subRows = _rows(
      `SELECT id, task_id, title, completed, position
       FROM subtasks WHERE task_id = ? ORDER BY position ASC`,
      [id]
    );
    const subtasks = subRows.map(([sid, stid, stitle, scomp, spos]) => ({
      id: sid, task_id: stid, title: stitle, completed: Boolean(scomp), position: spos
    }));
    return {
      id, title, note, completed: Boolean(completed), position, created_at,
      constructor_id, lane,
      constructor_name: c_name, primary_color: c_pri, secondary_color: c_sec, car_file: c_car,
      subtasks
    };
  });
}

function getAvailableConstructors() {
  const occupiedRows = _rows(
    'SELECT constructor_id FROM tasks WHERE completed = 0 AND constructor_id IS NOT NULL'
  );
  const occupied = new Set(occupiedRows.map(r => r[0]));

  return _rows('SELECT * FROM constructors ORDER BY id').map(
    ([id, name, primary_color, secondary_color, car_file]) => ({
      id, name, primary_color, secondary_color, car_file,
      available: !occupied.has(id)
    })
  );
}

function addTask({ title, note, subtasks, constructor_id }) {
  if (!title || !title.trim()) throw new Error('Task title is required');
  if (!constructor_id) throw new Error('constructor_id is required');

  return _transaction(() => {
    const taskId = randomUUID();
    const now = Date.now();
    const maxPos = _row('SELECT MAX(position) FROM tasks WHERE completed = 0');
    const pos = (maxPos && maxPos[0] !== null ? maxPos[0] : -1) + 1;

    db.run(
      `INSERT INTO tasks (id, title, note, completed, position, created_at, constructor_id, lane)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
      [taskId, title.trim(), note ? note.trim() || null : null, pos, now, constructor_id, constructor_id]
    );

    if (subtasks && subtasks.length) {
      subtasks.forEach((st, i) => {
        const t = typeof st === 'string' ? st.trim() : (st.title || '').trim();
        if (t) {
          db.run(
            `INSERT INTO subtasks (id, task_id, title, completed, position) VALUES (?, ?, ?, 0, ?)`,
            [randomUUID(), taskId, t, i]
          );
        }
      });
    }

    return { ok: true };
  });
}

function updateTask({ id, title, note, subtasks, constructor_id }) {
  if (!id) throw new Error('Task id is required');
  if (!title || !title.trim()) throw new Error('Task title is required');

  return _transaction(() => {
    db.run(
      'UPDATE tasks SET title = ?, note = ?, constructor_id = ?, lane = ? WHERE id = ?',
      [title.trim(), note ? note.trim() || null : null, constructor_id || null, constructor_id || null, id]
    );

    db.run('DELETE FROM subtasks WHERE task_id = ?', [id]);

    if (subtasks && subtasks.length) {
      subtasks.forEach((st, i) => {
        const t = (typeof st === 'string' ? st : st.title || '').trim();
        if (t) {
          const stId = (st && st.id) ? st.id : randomUUID();
          db.run(
            'INSERT INTO subtasks (id, task_id, title, completed, position) VALUES (?, ?, ?, ?, ?)',
            [stId, id, t, st.completed ? 1 : 0, i]
          );
        }
      });
    }

    return { ok: true };
  });
}

function completeTask(id) {
  if (!id) throw new Error('Task id is required');
  return _transaction(() => {
    db.run('UPDATE tasks SET completed = 1 WHERE id = ?', [id]);
    db.run('DELETE FROM subtasks WHERE task_id = ?', [id]);
    return { ok: true };
  });
}

function deleteTask(id) {
  if (!id) throw new Error('Task id is required');
  return _transaction(() => {
    db.run('DELETE FROM subtasks WHERE task_id = ?', [id]);
    db.run('DELETE FROM tasks WHERE id = ?', [id]);
    return { ok: true };
  });
}

function toggleSubtask(id) {
  if (!id) throw new Error('Subtask id is required');
  db.run(
    'UPDATE subtasks SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END WHERE id = ?',
    [id]
  );
  save();
  const row = _row('SELECT completed FROM subtasks WHERE id = ?', [id]);
  return { completed: row ? Boolean(row[0]) : false };
}

function reorderSubtasks(taskId, newIds) {
  if (!taskId || !Array.isArray(newIds)) throw new Error('Invalid reorder args');
  return _transaction(() => {
    newIds.forEach((id, index) => {
      db.run(
        'UPDATE subtasks SET position = ? WHERE id = ? AND task_id = ?',
        [index, id, taskId]
      );
    });
    return { ok: true };
  });
}

function swapLanes(laneA, laneB) {
  if (laneA === laneB) return { ok: true };
  return _transaction(() => {
    const rowA = _row('SELECT id FROM tasks WHERE lane = ? AND completed = 0', [laneA]);
    const rowB = _row('SELECT id FROM tasks WHERE lane = ? AND completed = 0', [laneB]);
    const idA = rowA ? rowA[0] : null;
    const idB = rowB ? rowB[0] : null;

    if (idA) db.run('UPDATE tasks SET constructor_id = ?, lane = ? WHERE id = ?', [laneB, laneB, idA]);
    if (idB) db.run('UPDATE tasks SET constructor_id = ?, lane = ? WHERE id = ?', [laneA, laneA, idB]);

    return { ok: true };
  });
}

function close() {
  if (db) { save(); db.close(); }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  init, save, close,
  getAllTasks, getAvailableConstructors,
  addTask, updateTask, completeTask, deleteTask,
  toggleSubtask, reorderSubtasks, swapLanes
};
