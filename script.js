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
  
function handleCredentialResponse(response) {
  console.log('Google credential:', response.credential);

  fetch('http://localhost:3000/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: response.credential })
  })
  .then(r => {
    console.log('Ответ сервера:', r.status);
    return r.json();
  })
  .then(console.log)
  .catch(err => console.error('Ошибка запроса:', err));
}
  function handleCredentialResponse(response) {
    fetch('http://localhost:3000/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: response.credential })
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        successMsg.style.display = 'block';
        successMsg.textContent = `You rigestred like ${data.user.name} (${data.user.email}) ✅`;
      } else {
        successMsg.style.display = 'block';
        successMsg.style.color = 'red';
        successMsg.textContent = data.error || 'Error ';
      }
    })
    .catch(err => console.error(err));
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

  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
  };
};
