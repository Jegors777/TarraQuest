import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => {
  console.log('🟢 Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('🔴 PostgreSQL error:', err);
});

// Создание таблиц при старте
const createTables = async () => {
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

createTables();

export default pool;
