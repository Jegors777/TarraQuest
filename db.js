import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
});

// === Создание таблиц ===
async function initDB() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        googleId TEXT UNIQUE,
        email TEXT,
        name TEXT
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        shop TEXT,
        total REAL,
        points INTEGER,
        hash TEXT,
        date TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(userId) REFERENCES users(id)
      );
    `);

    console.log('✅ Таблицы созданы или уже существуют');
  } catch (err) {
    console.error('❌ Ошибка инициализации Turso DB:', err);
  }
}

// Инициализация при старте сервера
initDB();

export default db;
