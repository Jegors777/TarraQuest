const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Токен CLIENT_ID из Google Cloud Console
const CLIENT_ID = '325773790895-3lm9397je2n0lso2nbdds8qopghf3djm.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

// Минимальная «база» на 5 пользователей
let users = []; // каждый пользователь {googleId, email, name}

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

    // Проверяем, есть ли уже пользователь
    let user = users.find(u => u.googleId === payload.sub);

    if (!user) {
      if (users.length >= 5) {
        return res.status(403).json({ error: 'Limit of 5 users reached' });
      }
      user = {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || 'No Name'
      };
      users.push(user);
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
app.post('/auth/google', async (req, res) => {
  console.log('Telozaprosa:', req.body);  // <-- добавлено
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ error: 'No token provided' });
  // ...
});

