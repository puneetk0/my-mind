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

  try { db.run(`ALTER TABLE tasks ADD COLUMN constructor_id INTEGER`); } catch(e){}
  try { db.run(`ALTER TABLE tasks ADD COLUMN lane INTEGER`); } catch(e){}

  db.run(`CREATE TABLE IF NOT EXISTS constructors (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, primary_color TEXT NOT NULL,
    secondary_color TEXT NOT NULL, car_file TEXT NOT NULL
  )`);
  
  const cCount = db.exec('SELECT COUNT(*) FROM constructors');
  if (!cCount.length || cCount[0].values[0][0] === 0) {
    db.run(`INSERT INTO constructors VALUES
      (1,  'Red Bull Racing', '#3671C6', '#FF1E00', 'redbull.png'),
      (2,  'Ferrari',         '#E8002D', '#FFCC00', 'ferrari.png'),
      (3,  'McLaren',         '#FF8000', '#000000', 'mclaren.png'),
      (4,  'Mercedes',        '#00D2BE', '#000000', 'mercedes.png'),
      (5,  'Aston Martin',    '#006F62', '#CEDC00', 'astonmartin.png'),
      (6,  'Alpine',          '#FF87BC', '#0090FF', 'alpine.png'),
      (7,  'Williams',        '#005AFF', '#FFFFFF', 'williams.png'),
      (8,  'Haas',            '#B6BABD', '#E8002D', 'haas.png'),
      (9,  'Visa RB',         '#6692FF', '#C8001E', 'visarb.png'),
      (10, 'Kick Sauber',     '#52E252', '#000000', 'sauber.png')
    `);
  }

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
    `SELECT t.id, t.title, t.note, t.completed, t.position, t.created_at, t.constructor_id, t.lane,
            c.name as constructor_name, c.primary_color, c.secondary_color, c.car_file
     FROM tasks t
     LEFT JOIN constructors c ON t.constructor_id = c.id
     WHERE t.completed = 0 ORDER BY t.position ASC, t.created_at ASC`
  );
  if (!rows.length) return [];

  return rows[0].values.map(([id, title, note, completed, position, created_at, constructor_id, lane, c_name, c_pri, c_sec, c_car]) => {
    const sub = db.exec(`SELECT id, task_id, title, completed, position FROM subtasks WHERE task_id = ? ORDER BY position ASC`, [id]);
    const subtasks = sub.length ? sub[0].values.map(([sid, stid, stitle, scomp, spos]) => ({
      id: sid, task_id: stid, title: stitle, completed: Boolean(scomp), position: spos,
    })) : [];
    return { 
      id, title, note, completed: Boolean(completed), position, created_at, 
      constructor_id, lane, 
      constructor_name: c_name, primary_color: c_pri, secondary_color: c_sec, car_file: c_car,
      subtasks 
    };
  });
}

function getAvailableConstructors() {
  const occRaw = db.exec('SELECT constructor_id FROM tasks WHERE completed = 0 AND constructor_id IS NOT NULL');
  const occupiedLanes = occRaw.length ? occRaw[0].values.map(v => v[0]) : [];
  
  const allRaw = db.exec('SELECT * FROM constructors ORDER BY id');
  if (!allRaw.length) return [];
  
  return allRaw[0].values.map(([id, name, primary_color, secondary_color, car_file]) => ({
    id, name, primary_color, secondary_color, car_file,
    available: !occupiedLanes.includes(id)
  }));
}

function addTask({ title, note, subtasks, constructor_id }) {
  const { v4: uuidv4 } = require('uuid');
  const taskId = uuidv4();
  const now = Date.now();
  const maxR = db.exec('SELECT MAX(position) FROM tasks');
  const pos = (maxR.length && maxR[0].values[0][0] !== null ? maxR[0].values[0][0] : -1) + 1;

  db.run(`INSERT INTO tasks (id,title,note,completed,position,created_at,constructor_id,lane) VALUES (?,?,?,0,?,?,?,?)`,
    [taskId, title, note || null, pos, now, constructor_id || null, constructor_id || null]);

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

module.exports = { init, getAllTasks, addTask, completeTask, deleteTask, toggleSubtask, getAvailableConstructors, close };
