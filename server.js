// === Importi ===
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import db from './db.js'; // здесь db — это клиент pg (например, Pool из 'pg')

// === Express inicializācija ===
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve('.')));

// === Google OAuth2 iestatīšana ===
const CLIENT_ID = '325773790895-3lm9397je2n0lso2nbdds8qopghf3djm.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

// === Google autorizācija ===
app.post('/auth/google', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ error: 'Nav norādīts token' });

  try {
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: CLIENT_ID,
    });

    const { sub: googleId, email, name } = ticket.getPayload();

    // Проверка: есть ли юзер в базе
    const existing = await db.query(
      'SELECT * FROM users WHERE googleId = $1',
      [googleId]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, user: existing.rows[0] });
    }

    // Проверка лимита: 5 пользователей
    const countRes = await db.query('SELECT COUNT(*) FROM users');
    const count = Number(countRes.rows[0].count);

    if (count >= 5) {
      return res.status(403).json({ error: 'Sasniegts 5 lietotāju limits' });
    }

    // Создание пользователя
    const insert = await db.query(
      'INSERT INTO users (googleId, email, name) VALUES ($1, $2, $3) RETURNING *',
      [googleId, email, name]
    );

    return res.json({ success: true, user: insert.rows[0] });

  } catch (err) {
    console.error('❌ Google Auth kļūda:', err);
    res.status(401).json({ error: 'Nederīgs tokens' });
  }
});

// === OCR /upload ===
const upload = multer({ dest: 'uploads/' });

// === Функция для вычисления хэша файла ===
function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

// === Функция для сохранения чека пользователя ===
async function saveCheckForUser(userId, amount, shop = '', hash) {
  const points = Math.round(amount * 10);

  await db.query(
    `INSERT INTO checks (userId, shop, total, points, hash)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, shop, amount, points, hash]
  );

  console.log(`Čeks saglabāts priekš lietotāja ${userId}: ${amount}€, ${points} punkti`);
}

// === Маршрут загрузки чека ===
app.post('/upload', upload.single('receipt'), async (req, res) => {
  try {
    const imagePath = req.file.path;

    const { data: { text } } = await Tesseract.recognize(imagePath, 'lav+eng');

    const amountMatch = text.match(/(\d{1,4}[.,]\d{1,2})/);
    const shopMatch = text.match(/Veikals\s*([A-Za-z0-9\s]+)/i);

    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null;
    const shop = shopMatch ? shopMatch[1].trim() : '';

    if (!amount) {
      fs.unlinkSync(imagePath);
      return res.json({ success: false, error: 'Neizdevās nolasīt summu.' });
    }

    const { googleId } = req.body;

    // Находим userId
    const userRes = await db.query(
      'SELECT id FROM users WHERE googleId = $1',
      [googleId]
    );

    if (userRes.rows.length === 0) {
      fs.unlinkSync(imagePath);
      return res.status(404).json({ success: false, error: 'Lietotājs nav atrasts.' });
    }

    const userId = userRes.rows[0].id;
    const hash = getFileHash(imagePath);

    // Проверяем дубль чека
    const existing = await db.query(
      'SELECT * FROM checks WHERE userId = $1 AND hash = $2',
      [userId, hash]
    );

    fs.unlinkSync(imagePath);

    if (existing.rows.length > 0) {
      return res.json({ success: false, error: 'Šis čeks jau ir augšupielādēts.' });
    }

    await saveCheckForUser(userId, amount, shop, hash);

    res.json({ success: true, amount, points: Math.round(amount * 10), shop });

  } catch (err) {
    console.error('❌ OCR kļūda:', err);
    res.json({ success: false, error: 'Kļūda apstrādājot čeku.' });
  }
});

// === Получение всех чеков пользователя ===
app.get('/user/checks', async (req, res) => {
  const googleId = req.query.googleId;
  if (!googleId) return res.status(400).json({ error: 'Nav norādīts lietotājs.' });

  const userRes = await db.query(
    'SELECT id FROM users WHERE googleId = $1',
    [googleId]
  );

  if (userRes.rows.length === 0) {
    return res.status(404).json({ error: 'Lietotājs nav atrasts' });
  }

  const userId = userRes.rows[0].id;

  const checks = await db.query(
    'SELECT * FROM checks WHERE userId = $1 ORDER BY date DESC',
    [userId]
  );

  res.json(checks.rows);
});

// === Servera palaišana ===
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Serveris darbojas uz http://localhost:${PORT}`));
