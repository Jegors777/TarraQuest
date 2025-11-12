// === Importi ===
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { OAuth2Client } from 'google-auth-library';
import db from './db.js'; // подключаем твой db.js

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

// === Функция для сохранения чека пользователя ===
function saveCheckForUser(googleId, amount, shop = '') {
  const points = Math.round(amount * 10);

  db.get('SELECT id FROM users WHERE googleId = ?', [googleId], (err, row) => {
    if (err) return console.error(err);
    if (!row) return console.error('Пользователь не найден');

    const userId = row.id;

    db.run(
      `INSERT INTO checks (userId, shop, total, points, date) VALUES (?, ?, ?, ?, datetime('now'))`,
      [userId, shop, amount, points],
      function(err) {
        if (err) console.error(err);
        else console.log(`Čeks saglabāt priekš lietotāja ${googleId}: ${amount}€, ${points} points`);
      }
    );
  });
}

// === Маршрут загрузки чека ===
app.post('/upload', upload.single('receipt'), async (req, res) => {
  try {
    const imagePath = req.file.path;

    const { data: { text } } = await Tesseract.recognize(imagePath, 'lav+eng');
    console.log('📄 Atpazītais teksts:', text);

    // Ищем число, похожее на сумму, но не часть даты
    const amountMatch = text.match(/(\d{1,4}[.,]\d{1,2})/);
    const shopMatch = text.match(/Veikals\s*([A-Za-z0-9\s]+)/i); // простая попытка распознать название магазина
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null;
    const shop = shopMatch ? shopMatch[1].trim() : '';

    fs.unlinkSync(imagePath);

    if (!amount) return res.json({ success: false, error: 'Neizdevās nolasīt summu.' });

    const { googleId } = req.body;
    if (!googleId) return res.json({ success: false, error: 'Nav norādīts lietotājs.' });
    console.log('req.body:', req.body); // <-- чтобы увидеть, что приходит

    saveCheckForUser(googleId, amount, shop);

    res.json({ success: true, amount, points: Math.round(amount * 10), shop });

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
