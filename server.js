
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import db from './db.js'; // SQLite

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve('.')));

const CLIENT_ID = '325773790895-3lm9397je2n0lso2nbdds8qopghf3djm.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

// ---------- GOOGLE AUTH ----------
app.post('/auth/google', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ error: 'Nav norādīts token' });

  try {
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Проверяем пользователя
    db.get(`SELECT * FROM users WHERE googleId = ?`, [googleId], (err, existing) => {
      if (err) return res.status(500).json({ error: 'DB kļūda' });

      if (existing) return res.json({ success: true, user: existing });

      // Проверяем лимит
      db.get(`SELECT COUNT(*) AS count FROM users`, (err, row) => {
        if (err) return res.status(500).json({ error: 'DB kļūda' });

        if (row.count >= 5)
          return res.status(403).json({ error: 'Sasniegts 5 lietotāju limits' });

        // Создаём нового пользователя
        db.run(
          `INSERT INTO users (googleId, email, name) VALUES (?, ?, ?)`,
          [googleId, email, name],
          function (err) {
            if (err) return res.status(500).json({ error: 'DB kļūda' });

            db.get(`SELECT * FROM users WHERE id = ?`, [this.lastID], (err, newUser) => {
              res.json({ success: true, user: newUser });
            });
          }
        );
      });
    });
  } catch (err) {
    console.error('❌ Google Auth kļūda:', err);
    res.status(401).json({ error: 'Nederīgs tokens' });
  }
});

// ---------- FILE UPLOAD + OCR ----------
const upload = multer({ dest: 'uploads/' });

function getFileHash(filePath) {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

function saveCheckForUser(userId, amount, shop, hash) {
  return new Promise((resolve, reject) => {
    const points = Math.round(amount * 10);

    db.run(
      `INSERT INTO checks (userId, shop, total, points, hash)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, shop, amount, points, hash],
      err => {
        if (err) return reject(err);
        resolve(points);
      }
    );
  });
}

app.post('/upload', upload.single('receipt'), async (req, res) => {
  try {
    const imagePath = req.file.path;
    const result = await Tesseract.recognize(imagePath, 'lav+eng');
    const text = result.data.text;

    const amountMatch = text.match(/(\d{1,4}[.,]\d{1,2})/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null;

    const shopMatch = text.match(/Veikals\s*([A-Za-z0-9\s]+)/i);
    const shop = shopMatch ? shopMatch[1].trim() : '';

    if (!amount) {
      fs.unlinkSync(imagePath);
      return res.json({ success: false, error: 'Neizdevās nolasīt summu.' });
    }

    const { googleId } = req.body;

    db.get(`SELECT id FROM users WHERE googleId = ?`, [googleId], (err, user) => {
      if (err || !user) {
        fs.unlinkSync(imagePath);
        return res.status(404).json({ error: 'Lietotājs nav atrasts.' });
      }

      const userId = user.id;
      const hash = getFileHash(imagePath);

      // Проверка на дубликат
      db.get(
        `SELECT * FROM checks WHERE userId = ? AND hash = ?`,
        [userId, hash],
        async (err, existing) => {
          fs.unlinkSync(imagePath);

          if (existing)
            return res.json({ success: false, error: 'Šis čeks jau ir augšupielādēts.' });

          try {
            const points = await saveCheckForUser(userId, amount, shop, hash);
            res.json({ success: true, amount, points, shop });
          } catch (err) {
            res.json({ success: false, error: 'DB kļūda saglabājot čeku.' });
          }
        }
      );
    });
  } catch (err) {
    console.error('❌ OCR kļūda:', err);
    res.json({ success: false, error: 'Kļūda apstrādājot čeku.' });
  }
});

// ---------- Все чеки пользователя ----------
app.get('/user/checks', (req, res) => {
  const { googleId } = req.query;
  if (!googleId) return res.status(400).json({ error: 'Nav norādīts lietotājs.' });

  db.get(`SELECT id FROM users WHERE googleId = ?`, [googleId], (err, user) => {
    if (err || !user)
      return res.status(404).json({ error: 'Lietotājs nav atrasts.' });

    db.all(
      `SELECT * FROM checks WHERE userId = ? ORDER BY date DESC`,
      [user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB kļūda' });
        res.json(rows);
      }
    );
  });
});

// ---------- Start server ----------
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Serveris darbojas uz http://localhost:${PORT}`));