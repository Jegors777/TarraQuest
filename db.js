// db.js
import pkg from 'pg';
const { Pool } = pkg;

// ===== Настройки подключения к локальной базе =====
// Замените эти значения на свои
const pool = new Pool({
  user: 'postgres',          // ваш пользователь PostgreSQL
  host: 'localhost',         // локальный сервер
  database: 'your_db_name',  // имя вашей базы
  password: 'your_password', // пароль PostgreSQL
  port: 5432                 // стандартный порт PostgreSQL
});

// ===== Логи соединения =====
pool.on('connect', () => {
  console.log('🟢 Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('🔴 PostgreSQL error:', err);
});

// ===== Создание таблиц при старте =====
export const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        googleId TEXT UNIQUE,
        email TEXT,
        name TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS checks (
        id SERIAL PRIMARY KEY,
        userId INTEGER REFERENCES users(id),
        shop TEXT,
        total REAL,
        points INTEGER,
        hash TEXT,
        date TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✔ Tables ensured");
  } catch (err) {
    console.error("❌ Failed creating tables:", err);
  }
};

// ===== Создание таблиц сразу при импорте =====
createTables();

export default pool;
