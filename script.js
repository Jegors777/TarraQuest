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
    if (!response.credential) {
      successMsg.style.display = 'block';
      successMsg.style.color = 'red';
      successMsg.textContent = 'Не удалось получить id_token!';
      return;
    }

    const id_token = response.credential;

    try {
      // Отправляем Google id_token на сервер для проверки и получения внутреннего JWT
      const res = await fetch(`${window.location.origin}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token })
      });

      const data = await res.json();

      if (data.success && data.token) {
        // Сохраняем JWT и данные пользователя в localStorage
        localStorage.setItem('jwt', data.token);
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

      // При желании можно включить One Tap
      // google.accounts.id.prompt();
    }
  }, 300);

  // Закрытие модалки при клике вне
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
};

// ---------------- Функции для запросов с JWT ----------------

// Получение чеков пользователя
async function getUserChecks() {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('Нет авторизации');

  const res = await fetch('/user/checks', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Ошибка запроса чеков');
  }

  return res.json();
}

// Загрузка чека (файл)
async function uploadReceipt(file) {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('Нет авторизации');

  const formData = new FormData();
  formData.append('receipt', file);

  const res = await fetch('/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Ошибка загрузки чека');
  }

  return res.json();
}
