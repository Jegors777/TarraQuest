const openBtn = document.getElementById('registBT');
const modalContainer = document.getElementById('modalContainer');

openBtn.onclick = async () => {
  // Загружаем модальное окно
  const response = await fetch('registracijas.html');
  const modalHTML = await response.text();
  modalContainer.innerHTML = modalHTML;

  const modal = document.getElementById('registrationModal');
  const successMsg = document.getElementById('successMsg');
  modal.style.display = 'flex';
  successMsg.style.display = 'none';

  const CLIENT_ID = '325773790895-3lm9397je2n0lso2nbdds8qopghf3djm.apps.googleusercontent.com';

  // ---------------- Google Sign-In Callback ----------------
  async function handleCredentialResponse(response) {
    console.log('Google login response:', response);

    if (!response.credential) {
      successMsg.style.display = 'block';
      successMsg.style.color = 'red';
      successMsg.textContent = 'Не удалось получить id_token!';
      return;
    }

    // Берём только свежий id_token от Google
    const id_token = response.credential;
    console.log('id_token (length):', id_token.length);

    try {
      const res = await fetch(`${window.location.origin}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token }) // отправляем только Google токен
      });

      const data = await res.json();

      if (data.success) {
        // Сохраняем данные пользователя
        localStorage.setItem('user', JSON.stringify(data.user));

        successMsg.style.display = 'block';
        successMsg.style.color = 'green';
        successMsg.textContent = `Logged in as ${data.user.name} (${data.user.email}) ✅`;

        // Переход на scanner.html
        setTimeout(() => {
          window.location.href = 'scanner.html';
        }, 500);
      } else {
        successMsg.style.display = 'block';
        successMsg.style.color = 'red';
        successMsg.textContent = data.error || 'Ошибка авторизации';
      }
    } catch (err) {
      console.error('Ошибка соединения с сервером:', err);
      successMsg.style.display = 'block';
      successMsg.style.color = 'red';
      successMsg.textContent = 'Ошибка соединения с сервером';
    }
  }

  // ---------------- Ждём загрузку Google API ----------------
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

      // Опционально: включаем One Tap
      // google.accounts.id.prompt();
    }
  }, 300);

  // Закрытие модалки при клике вне
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
};
