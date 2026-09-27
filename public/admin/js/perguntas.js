import { apiFetch, logout } from './api.js';
import {
  requireAuth, escapeHtml, highlight, answerSnippet, formatDate, plural, STATUS_LABELS,
} from './ui.js';

// Tela "Perguntas & Respostas": biblioteca de leitura de tudo que está no
// sistema. O estado dos filtros vive na URL, então voltar da página de
// detalhe (ou recarregar) mantém busca, filtros e página.

requireAuth();

const STATUS_CHIPS = [
  { key: 'PUBLICADA', label: 'Publicadas' },
  { key: '', label: 'Todas' },
  { key: 'PENDENTE', label: 'Pendentes' },
  { key: 'ARQUIVADA', label: 'Arquivadas' },
  { key: 'REJEITADA', label: 'Rejeitadas' },
];

const LIMIT = 20;

const el = {
  subtitle: document.getElementById('page-subtitle'),
  search: document.getElementById('search-input'),
  categoria: document.getElementById('categoria-select'),
  ordem: document.getElementById('ordem-select'),
  chips: document.getElementById('status-chips'),
  resultLine: document.getElementById('result-line'),
  list: document.getElementById('list-container'),
  pager: document.getElementById('pager'),
  logout: document.getElementById('logout-btn'),
};

const icons = {
  book: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5A2.5 2.5 0 0 0 4 21.5"/><path d="M20 19v3H6.5"/></svg>',
  comment: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  heart: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  calendar: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  chevron: '<svg class="qa-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
};

// ── Estado ↔ URL ─────────────────────────────────────────────────────

function readState() {
  const p = new URLSearchParams(window.location.search);
  const page = Number(p.get('page'));
  return {
    status: p.has('status') ? p.get('status') : 'PUBLICADA',
    q: p.get('q') || '',
    categoria: p.get('categoria') || '',
    ordem: p.get('ordem') === 'antigas' ? 'antigas' : 'recentes',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

const state = { ...readState(), total: 0, totalPages: 1, items: [] };

function writeState() {
  const p = new URLSearchParams();
  if (state.status !== 'PUBLICADA') p.set('status', state.status);
  if (state.q) p.set('q', state.q);
  if (state.categoria) p.set('categoria', state.categoria);
  if (state.ordem !== 'recentes') p.set('ordem', state.ordem);
  if (state.page > 1) p.set('page', String(state.page));
  const qs = p.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  // a tela de detalhe usa isso no botão "voltar" (ver pergunta.js)
  try { sessionStorage.setItem('verbum_lista_url', window.location.pathname + window.location.search); } catch { /* ok */ }
}

// ── Filtros ──────────────────────────────────────────────────────────

function renderChips() {
  el.chips.innerHTML = STATUS_CHIPS.map((c) => `
    <button type="button" role="tab" class="status-chip ${c.key === state.status ? 'active' : ''}"
      aria-selected="${c.key === state.status}" data-status="${c.key}">${c.label}</button>
  `).join('');

  el.chips.querySelectorAll('[data-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.status === btn.dataset.status) return;
      state.status = btn.dataset.status;
      state.page = 1;
      renderChips();
      load();
    });
  });
}

async function loadCategorias() {
  try {
    const { data } = await apiFetch('/perguntas/categorias');
    const opts = (data || []).map((c) => `<option value="${escapeHtml(c.categoria)}">${escapeHtml(c.categoria)} (${c.total})</option>`);
    el.categoria.insertAdjacentHTML('beforeend', opts.join(''));
    // categoria vinda da URL que não está na lista (ex: só existe em pendentes)
    if (state.categoria && ![...el.categoria.options].some((o) => o.value === state.categoria)) {
      el.categoria.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(state.categoria)}">${escapeHtml(state.categoria)}</option>`);
    }
    el.categoria.value = state.categoria;
  } catch {
    // sem categorias o filtro só fica com "Todas" — não bloqueia a tela
  }
}

// ── Lista ────────────────────────────────────────────────────────────

function renderSkeleton() {
  el.list.innerHTML = `<div class="qa-list">${'<div class="skeleton-card"></div>'.repeat(4)}</div>`;
}

function renderCard(p) {
  const snippet = answerSnippet(p.resposta, state.q);
  const preview = snippet
    ? `<p class="qa-preview">${highlight(snippet, state.q)}</p>`
    : '<p class="qa-preview is-empty">Ainda sem resposta.</p>';

  const refs = (p.referencias || []).length;
  const comentarios = p._count?.comentarios ?? 0;
  const favoritos = p._count?.favoritos ?? 0;

  const foot = [
    `<span>${icons.calendar}${formatDate(p.createdAt)}</span>`,
    refs ? `<span>${icons.book}${plural(refs, 'referência')}</span>` : '',
    comentarios ? `<span>${icons.comment}${plural(comentarios, 'comentário')}</span>` : '',
    favoritos ? `<span>${icons.heart}${plural(favoritos, 'favorito')}</span>` : '',
  ].join('');

  // na aba "Publicadas" o selo de status é redundante
  const badge = state.status === 'PUBLICADA' ? '' : `<span class="badge badge-${p.status}">${STATUS_LABELS[p.status] || p.status}</span>`;

  return `
    <a class="qa-card" href="/admin/pergunta.html?id=${p.id}">
      <div>
        <div class="qa-card-head">
          <span class="qa-id">#${p.id}</span>
          ${badge}
          ${p.categoria ? `<span class="pill-cat">${escapeHtml(p.categoria)}</span>` : ''}
        </div>
        <h2 class="qa-question">${highlight(p.pergunta, state.q)}</h2>
        ${preview}
        <div class="qa-foot">${foot}</div>
      </div>
      ${icons.chevron}
    </a>
  `;
}

function renderList() {
  const filtrando = state.q || state.categoria;
  el.resultLine.textContent = state.total
    ? `${plural(state.total, 'pergunta')}${filtrando ? ' encontrada' + (state.total === 1 ? '' : 's') : ''} · página ${state.page} de ${state.totalPages}`
    : '';

  if (!state.items.length) {
    el.list.innerHTML = `<div class="empty-state">${filtrando
      ? 'Nenhuma pergunta bate com essa busca. Tente outros termos ou limpe os filtros.'
      : 'Nenhuma pergunta com esse status ainda.'}</div>`;
    return;
  }

  el.list.innerHTML = `<div class="qa-list">${state.items.map(renderCard).join('')}</div>`;

  el.list.querySelectorAll('.qa-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      // Ctrl/Cmd+clique abre em outra aba — lá não existe "voltar" no histórico
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      try { sessionStorage.setItem('verbum_veio_da_lista', '1'); } catch { /* ok */ }
    });
  });
}

// números de página com reticências: 1 … 4 5 [6] 7 8 … 16
function pageNumbers(current, total) {
  const set = new Set([1, total, current - 2, current - 1, current, current + 1, current + 2]);
  const pages = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  pages.forEach((n, i) => {
    if (i && n - pages[i - 1] > 1) out.push('gap');
    out.push(n);
  });
  return out;
}

function renderPager() {
  if (state.totalPages <= 1) { el.pager.innerHTML = ''; return; }

  const nums = pageNumbers(state.page, state.totalPages).map((n) => (n === 'gap'
    ? '<span class="gap">…</span>'
    : `<button type="button" data-page="${n}" class="${n === state.page ? 'active' : ''}" ${n === state.page ? 'aria-current="page"' : ''}>${n}</button>`));

  el.pager.innerHTML = `
    <button type="button" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''} aria-label="Página anterior">←</button>
    ${nums.join('')}
    <button type="button" data-page="${state.page + 1}" ${state.page >= state.totalPages ? 'disabled' : ''} aria-label="Próxima página">→</button>
  `;

  el.pager.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const n = Number(btn.dataset.page);
      if (n < 1 || n > state.totalPages || n === state.page) return;
      state.page = n;
      load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

let requestSeq = 0;

async function load() {
  writeState();
  const seq = ++requestSeq;
  renderSkeleton();
  el.pager.innerHTML = '';

  const params = new URLSearchParams({ page: String(state.page), limit: String(LIMIT), ordem: state.ordem });
  if (state.status) params.set('status', state.status);
  if (state.q) params.set('q', state.q);
  if (state.categoria) params.set('categoria', state.categoria);

  try {
    const { data, meta } = await apiFetch(`/admin/perguntas?${params}`);
    if (seq !== requestSeq) return; // resposta de uma busca antiga — ignora
    state.items = data;
    state.total = meta.total;
    state.totalPages = meta.totalPages;

    // página da URL maior que o total (ex: filtro mudou) → volta pra última
    if (state.page > state.totalPages) { state.page = state.totalPages; load(); return; }

    renderList();
    renderPager();
  } catch (err) {
    if (seq !== requestSeq) return;
    el.resultLine.textContent = '';
    el.list.innerHTML = `<div class="empty-state">Erro ao carregar: ${escapeHtml(err.message)}</div>`;
  }
}

// ── Eventos ──────────────────────────────────────────────────────────

let debounce;
el.search.addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    const q = el.search.value.trim();
    if (q === state.q) return;
    state.q = q;
    state.page = 1;
    load();
  }, 350);
});

el.categoria.addEventListener('change', () => {
  state.categoria = el.categoria.value;
  state.page = 1;
  load();
});

el.ordem.addEventListener('change', () => {
  state.ordem = el.ordem.value;
  state.page = 1;
  load();
});

el.logout.addEventListener('click', logout);

// ── Início ───────────────────────────────────────────────────────────

el.search.value = state.q;
el.ordem.value = state.ordem;
renderChips();
loadCategorias();
load();
