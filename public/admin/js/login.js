import { apiFetch, setToken, isAuthenticated } from './api.js';

if (isAuthenticated()) {
  window.location.href = './dashboard.html';
}

const form = document.getElementById('login-form');
const erroEl = document.getElementById('login-erro');
const btn = document.getElementById('login-btn');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  erroEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;

  try {
    const { data } = await apiFetch('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });
    setToken(data.token);
    window.location.href = './dashboard.html';
  } catch (err) {
    erroEl.textContent = err.message || 'Não foi possível entrar.';
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});
