const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const cors = require('cors');
const db = require('./db'); // подключаем базу

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));

// Токен CLIENT_ID из Google Cloud Console
const CLIENT_ID = '325773790895-3lm9397je2n0lso2nbdds8qopghf3djm.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);


app.post('/auth/google', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ error: 'No token provided' });

  try {
    // Проверяем токен Google
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload(); // содержит email, name, sub (Google ID)

    const { sub: googleId, email, name } = payload;

    // Проверяем, есть ли уже пользователь в базе
    db.get('SELECT * FROM users WHERE googleId = ?', [googleId], (err, user) => {
      if (err) return res.status(500).json({ error: 'DB error' });

      if (user) {
        return res.json({ success: true, user });
      } else {
        // Считаем пользователей — ограничение 5
        db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
          if (err) return res.status(500).json({ error: 'DB error' });

          if (row.count >= 5) {
            return res.status(403).json({ error: 'Limit of 5 users reached' });
          }

          // Добавляем нового
          db.run(
            'INSERT INTO users (googleId, email, name) VALUES (?, ?, ?)',
            [googleId, email, name],
            function (err) {
              if (err) return res.status(500).json({ error: 'Insert error' });
              res.json({ success: true, user: { id: this.lastID, googleId, email, name } });
            }
          );
        });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/users', (req, res) => {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

app.get('/', (req, res) => {
  res.redirect('/users'); // теперь при заходе на / — покажет список пользователей
});

app.listen(3000, () => console.log('✅ Server running on http://localhost:3000'));

