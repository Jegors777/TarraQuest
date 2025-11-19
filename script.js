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

  async function handleCredentialResponse(response) {
    if (!response.credential) {
      successMsg.style.display = 'block';
      successMsg.style.color = 'red';
      successMsg.textContent = 'Не удалось получить id_token!';
      return;
    }

    const id_token = response.credential;

    try {
      const res = await fetch(`${window.location.origin}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token })
      });
      const data = await res.json();

      if (data.success) {
        // Сохраняем данные пользователя
        localStorage.setItem('user', JSON.stringify(data.user));

        successMsg.style.display = 'block';
        successMsg.style.color = 'green';
        successMsg.textContent = `Logged in as ${data.user.name} (${data.user.email}) ✅`;

        setTimeout(() => window.location.href = 'scanner.html', 500);
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

  modal.addEventListener('click', e => {
    if (e.target === modal) modal.style.display = 'none';
  });
};
