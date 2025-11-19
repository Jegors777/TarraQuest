import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import db from './db.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve('.')));

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT = new OAuth2Client(CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

// ---------- GOOGLE AUTH ----------
app.post('/auth/google', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ error: 'Nav nodots token' });

  try {
    const ticket = await GOOGLE_CLIENT.verifyIdToken({ idToken: id_token, audience: CLIENT_ID });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Проверяем пользователя в БД
    let result = await db.execute({ sql: 'SELECT * FROM users WHERE googleId = ?', args: [googleId] });
    let user;
    if (result.rows.length > 0) {
      user = result.rows[0];
    } else {
      // Проверка лимита
      const countResult = await db.execute({ sql: 'SELECT COUNT(*) AS count FROM users' });
      if (countResult.rows[0].count >= 5) return res.status(403).json({ error: 'Sasniegts 5 lietotāju limits' });

      const insert = await db.execute({ sql: 'INSERT INTO users (googleId, email, name) VALUES (?, ?, ?)', args: [googleId, email, name] });
      user = (await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [insert.lastInsertRowid] })).rows[0];
    }

    // Создаём внутренний JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, user, token });
  } catch (err) {
    console.error('❌ Google auth error:', err);
    res.status(401).json({ error: 'Nederīgs id_token' });
  }
});

// ---------- Миддлвар для проверки JWT ----------
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ---------- FILE UPLOAD + OCR ----------
const upload = multer({ dest: 'uploads/' });

function getFileHash(filePath) {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

async function saveCheckForUser(userId, amount, shop, hash) {
  const points = Math.round(amount * 10);
  await db.execute({
    sql: 'INSERT INTO checks (userId, shop, total, points, hash) VALUES (?, ?, ?, ?, ?)',
    args: [userId, shop, amount, points, hash]
  });
  return points;
}

app.post('/upload', authMiddleware, upload.single('receipt'), async (req, res) => {
  const imagePath = req.file.path;

  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'lav+eng');

    const amountMatch = text.match(/(\d{1,4}[.,]\d{1,2})/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null;

    const shopMatch = text.match(/Veikals\s*([A-Za-z0-9\s]+)/i);
    const shop = shopMatch ? shopMatch[1].trim() : '';

    if (!amount) {
      fs.unlinkSync(imagePath);
      return res.json({ success: false, error: 'Neizdevās nolasīt summu' });
    }

    const userId = req.userId;
    const hash = getFileHash(imagePath);

    const existingResult = await db.execute({ sql: 'SELECT * FROM checks WHERE userId = ? AND hash = ?', args: [userId, hash] });
    fs.unlinkSync(imagePath);

    if (existingResult.rows.length > 0) return res.json({ success: false, error: 'Šis čeks jau ir augšupielādēts' });

    const points = await saveCheckForUser(userId, amount, shop, hash);
    res.json({ success: true, amount, points, shop });
  } catch (err) {
    fs.existsSync(imagePath) && fs.unlinkSync(imagePath);
    console.error('❌ OCR error:', err);
    res.json({ success: false, error: 'Kļūda apstrādājot čeku' });
  }
});

// ---------- GET USER CHECKS ----------
app.get('/user/checks', authMiddleware, async (req, res) => {
  try {
    const checksResult = await db.execute({ sql: 'SELECT * FROM checks WHERE userId = ? ORDER BY date DESC', args: [req.userId] });
    res.json(checksResult.rows);
  } catch (err) {
    console.error('❌ DB error:', err);
    res.status(500).json({ error: 'Datubāzes kļūda' });
  }
});

// ---------- SERVER START ----------
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Serveris darbojas uz http://localhost:${PORT}`));
