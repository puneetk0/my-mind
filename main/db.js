const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const initSqlJs = require('sql.js/dist/sql-asm.js');

let db;
let dbPath;

async function init() {
  dbPath = path.join(app.getPath('userData'), 'pond.db');
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    try {
      const buf = fs.readFileSync(dbPath);
      db = new SQL.Database(buf);
    } catch (err) {
      console.error('DB load failed, creating fresh:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, note TEXT,
    completed INTEGER DEFAULT 0, position INTEGER, created_at INTEGER
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS subtasks (
    id TEXT PRIMARY KEY, task_id TEXT NOT NULL, title TEXT NOT NULL,
    completed INTEGER DEFAULT 0, position INTEGER
  )`);

  save();
  console.log('Pond DB ready at', dbPath);
}

function save() {
  if (!db || !dbPath) return;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function getAllTasks() {
  const rows = db.exec(
    `SELECT id, title, note, completed, position, created_at FROM tasks WHERE completed = 0 ORDER BY position ASC, created_at ASC`
  );
  if (!rows.length) return [];

  return rows[0].values.map(([id, title, note, completed, position, created_at]) => {
    const sub = db.exec(`SELECT id, task_id, title, completed, position FROM subtasks WHERE task_id = ? ORDER BY position ASC`, [id]);
    const subtasks = sub.length ? sub[0].values.map(([sid, stid, stitle, scomp, spos]) => ({
      id: sid, task_id: stid, title: stitle, completed: Boolean(scomp), position: spos,
    })) : [];
    return { id, title, note, completed: Boolean(completed), position, created_at, subtasks };
  });
}

function addTask({ title, note, subtasks }) {
  const { v4: uuidv4 } = require('uuid');
  const taskId = uuidv4();
  const now = Date.now();
  const maxR = db.exec('SELECT MAX(position) FROM tasks');
  const pos = (maxR.length && maxR[0].values[0][0] !== null ? maxR[0].values[0][0] : -1) + 1;

  db.run(`INSERT INTO tasks (id,title,note,completed,position,created_at) VALUES (?,?,?,0,?,?)`,
    [taskId, title, note || null, pos, now]);

  if (subtasks && subtasks.length) {
    subtasks.forEach((st, i) => {
      if (st.trim()) db.run(`INSERT INTO subtasks (id,task_id,title,completed,position) VALUES (?,?,?,0,?)`,
        [uuidv4(), taskId, st.trim(), i]);
    });
  }
  save();
  return { ok: true };
}

function completeTask(id) {
  db.run('UPDATE tasks SET completed = 1 WHERE id = ?', [id]);
  save();
  return { ok: true };
}

function deleteTask(id) {
  db.run('DELETE FROM subtasks WHERE task_id = ?', [id]);
  db.run('DELETE FROM tasks WHERE id = ?', [id]);
  save();
  return { ok: true };
}

function toggleSubtask(id) {
  db.run('UPDATE subtasks SET completed = CASE WHEN completed=0 THEN 1 ELSE 0 END WHERE id = ?', [id]);
  save();
  const r = db.exec('SELECT completed FROM subtasks WHERE id = ?', [id]);
  return { completed: r.length ? Boolean(r[0].values[0][0]) : false };
}

function close() { if (db) { save(); db.close(); } }

module.exports = { init, getAllTasks, addTask, completeTask, deleteTask, toggleSubtask, close };
