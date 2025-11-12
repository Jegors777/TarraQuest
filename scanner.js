
const form = document.getElementById('receiptForm');
const input = document.getElementById('receiptInput');
const resultText = document.getElementById('result');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!input.files[0]) {
    resultText.textContent = "⚠️ Lūdzu, izvēlies failu!";
    resultText.className = "error";
    return;
  }

  const formData = new FormData();
  formData.append('receipt', input.files[0]); // Failu pievienojam tieši

  resultText.textContent = "Apstrādā čeku... ⏳";
  resultText.className = "";

  try {
    const res = await fetch('http://localhost:3000/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      resultText.textContent = `✅ Čeks veiksmīgi pievienots! Summa: €${data.amount.toFixed(2)} | Datums: ${data.date}`;
      resultText.className = "success";
      input.value = ""; // Atsvaidzinām faila lauku, gatavs nākamajam čeka augšupielādei
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
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!input.files[0]) {
    resultText.textContent = "⚠️ Lūdzu, izvēlies failu!";
    resultText.className = "error";
    return;
  }

  const formData = new FormData();
  formData.append('receipt', input.files[0]); // Failu pievienojam tieši

  resultText.textContent = "Apstrādā čeku... ⏳";
  resultText.className = "";

  try {
    const res = await fetch('http://localhost:3000/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      resultText.textContent = `✅ Čeks veiksmīgi pievienots! Summa: €${data.amount.toFixed(2)} | Datums: ${data.date}`;
      resultText.className = "success";
      input.value = ""; // Atsvaidzinām faila lauku, gatavs nākamajam čeka augšupielādei
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

// Pogas
const LeaderBT = document.getElementById('LeaderBT')
LeaderBT.onclick = () => {
  window.location.href = 'leaderboard.html';
};