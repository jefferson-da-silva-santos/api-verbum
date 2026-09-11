// Wrapper de fetch pro painel admin: guarda o JWT no localStorage, injeta o
// header Authorization em toda chamada, e manda pro login se o token expirar.
const TOKEN_KEY = 'verbum_admin_token';
const API_BASE = '/api/v1';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function logout() {
  clearToken();
  window.location.href = './index.html';
}

// path já vem com a barra inicial, ex: apiFetch('/admin/perguntas?status=PENDENTE')
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('Não foi possível conectar à API. Verifique sua internet e tente de novo.');
  }

  if (res.status === 401) {
    clearToken();
    const jaEstaNoLogin = /\/admin\/(index\.html)?$/.test(window.location.pathname);
    if (!jaEstaNoLogin) window.location.href = './index.html';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok || body.success === false) {
    const err = new Error(body.message || `Erro ${res.status}.`);
    err.details = body.details;
    err.status = res.status;
    throw err;
  }

  return body;
}
