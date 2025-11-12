const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к базе данных:', err);
  } else {
    console.log('✅ Подключено к базе данных SQLite');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      googleId TEXT UNIQUE,
      email TEXT,
      name TEXT
    )
  `);
});

//Čekiem
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      shop TEXT,
      total REAL,
      points INTEGER,
      date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);
});

module.exports = db;