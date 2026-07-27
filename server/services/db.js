/**
 * 数据库服务 — 纯 JS SQLite（sql.js，无需编译）
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'pangu.db');

let SQL = null;
let _db = null;

async function createDB() {
  if (_db) return _db;

  SQL = await initSqlJs();

  // 确保数据目录存在
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // 如果数据库文件存在，加载它
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buffer);
  } else {
    _db = new SQL.Database();
  }

  // 建表
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT '',
      password TEXT NOT NULL,
      plan TEXT DEFAULT 'free',
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS contents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      result TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date)
    )
  `);

  _db.run('CREATE INDEX IF NOT EXISTS idx_contents_user ON contents(user_id, created_at DESC)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_logs(user_id, date)');

  logger.info('数据库已初始化', { path: DB_PATH, module: 'database' });
  return _db;
}

// 保存数据库到文件
function saveDB(operation) {
  if (!_db || !DB_PATH) return;
  const start = Date.now();
  const data = _db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  const duration = Date.now() - start;
  if (duration > 50) {
    logger.warn('DB写入较慢', { operation: operation || 'unknown', duration: `${duration}ms`, bytes: buffer.length, module: 'database' });
  }
}

// ==========================================
// 用户模型
// ==========================================
const UserModel = {
  init(db) { this.db = db; },

  create(phone, name, password) {
    const existing = this.db.exec('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing.length && existing[0].values.length) throw new Error('该手机号已注册');

    const id = uuidv4();
    this.db.run('INSERT INTO users (id, phone, name, password, plan) VALUES (?, ?, ?, ?, ?)', [id, phone, name || '', password, 'free']);
    saveDB();
    return { id, phone, name: name || '', plan: 'free' };
  },

  findById(id) {
    const res = this.db.exec('SELECT * FROM users WHERE id = ?', [id]);
    return res.length && res[0].values.length ? rowToObj(res[0]) : null;
  },

  findByPhone(phone) {
    const res = this.db.exec('SELECT * FROM users WHERE phone = ?', [phone]);
    return res.length && res[0].values.length ? rowToObj(res[0]) : null;
  },

  login(userId) {
    const token = uuidv4();
    this.db.run('UPDATE users SET last_login = datetime("now") WHERE id = ?', [userId]);
    this.db.run('INSERT INTO tokens (token, user_id) VALUES (?, ?)', [token, userId]);
    saveDB();
    return token;
  },

  findByToken(token) {
    const res = this.db.exec(`
      SELECT u.* FROM users u
      JOIN tokens t ON t.user_id = u.id
      WHERE t.token = ?
      ORDER BY t.created_at DESC LIMIT 1
    `, [token]);
    return res.length && res[0].values.length ? rowToObj(res[0]) : null;
  },

  count() {
    const res = this.db.exec('SELECT COUNT(*) as c FROM users');
    return res.length && res[0].values.length ? res[0].values[0][0] : 0;
  },

  // ===== 管理后台方法 =====

  listAll(page = 1, limit = 20, search = '') {
    const offset = (page - 1) * limit;
    let where = '';
    const params = [];
    if (search) {
      where = 'WHERE phone LIKE ? OR name LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    const rows = this.db.exec(
      `SELECT id, phone, name, plan, created_at, last_login FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const totalRes = this.db.exec(`SELECT COUNT(*) as c FROM users ${where}`, params);
    const total = totalRes.length && totalRes[0].values.length ? totalRes[0].values[0][0] : 0;
    const items = (rows.length && rows[0].values.length)
      ? rows[0].values.map(v => ({ id: v[0], phone: v[1], name: v[2], plan: v[3], createdAt: v[4], lastLogin: v[5] }))
      : [];
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  },

  updatePlan(userId, plan) {
    this.db.run('UPDATE users SET plan = ? WHERE id = ?', [plan, userId]);
    saveDB();
  },

  deleteUser(userId) {
    this.db.run('DELETE FROM tokens WHERE user_id = ?', [userId]);
    this.db.run('DELETE FROM usage_logs WHERE user_id = ?', [userId]);
    this.db.run('DELETE FROM contents WHERE user_id = ?', [userId]);
    this.db.run('DELETE FROM users WHERE id = ?', [userId]);
    saveDB();
  },
};

// ==========================================
// 内容模型
// ==========================================
const ContentModel = {
  init(db) { this.db = db; },

  save(userId, { type, industry, platform, scene, inputs, result, topic, month }) {
    const id = uuidv4();
    const data = JSON.stringify({ industry, platform, scene, inputs, topic, month });
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
    this.db.run('INSERT INTO contents (id, user_id, type, data, result) VALUES (?, ?, ?, ?, ?)', [id, userId, type, data, resultStr]);
    saveDB();
    return id;
  },

  list(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = this.db.exec('SELECT id, type, data, result, created_at FROM contents WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [userId, limit, offset]);
    const totalRes = this.db.exec('SELECT COUNT(*) as c FROM contents WHERE user_id = ?', [userId]);
    const total = totalRes.length && totalRes[0].values.length ? totalRes[0].values[0][0] : 0;

    const items = (rows.length && rows[0].values.length)
      ? rows[0].values.map(v => ({
          id: v[0], type: v[1], data: JSON.parse(v[2]), result: v[3], createdAt: v[4],
        }))
      : [];

    return { items, total, page, totalPages: Math.ceil(total / limit) };
  },

  search(userId, query) {
    const res = this.db.exec('SELECT id, type, data, result, created_at FROM contents WHERE user_id = ? AND (result LIKE ? OR data LIKE ?) ORDER BY created_at DESC LIMIT 50', [userId, `%${query}%`, `%${query}%`]);
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map(v => ({ id: v[0], type: v[1], data: JSON.parse(v[2]), result: v[3], createdAt: v[4] }));
  },

  count() {
    const res = this.db.exec('SELECT COUNT(*) as c FROM contents');
    return res.length && res[0].values.length ? res[0].values[0][0] : 0;
  },

  // ===== 管理后台方法 =====

  listAll(page = 1, limit = 20, search = '') {
    const offset = (page - 1) * limit;
    let where = '';
    const params = [];
    if (search) {
      where = 'WHERE result LIKE ?';
      params.push(`%${search}%`);
    }
    const rows = this.db.exec(
      `SELECT c.id, c.user_id, c.type, c.data, c.result, c.created_at, u.phone, u.name FROM contents c LEFT JOIN users u ON c.user_id = u.id ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const totalRes = this.db.exec(`SELECT COUNT(*) as c FROM contents ${where}`, params);
    const total = totalRes.length && totalRes[0].values.length ? totalRes[0].values[0][0] : 0;
    const items = (rows.length && rows[0].values.length)
      ? rows[0].values.map(v => ({ id: v[0], userId: v[1], type: v[2], data: safeJSON(v[3]), result: v[4], createdAt: v[5], userPhone: v[6], userName: v[7] }))
      : [];
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  },

  deleteById(id) {
    this.db.run('DELETE FROM contents WHERE id = ?', [id]);
    saveDB();
  },
};

// ==========================================
// 用量模型
// ==========================================
const UsageModel = {
  init(db) { this.db = db; },

  record(userId, count = 1) {
    const today = new Date().toISOString().slice(0, 10);
    const existing = this.db.exec('SELECT count FROM usage_logs WHERE user_id = ? AND date = ?', [userId, today]);
    if (existing.length && existing[0].values.length) {
      this.db.run('UPDATE usage_logs SET count = count + ? WHERE user_id = ? AND date = ?', [count, userId, today]);
    } else {
      this.db.run('INSERT INTO usage_logs (user_id, date, count) VALUES (?, ?, ?)', [userId, today, count]);
    }
    saveDB();
  },

  getToday(userId) {
    const today = new Date().toISOString().slice(0, 10);
    const res = this.db.exec('SELECT count FROM usage_logs WHERE user_id = ? AND date = ?', [userId, today]);
    return res.length && res[0].values.length ? res[0].values[0][0] : 0;
  },

  todayTotal() {
    const today = new Date().toISOString().slice(0, 10);
    const res = this.db.exec('SELECT SUM(count) as c FROM usage_logs WHERE date = ?', [today]);
    return res.length && res[0].values.length ? res[0].values[0][0] || 0 : 0;
  },

  // ===== 管理后台方法 =====

  dailyStats(days = 7) {
    const res = this.db.exec(
      `SELECT date, SUM(count) as total FROM usage_logs WHERE date >= date('now', ? || ' days') GROUP BY date ORDER BY date`,
      [`-${days}`]
    );
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map(v => ({ date: v[0], count: v[1] }));
  },

  userStats() {
    const today = new Date().toISOString().slice(0, 10);
    const res = this.db.exec(
      `SELECT COUNT(DISTINCT user_id) as c FROM usage_logs WHERE date = ?`,
      [today]
    );
    return res.length && res[0].values.length ? res[0].values[0][0] : 0;
  },
};

// 辅助：将 sql.js 查询结果转为对象
function rowToObj(result) {
  if (!result || !result.values.length) return null;
  const row = result.values[0];
  const obj = {};
  result.columns.forEach((col, i) => { obj[col] = row[i]; });
  return obj;
}

// 安全 JSON 解析
function safeJSON(str) {
  try { return JSON.parse(str); } catch { return str; }
}

module.exports = { createDB, UserModel, ContentModel, UsageModel };
