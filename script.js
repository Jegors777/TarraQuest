const openBtn = document.getElementById('registBT');
const modalContainer = document.getElementById('modalContainer');

openBtn.onclick = async () => {
  const response = await fetch('registracijas.html');
  const modalHTML = await response.text();
  modalContainer.innerHTML = modalHTML;

  const modal = document.getElementById('registrationModal');
  const successMsg = document.getElementById('successMsg');

  modal.style.display = 'flex';
  successMsg.style.display = 'none';

  const CLIENT_ID = '325773790895-3lm9397je2n0lso2nbdds8qopghf3djm.apps.googleusercontent.com';

  // callback Google
  function handleCredentialResponse(response) {
    fetch('http://localhost:3000/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: response.credential })
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        // Сохраняем пользователя в localStorage
        localStorage.setItem('user', JSON.stringify(data.user));

        // Показываем сообщение
        successMsg.style.display = 'block';
        successMsg.style.color = 'green';
        successMsg.textContent = `Logged in as ${data.user.name} (${data.user.email}) ✅`;

        // Редирект на scanner.html
        setTimeout(() => {
          window.location.href = 'scanner.html';
        }, 500);
      } else {
        successMsg.style.display = 'block';
        successMsg.style.color = 'red';
        successMsg.textContent = data.error || 'Error';
      }
    })
    .catch(err => console.error(err));
  }

  // Ждём, пока google.accounts.id подгрузится
  const waitForGoogle = setInterval(() => {
    if (window.google && google.accounts && google.accounts.id) {
      clearInterval(waitForGoogle);
      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse
      });
      google.accounts.id.renderButton(
        document.getElementById("g_id_signin"),
        { theme: "outline", size: "large" }
      );
    }
  }, 300);

  // Закрытие модалки при клике вне
  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
  };
};
