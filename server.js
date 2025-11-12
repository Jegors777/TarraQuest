
// === Importi ===
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { OAuth2Client } from 'google-auth-library';
import sqlite3 from 'sqlite3';

// === Express inicializācija ===
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve('.'))); // lai apkalpotu HTML un CSS failus

// === SQLite datubāzes iestatīšana ===
const db = new sqlite3.Database('database.db', (err) => {
  if (err) console.error('❌ Kļūda, pieslēdzoties datubāzei:', err);
  else console.log('✅ Pievienots SQLite datubāzei');
});

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    googleId TEXT UNIQUE,
    email TEXT,
    name TEXT
  )
`);

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

// === OCR /upload (čeku atpazīšana) ===
const upload = multer({ dest: 'uploads/' });
const RECEIPT_DB = path.join('./', 'receipts.json');

function readReceipts() {
  try {
    return JSON.parse(fs.readFileSync(RECEIPT_DB, 'utf-8'));
  } catch {
    return [];
  }
}

function writeReceipts(data) {
  fs.writeFileSync(RECEIPT_DB, JSON.stringify(data, null, 2));
}

app.post('/upload', upload.single('receipt'), async (req, res) => {
  try {
    const imagePath = req.file.path;

    const { data: { text } } = await Tesseract.recognize(imagePath, 'lav+eng');
    console.log('📄 Atpazītais teksts:', text);

    const amountMatch = text.match(/(\d+[.,]\d{2})\s?(EUR|€)?/);
    const dateMatch = text.match(/\d{2}[./-]\d{2}[./-]\d{4}/);

    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null;
    const date = dateMatch ? dateMatch[0] : null;

    fs.unlinkSync(imagePath);

    if (!amount || !date) {
      return res.json({ success: false, error: 'Neizdevās nolasīt summu vai datumu.' });
    }

    const dbData = readReceipts();
    const duplicate = dbData.find(item => item.amount === amount && item.date === date);

    if (duplicate) {
      return res.json({ success: false, error: 'Šis čeks jau ir reģistrēts.' });
    }

    dbData.push({ amount, date });
    writeReceipts(dbData);

    res.json({ success: true, amount, date });

  } catch (err) {
    console.error('❌ OCR kļūda:', err);
    res.json({ success: false, error: 'Kļūda apstrādājot čeku.' });
  }
});

// === Lietotāju pārbaude ===
app.get('/users', (req, res) => {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Datubāzes kļūda' });
    res.json(rows);
  });
});

// === Servera palaišana ===
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Serveris darbojas uz http://localhost:${PORT}`));
