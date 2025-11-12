const form = document.getElementById('receiptForm');
const input = document.getElementById('receiptInput');
const resultText = document.getElementById('result');

// Загружаем пользователя из localStorage
const user = JSON.parse(localStorage.getItem('user'));

if (!user) {
  // Если нет авторизации — назад на главную
  window.location.href = 'index.html';
}

// Показываем имя
document.getElementById('welcomeText').textContent = `Sveiks, ${user.name}!`;

// === Функция загрузки пунктов ===
async function loadUserPoints() {
  try {
    const res = await fetch(`http://localhost:3000/user/checks?googleId=${user.googleId}`);
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

// Загружаем очки при загрузке страницы
loadUserPoints();

// === Отправка чека ===
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!input.files[0]) {
    resultText.textContent = "⚠️ Lūdzu, izvēlies failu!";
    resultText.className = "error";
    return;
  }

  resultText.textContent = "Apstrādā čeku... ⏳";
  resultText.className = "";

  const formData = new FormData();
  formData.append('receipt', input.files[0]);
  formData.append('googleId', user.googleId);

  try {
    const res = await fetch('http://localhost:3000/upload', {
      method: 'POST',
      body: formData
    });
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

// Кнопка leaderboard
const LeaderBT = document.getElementById('LeaderBT');
LeaderBT.onclick = () => {
  window.location.href = 'leaderboard.html';
};
