const API_BASE = window.location.origin;

// === Функция загрузки пунктов ===
async function loadUserPoints() {
  try {
    const res = await fetch(`${API_BASE}/user/checks?googleId=${user.googleId}`);
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

// === Отправка чека ===
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!input.files[0]) return;

  const formData = new FormData();
  formData.append('receipt', input.files[0]);
  formData.append('googleId', user.googleId);

  try {
    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
    const data = await res.json();

    if (data.success) {
      input.value = "";
      loadUserPoints(); // обновляем очки после загрузки
    }
  } catch (err) {
    console.error(err);
  }
});
