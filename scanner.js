const form = document.getElementById('receiptForm');
const input = document.getElementById('receiptInput');
const resultText = document.getElementById('result');

const API_BASE = window.location.origin;

// Загружаем пользователя из localStorage
const user = JSON.parse(localStorage.getItem('user'));

// Если пользователь не авторизован, редирект на главную
if (!user) {
  window.location.href = 'index.html';
}

// === Функция загрузки информации пользователя (имя) ===
async function loadUserInfo() {
  try {
    const res = await fetch(`${API_BASE}/user/info?googleId=${user.googleId}`);
    if (!res.ok) throw new Error('Не удалось загрузить имя пользователя');
    const data = await res.json();
    document.getElementById('welcomeText').textContent = `Sveiks, ${data.name}!`;
  } catch (err) {
    console.error(err);
    document.getElementById('welcomeText').textContent = `Sveiks!`;
  }
}

// === Функция загрузки очков пользователя ===
async function loadUserPoints() {
  try {
    const res = await fetch(`${API_BASE}/user/checks?googleId=${user.googleId}`);
    if (!res.ok) throw new Error('Не удалось загрузить чеки');
    const checks = await res.json();

    if (Array.isArray(checks)) {
      const totalPoints = checks.reduce((sum, c) => sum + (c.points || 0), 0);
      document.getElementById('pointsText').textContent = `Tavi punkti: ${totalPoints} 🪙`;
    } else {
      document.getElementById('pointsText').textContent = `Tavi punkti: 0 🪙`;
    }
  } catch (err) {
    console.error('❌ Kļūda ielādējot punktus:', err);
    document.getElementById('pointsText').textContent = `Kļūda ielādējot punktus`;
  }
}

// Загружаем имя и очки при старте страницы
loadUserInfo();
loadUserPoints();

// === Отправка чека ===
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!input.files[0]) {
    resultText.textContent = "⚠️ Lūdzu, izvēlies failu!";
    resultText.className = "error";
    return;
  }

  const formData = new FormData();
  formData.append('receipt', input.files[0]);
  formData.append('googleId', user.googleId);

  resultText.textContent = "Apstrādā čeku... ⏳";
  resultText.className = "";

  try {
    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
    const data = await res.json();

    if (data.success) {
      resultText.textContent = `✅ Čeks pievienots! Summa: €${data.amount.toFixed(2)} | Punkti: ${data.points} | Veikals: ${data.shop}`;
      resultText.className = "success";
      input.value = "";

      // Обновляем очки после загрузки нового чека
      loadUserPoints();
    } else {
      resultText.textContent = `❌ Kļūda: ${data.error}`;
      resultText.className = "error";
    }
  } catch (err) {
    console.error(err);
    resultText.textContent = "⚠️ Servera kļūda. Pārbaudi, vai serveris darbojas.";
    resultText.className = "error";
  }
});

// Кнопка Leaderboard
document.getElementById('LeaderBT').onclick = () => {
  window.location.href = 'leaderboard.html';
};
