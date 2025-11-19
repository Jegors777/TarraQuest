// db.js
import sqlite3 from 'sqlite3';

sqlite3.verbose();

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('❌ Kļūda pieslēdzoties datubāzei:', err);
  } else {
    console.log('✅ Pieslēgts SQLite datubāzei');
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

  db.run(`
    CREATE TABLE IF NOT EXISTS checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      shop TEXT,
      total REAL,
      points INTEGER,
      hash TEXT,
      date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);
});

export default db;
