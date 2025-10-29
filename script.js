const registerBtn = document.getElementById('registerBtn');
const openBtn = document.getElementById('registBT');
const modalContainer = document.getElementById('modalContainer');
// Загружаем модалку при клике
openBtn.onclick = async () => {
  // Загружаем HTML модалки
  const response = await fetch('registracijas.html');
  const modalHTML = await response.text();
  modalContainer.innerHTML = modalHTML;

  // Получаем элементы
  const modal = document.getElementById('registrationModal');
  const registerBtn = document.getElementById('registerBtn');
  const successMsg = document.getElementById('successMsg');

  // Показываем модалку
  modal.style.display = 'flex';
  successMsg.style.display = 'none';

  // Кнопка регистрации
  registerBtn.onclick = () => {
    successMsg.style.display = 'block';
    document.getElementById('username').value = '';
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
  };

  // Закрытие при клике вне окна
  window.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  };
};