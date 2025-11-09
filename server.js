import express from 'express';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
const upload = multer({ dest: 'uploads/' });

const DB_FILE = path.join('./', 'receipts.json');

function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.post('/upload', upload.single('receipt'), async (req, res) => {
  try {
    const imagePath = req.file.path;

    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
    console.log('Atpazītais teksts:', text);

    const amountMatch = text.match(/(\d+[.,]\d{2})\s?(EUR|€)?/);
    const dateMatch = text.match(/\d{2}[./-]\d{2}[./-]\d{4}/);

    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null;
    const date = dateMatch ? dateMatch[0] : null;

    fs.unlinkSync(imagePath);

    if (!amount || !date) {
      return res.json({ success: false, error: 'Neizdevās nolasīt čeka summu vai datumu.' });
    }

    const db = readDB();
    const duplicate = db.find(item => item.amount === amount && item.date === date);

    if (duplicate) {
      return res.json({ success: false, error: 'Šis čeks jau ir reģistrēts.' });
    }

    db.push({ amount, date });
    writeDB(db);

    res.json({ success: true, amount, date });

  } catch (err) {
    console.error('Kļūda apstrādājot čeku:', err);
    res.json({ success: false, error: 'Servera kļūda OCR procesā.' });
  }
});

app.listen(3000, () => console.log('✅ Serveris darbojas uz http://localhost:3000'));
