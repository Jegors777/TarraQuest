const openBtn = document.getElementById('registBT');
const modalContainer = document.getElementById('modalContainer');

openBtn.onclick = async () => {
  // Загружаем модальное окно с HTML
  const response = await fetch('registracijas.html');
  const modalHTML = await response.text();
  modalContainer.innerHTML = modalHTML;

  const modal = document.getElementById('registrationModal');
  const successMsg = document.getElementById('successMsg');
  modal.style.display = 'flex';
  successMsg.style.display = 'none';

  const CLIENT_ID = '325773790895-3lm9397je2n0lso2nbdds8qopghf3djm.apps.googleusercontent.com';

  // ---------------- Google Sign-In Callback ----------------
  function handleCredentialResponse(response) {
    console.log('Google login response:', response);

    if (!response.credential) {
      successMsg.style.display = 'block';
      successMsg.style.color = 'red';
      successMsg.textContent = '❌ Не удалось получить id_token!';
      return;
    }

    const id_token = response.credential;
    console.log('id_token length:', id_token.length); // для проверки
    console.log('Отправляем id_token на сервер...');

    // Отправка id_token на сервер
    fetch(`${window.location.origin}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token })
    })
      .then(res => res.json())
      .then(data => {
        console.log('Ответ сервера:', data);
        if (data.success) {
          localStorage.setItem('user', JSON.stringify(data.user));

          successMsg.style.display = 'block';
          successMsg.style.color = 'green';
          successMsg.textContent = `✅ Logged in as ${data.user.name} (${data.user.email})`;

          // Переходим на scanner.html
          setTimeout(() => {
            window.location.href = 'scanner.html';
          }, 500);
        } else {
          successMsg.style.display = 'block';
          successMsg.style.color = 'red';
          successMsg.textContent = data.error || 'Ошибка авторизации';
        }
      })
      .catch(err => {
        console.error('Ошибка соединения с сервером:', err);
        successMsg.style.display = 'block';
        successMsg.style.color = 'red';
        successMsg.textContent = 'Ошибка соединения с сервером';
      });
  }

  // ---------------- Ждём загрузку Google API ----------------
  const waitForGoogle = setInterval(() => {
    if (window.google && google.accounts && google.accounts.id) {
      clearInterval(waitForGoogle);

      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse
      });

      // Рендерим кнопку в контейнере с id="g_id_signin"
      google.accounts.id.renderButton(
        document.getElementById("g_id_signin"),
        { theme: "outline", size: "large" }
      );

      // Можно включить One Tap подсказку
      // google.accounts.id.prompt();
    }
  }, 300);

  // ---------------- Закрытие модалки при клике вне контента ----------------
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
};
