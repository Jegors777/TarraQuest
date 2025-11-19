// server.js
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import db from './db.js'; // Turso klienta modulis
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve('.')));

const CLIENT_ID = '325773790895-3lm9397je2n0lso2nbdds8qopghf3djm.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

// ---------- GOOGLE AUTENTIFIKĀCIJA ----------
app.post('/auth/google', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ error: 'Nav nodots token' });

  try {
    // Validē id_token caur Google
    const ticket = await client.verifyIdToken({ idToken: id_token, audience: CLIENT_ID });
    const payload = ticket.getPayload();

    console.log('Payload:', payload);

    const { sub: googleId, email, name } = payload;

    // Pārbauda, vai lietotājs jau eksistē
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE googleId = ?',
      args: [googleId]
    });
    if (result.rows.length > 0) return res.json({ success: true, user: result.rows[0] });

    // Pārbauda lietotāju limitu
    const countResult = await db.execute({ sql: 'SELECT COUNT(*) AS count FROM users' });
    if (countResult.rows[0].count >= 5)
      return res.status(403).json({ error: 'Sasniegts 5 lietotāju limits' });

    // Izveido jaunu lietotāju
    const insert = await db.execute({
      sql: 'INSERT INTO users (googleId, email, name) VALUES (?, ?, ?)',
      args: [googleId, email, name]
    });

    const newUserResult = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [insert.lastInsertRowid]
    });

    res.json({ success: true, user: newUserResult.rows[0] });
  } catch (err) {
    console.error('❌ Google autentifikācijas kļūda:', err);
    res.status(401).json({ error: 'Nederīgs id_token' });
  }
});

// ---------- FAILU AUGŠUPIELĀDE + OCR ----------
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

app.post('/upload', upload.single('receipt'), async (req, res) => {
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

    const { googleId } = req.body;
    const userResult = await db.execute({ sql: 'SELECT id FROM users WHERE googleId = ?', args: [googleId] });
    if (userResult.rows.length === 0) {
      fs.unlinkSync(imagePath);
      return res.status(404).json({ error: 'Lietotājs nav atrasts' });
    }

    const userId = userResult.rows[0].id;
    const hash = getFileHash(imagePath);

    // Pārbauda dubultojumus
    const existingResult = await db.execute({ sql: 'SELECT * FROM checks WHERE userId = ? AND hash = ?', args: [userId, hash] });
    fs.unlinkSync(imagePath);

    if (existingResult.rows.length > 0)
      return res.json({ success: false, error: 'Šis čeks jau ir augšupielādēts' });

    const points = await saveCheckForUser(userId, amount, shop, hash);
    res.json({ success: true, amount, points, shop });
  } catch (err) {
    fs.existsSync(imagePath) && fs.unlinkSync(imagePath);
    console.error('❌ OCR kļūda:', err);
    res.json({ success: false, error: 'Kļūda apstrādājot čeku' });
  }
});

// ---------- VISI LIETOTĀJA ČEKI ----------
app.get('/user/checks', async (req, res) => {
  const { googleId } = req.query;
  if (!googleId) return res.status(400).json({ error: 'Nav norādīts lietotājs' });

  try {
    const userResult = await db.execute({ sql: 'SELECT id FROM users WHERE googleId = ?', args: [googleId] });
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'Lietotājs nav atrasts' });

    const checksResult = await db.execute({ sql: 'SELECT * FROM checks WHERE userId = ? ORDER BY date DESC', args: [userResult.rows[0].id] });
    res.json(checksResult.rows);
  } catch (err) {
    console.error('❌ DB kļūda:', err);
    res.status(500).json({ error: 'Datubāzes kļūda' });
  }
});


// ---------- SERVERA STARTS ----------
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Serveris darbojas uz http://localhost:${PORT}`));
