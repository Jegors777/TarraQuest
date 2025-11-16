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

  // Callback для обработки ответа Google
  function handleCredentialResponse(response) {
    // Отправка id_token на сервер
    fetch(`${window.location.origin}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: response.credential })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Сохраняем пользователя в localStorage
        localStorage.setItem('user', JSON.stringify(data.user));

        // Показываем сообщение об успешном входе
        successMsg.style.display = 'block';
        successMsg.style.color = 'green';
        successMsg.textContent = `Logged in as ${data.user.name} (${data.user.email}) ✅`;

        // Редирект на scanner.html после успешного входа
        setTimeout(() => {
          window.location.href = 'scanner.html';
        }, 500); // можно уменьшить задержку, если хотите
      } else {
        successMsg.style.display = 'block';
        successMsg.style.color = 'red';
        successMsg.textContent = data.error || 'Error';
      }
    })
    .catch(err => {
      console.error('Ошибка соединения с сервером:', err);
      successMsg.style.display = 'block';
      successMsg.style.color = 'red';
      successMsg.textContent = 'Ошибка соединения с сервером';
    });
  }

  // Ждём загрузку Google API
  const waitForGoogle = setInterval(() => {
    if (window.google && google.accounts && google.accounts.id) {
      clearInterval(waitForGoogle);

      // Инициализация Google Sign-In
      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse
      });

      // Рендерим кнопку
      google.accounts.id.renderButton(
        document.getElementById("g_id_signin"),
        { theme: "outline", size: "large" }
      );
    }
  }, 300);

  // Закрытие модалки при клике вне контента
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
};
