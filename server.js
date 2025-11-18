// === Importi ===
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import db from './db.js';

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

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    db.get('SELECT * FROM users WHERE googleId = ?', [googleId], (err, user) => {
      if (err) return res.status(500).json({ error: 'Datubāzes kļūda' });

      if (user) {
        return res.json({ success: true, user });
      } else {
        db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
          if (err) return res.status(500).json({ error: 'Datubāzes kļūda' });

          if (row.count >= 5) {
            return res.status(403).json({ error: 'Sasniegts 5 lietotāju limits' });
          }

          db.run(
            'INSERT INTO users (googleId, email, name) VALUES (?, ?, ?)',
            [googleId, email, name],
            function (err) {
              if (err) return res.status(500).json({ error: 'Ievietošanas kļūda' });
              res.json({ success: true, user: { id: this.lastID, googleId, email, name } });
            }
          );
        });
      }
    });
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
function saveCheckForUser(userId, amount, shop = '', hash) {
  const points = Math.round(amount * 10);

  db.run(
    `INSERT INTO checks (userId, shop, total, points, hash, date) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    [userId, shop, amount, points, hash],
    function(err) {
      if (err) console.error('❌ Kļūda saglabājot čeku:', err);
      else console.log(`Čeks saglabāts priekš lietotāja ${userId}: ${amount}€, ${points} punkti`);
    }
  );
}

// === Маршрут загрузки чека ===
app.post('/upload', upload.single('receipt'), async (req, res) => {
  try {
    const imagePath = req.file.path;

    const { data: { text } } = await Tesseract.recognize(imagePath, 'lav+eng');
    console.log('📄 Atpazītais teksts:', text);

    const amountMatch = text.match(/(\d{1,4}[.,]\d{1,2})/);
    const shopMatch = text.match(/Veikals\s*([A-Za-z0-9\s]+)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null;
    const shop = shopMatch ? shopMatch[1].trim() : '';

    if (!amount) {
      fs.unlinkSync(imagePath);
      return res.json({ success: false, error: 'Neizdevās nolasīt summu.' });
    }

    const { googleId } = req.body;
    if (!googleId) {
      fs.unlinkSync(imagePath);
      return res.json({ success: false, error: 'Nav norādīts lietotājs.' });
    }

    // Получаем userId
    db.get('SELECT id FROM users WHERE googleId = ?', [googleId], (err, row) => {
      if (err || !row) {
        fs.unlinkSync(imagePath);
        return res.status(404).json({ success: false, error: 'Lietotājs nav atrasts.' });
      }

      const userId = row.id;
      const hash = getFileHash(imagePath);

      // Проверяем, есть ли такой чек уже
      db.get('SELECT * FROM checks WHERE userId = ? AND hash = ?', [userId, hash], (err, existing) => {
        fs.unlinkSync(imagePath); // удаляем файл в любом случае

        if (err) return res.status(500).json({ success: false, error: 'Datubāzes kļūda' });
        if (existing) return res.json({ success: false, error: 'Šis čeks jau ir augšupielādēts.' });

        saveCheckForUser(userId, amount, shop, hash);

        res.json({ success: true, amount, points: Math.round(amount * 10), shop });
      });
    });

  } catch (err) {
    console.error('❌ OCR kļūda:', err);
    res.json({ success: false, error: 'Kļūda apstrādājot čeku.' });
  }
});

// === Получение всех чеков пользователя ===
app.get('/user/checks', (req, res) => {
  const googleId = req.query.googleId;
  if (!googleId) return res.status(400).json({ error: 'Nav norādīts lietotājs.' });

  db.get('SELECT id FROM users WHERE googleId = ?', [googleId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Datubāzes kļūda' });
    if (!row) return res.status(404).json({ error: 'Lietotājs nav atrasts' });

    const userId = row.id;

    db.all('SELECT * FROM checks WHERE userId = ? ORDER BY date DESC', [userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Datubāzes kļūda' });
      res.json(rows);
    });
  });
});

// === Servera palaišana ===
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Serveris darbojas uz http://localhost:${PORT}`));
