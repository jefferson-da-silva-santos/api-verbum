import { apiFetch, logout } from './api.js';
import { BIBLE_BOOKS, getBookBySlug } from './books.js';

// ── Estado ──────────────────────────────────────────────────────────

const TABS = [
  { key: 'PENDENTE', label: 'Pendentes' },
  { key: 'ARQUIVADA', label: 'Arquivadas' },
  { key: 'PUBLICADA', label: 'Publicadas' },
  { key: 'REJEITADA', label: 'Rejeitadas' },
  { key: '', label: 'Todas' },
];

const state = {
  status: 'PENDENTE',
  q: '',
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  items: [],
  selected: new Set(),
  editingPergunta: null,
  referencias: [],
  palavrasChave: [],
};

let searchDebounce = null;

// ── Elementos ───────────────────────────────────────────────────────

const el = {
  tabs: document.getElementById('tabs'),
  searchInput: document.getElementById('search-input'),
  selectAll: document.getElementById('select-all'),
  bulkBar: document.getElementById('bulk-bar'),
  bulkCount: document.getElementById('bulk-count'),
  bulkArquivarBtn: document.getElementById('bulk-arquivar-btn'),
  bulkExcluirBtn: document.getElementById('bulk-excluir-btn'),
  listContainer: document.getElementById('list-container'),
  pagination: document.getElementById('pagination'),
  pageInfo: document.getElementById('page-info'),
  prevPageBtn: document.getElementById('prev-page-btn'),
  nextPageBtn: document.getElementById('next-page-btn'),
  logoutBtn: document.getElementById('logout-btn'),

  panelOverlay: document.getElementById('panel-overlay'),
  sidePanel: document.getElementById('side-panel'),
  panelCloseBtn: document.getElementById('panel-close-btn'),
  panelPerguntaTexto: document.getElementById('panel-pergunta-texto'),
  panelPerguntaMeta: document.getElementById('panel-pergunta-meta'),
  panelCategoria: document.getElementById('panel-categoria'),
  palavraChaveInput: document.getElementById('palavras-chave-input'),
  palavraChaveField: document.getElementById('palavra-chave-field'),
  panelResposta: document.getElementById('panel-resposta'),
  panelContador: document.getElementById('panel-contador'),
  panelPreview: document.getElementById('panel-preview'),
  panelPreviewText: document.getElementById('panel-preview-text'),
  previewToggleBtns: document.querySelectorAll('.preview-toggle button'),
  refLivro: document.getElementById('ref-livro'),
  refCapitulo: document.getElementById('ref-capitulo'),
  refVersiculo: document.getElementById('ref-versiculo'),
  refDisplay: document.getElementById('ref-display'),
  refAddBtn: document.getElementById('ref-add-btn'),
  refList: document.getElementById('ref-list'),
  panelArquivarBtn: document.getElementById('panel-arquivar-btn'),
  panelPublicarBtn: document.getElementById('panel-publicar-btn'),

  confirmOverlay: document.getElementById('confirm-overlay'),
  confirmTitle: document.getElementById('confirm-title'),
  confirmMessage: document.getElementById('confirm-message'),
  confirmCancelBtn: document.getElementById('confirm-cancel-btn'),
  confirmOkBtn: document.getElementById('confirm-ok-btn'),

  toast: document.getElementById('toast'),
};

// ── Utilitários de UI ───────────────────────────────────────────────

function showToast(message, type = 'success') {
  el.toast.textContent = message;
  el.toast.className = `toast visible toast-${type}`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.toast.className = 'toast'; }, 3200);
}

function confirmAction(title, message) {
  el.confirmTitle.textContent = title;
  el.confirmMessage.textContent = message;
  el.confirmOverlay.classList.add('visible');

  return new Promise((resolve) => {
    const cleanup = (result) => {
      el.confirmOverlay.classList.remove('visible');
      el.confirmOkBtn.removeEventListener('click', onOk);
      el.confirmCancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    };
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    el.confirmOkBtn.addEventListener('click', onOk);
    el.confirmCancelBtn.addEventListener('click', onCancel);
  });
}

function relativeDate(iso) {
  if (!iso) return '';
  const data = new Date(iso);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ── Tabs ────────────────────────────────────────────────────────────

function renderTabs() {
  el.tabs.innerHTML = TABS.map((tab) => `
    <button type="button" class="tab ${tab.key === state.status ? 'active' : ''}" data-status="${tab.key}">
      ${tab.label}
    </button>
  `).join('');

  el.tabs.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.status = btn.dataset.status;
      state.page = 1;
      state.selected.clear();
      renderTabs();
      loadList();
    });
  });
}

// ── Lista ───────────────────────────────────────────────────────────

async function loadList() {
  el.listContainer.innerHTML = '<div class="loading-state">Carregando...</div>';
  el.pagination.style.display = 'none';

  const params = new URLSearchParams({ page: String(state.page), limit: String(state.limit) });
  if (state.status) params.set('status', state.status);
  if (state.q) params.set('q', state.q);

  try {
    const { data, meta } = await apiFetch(`/admin/perguntas?${params.toString()}`);
    state.items = data;
    state.total = meta.total;
    state.totalPages = meta.totalPages;
    renderList();
    renderPagination();
  } catch (err) {
    el.listContainer.innerHTML = `<div class="empty-state">Erro ao carregar: ${escapeHtml(err.message)}</div>`;
  }
}

function renderList() {
  if (!state.items.length) {
    el.listContainer.innerHTML = '<div class="empty-state">Nenhuma pergunta encontrada por aqui.</div>';
    updateBulkBar();
    return;
  }

  el.listContainer.innerHTML = `<div class="list">${state.items.map(renderCard).join('')}</div>`;

  el.listContainer.querySelectorAll('[data-select-id]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const id = Number(cb.dataset.selectId);
      if (cb.checked) state.selected.add(id); else state.selected.delete(id);
      updateBulkBar();
    });
  });

  el.listContainer.querySelectorAll('[data-action="responder"]').forEach((btn) => {
    btn.addEventListener('click', () => openEditor(state.items.find((p) => p.id === Number(btn.dataset.id))));
  });

  el.listContainer.querySelectorAll('[data-action="arquivar"]').forEach((btn) => {
    btn.addEventListener('click', () => arquivarIds([Number(btn.dataset.id)]));
  });

  el.listContainer.querySelectorAll('[data-action="excluir"]').forEach((btn) => {
    btn.addEventListener('click', () => excluirIds([Number(btn.dataset.id)]));
  });

  updateBulkBar();
}

function renderCard(pergunta) {
  const checked = state.selected.has(pergunta.id) ? 'checked' : '';
  const respostaPreview = pergunta.resposta
    ? `<p class="card-answer-preview">${escapeHtml(pergunta.resposta)}</p>`
    : '<p class="card-answer-preview" style="font-style: italic;">Ainda sem resposta.</p>';

  return `
    <div class="card">
      <input type="checkbox" data-select-id="${pergunta.id}" ${checked} />
      <div class="card-body">
        <div class="card-head">
          <span class="badge badge-${pergunta.status}">${pergunta.status}</span>
          <span class="card-meta">#${pergunta.id} · ${escapeHtml(pergunta.autorPergunta || 'anônimo')} · ${relativeDate(pergunta.createdAt)}</span>
        </div>
        <p class="card-question">${escapeHtml(pergunta.pergunta)}</p>
        ${respostaPreview}
        <div class="card-actions">
          <button class="btn btn-primary btn-sm" data-action="responder" data-id="${pergunta.id}" type="button">Responder</button>
          ${pergunta.status !== 'ARQUIVADA' ? `<button class="btn btn-secondary btn-sm" data-action="arquivar" data-id="${pergunta.id}" type="button">Arquivar</button>` : ''}
          <button class="btn btn-ghost btn-sm" data-action="excluir" data-id="${pergunta.id}" type="button">Excluir</button>
        </div>
      </div>
    </div>
  `;
}

function renderPagination() {
  if (state.totalPages <= 1) { el.pagination.style.display = 'none'; return; }
  el.pagination.style.display = 'flex';
  el.pageInfo.textContent = `Página ${state.page} de ${state.totalPages} · ${state.total} no total`;
  el.prevPageBtn.disabled = state.page <= 1;
  el.nextPageBtn.disabled = state.page >= state.totalPages;
}

function updateBulkBar() {
  const n = state.selected.size;
  el.bulkBar.classList.toggle('visible', n > 0);
  el.bulkCount.textContent = `${n} selecionada${n === 1 ? '' : 's'}`;

  const idsNaPagina = state.items.map((p) => p.id);
  const todasSelecionadas = idsNaPagina.length > 0 && idsNaPagina.every((id) => state.selected.has(id));
  el.selectAll.checked = todasSelecionadas;
}

// ── Ações em lote / individuais ─────────────────────────────────────

async function arquivarIds(ids) {
  try {
    await apiFetch('/admin/perguntas/arquivar', { method: 'PATCH', body: JSON.stringify({ ids }) });
    showToast(`${ids.length} pergunta(s) arquivada(s).`);
    ids.forEach((id) => state.selected.delete(id));
    await loadList();
  } catch (err) {
    showToast(err.message || 'Erro ao arquivar.', 'error');
  }
}

async function excluirIds(ids) {
  const ok = await confirmAction(
    'Excluir pergunta(s)?',
    `Isso vai apagar ${ids.length === 1 ? 'essa pergunta' : `essas ${ids.length} perguntas`} permanentemente, junto com comentários, reações e favoritos ligados a ela. Essa ação não pode ser desfeita.`,
  );
  if (!ok) return;

  try {
    await apiFetch('/admin/perguntas', { method: 'DELETE', body: JSON.stringify({ ids }) });
    showToast(`${ids.length} pergunta(s) excluída(s).`);
    ids.forEach((id) => state.selected.delete(id));
    await loadList();
  } catch (err) {
    showToast(err.message || 'Erro ao excluir.', 'error');
  }
}

// ── Painel de resposta ───────────────────────────────────────────────

function populateBookSelect() {
  const grupos = { OT: [], NT: [] };
  BIBLE_BOOKS.forEach((b) => grupos[b.testament].push(b));

  const optGroup = (label, books) => `
    <optgroup label="${label}">
      ${books.map((b) => `<option value="${b.slug}">${b.name} (${b.abbr})</option>`).join('')}
    </optgroup>
  `;

  el.refLivro.innerHTML = optGroup('Antigo Testamento', grupos.OT) + optGroup('Novo Testamento', grupos.NT);
}

function suggestDisplay() {
  const book = getBookBySlug(el.refLivro.value);
  if (!book) return;
  const cap = el.refCapitulo.value;
  const vers = el.refVersiculo.value;
  if (!cap) return;
  el.refDisplay.value = vers ? `${book.abbr} ${cap}.${vers}` : `${book.abbr} ${cap}`;
}

function renderRefList() {
  if (!state.referencias.length) {
    el.refList.innerHTML = '<p class="hint">Nenhuma referência adicionada ainda.</p>';
    return;
  }
  el.refList.innerHTML = state.referencias.map((r, i) => `
    <span class="chip">${escapeHtml(r.display)}<button type="button" data-remove-ref="${i}">×</button></span>
  `).join('');

  el.refList.querySelectorAll('[data-remove-ref]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.referencias.splice(Number(btn.dataset.removeRef), 1);
      renderRefList();
    });
  });
}

function renderPalavrasChave() {
  el.palavraChaveInput.querySelectorAll('.chip').forEach((c) => c.remove());
  state.palavrasChave.forEach((kw, i) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `${escapeHtml(kw)}<button type="button" data-remove-kw="${i}">×</button>`;
    el.palavraChaveInput.insertBefore(chip, el.palavraChaveField);
  });
  el.palavraChaveInput.querySelectorAll('[data-remove-kw]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.palavrasChave.splice(Number(btn.dataset.removeKw), 1);
      renderPalavrasChave();
    });
  });
}

function updatePreview() {
  el.panelPreviewText.textContent = el.panelResposta.value || '(sem conteúdo ainda)';
  const n = el.panelResposta.value.length;
  el.panelContador.textContent = `${n} caractere${n === 1 ? '' : 's'}`;
}

function openEditor(pergunta) {
  if (!pergunta) return;
  state.editingPergunta = pergunta;
  state.referencias = (pergunta.referencias || []).map((r) => ({
    display: r.display, bookSlug: r.bookSlug, chapter: r.chapter, verse: r.verse ?? undefined,
  }));
  state.palavrasChave = [...(pergunta.palavrasChave || [])];

  el.panelPerguntaTexto.textContent = pergunta.pergunta;
  el.panelPerguntaMeta.textContent = `${pergunta.autorPergunta || 'Anônimo'} · ${relativeDate(pergunta.createdAt)}`;
  el.panelCategoria.value = pergunta.categoria || '';
  el.panelResposta.value = pergunta.resposta || '';

  el.refCapitulo.value = '';
  el.refVersiculo.value = '';
  el.refDisplay.value = '';

  renderRefList();
  renderPalavrasChave();
  updatePreview();
  setPreviewMode('editar');

  el.panelOverlay.classList.add('visible');
  el.sidePanel.classList.add('visible');
}

function closeEditor() {
  el.panelOverlay.classList.remove('visible');
  el.sidePanel.classList.remove('visible');
  state.editingPergunta = null;
}

function setPreviewMode(mode) {
  el.previewToggleBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  el.panelResposta.style.display = mode === 'editar' ? 'block' : 'none';
  el.panelPreview.style.display = mode === 'preview' ? 'block' : 'none';
  if (mode === 'preview') updatePreview();
}

async function salvarResposta(novoStatus) {
  const resposta = el.panelResposta.value.trim();
  if (!resposta) {
    showToast('Escreva uma resposta antes de salvar.', 'error');
    setPreviewMode('editar');
    el.panelResposta.focus();
    return;
  }

  const payload = {
    resposta,
    categoria: el.panelCategoria.value.trim() || null,
    palavrasChave: state.palavrasChave,
    referencias: state.referencias,
    status: novoStatus,
  };

  const btns = [el.panelArquivarBtn, el.panelPublicarBtn];
  btns.forEach((b) => { b.disabled = true; });

  try {
    await apiFetch(`/perguntas/${state.editingPergunta.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    showToast(novoStatus === 'PUBLICADA' ? 'Pergunta publicada!' : 'Salvo e arquivado para depois.');
    closeEditor();
    await loadList();
  } catch (err) {
    showToast(err.message || 'Erro ao salvar.', 'error');
  } finally {
    btns.forEach((b) => { b.disabled = false; });
  }
}

// ── Eventos ─────────────────────────────────────────────────────────

el.logoutBtn.addEventListener('click', logout);

el.searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.q = el.searchInput.value.trim();
    state.page = 1;
    loadList();
  }, 350);
});

el.selectAll.addEventListener('change', () => {
  if (el.selectAll.checked) {
    state.items.forEach((p) => state.selected.add(p.id));
  } else {
    state.items.forEach((p) => state.selected.delete(p.id));
  }
  renderList();
});

el.bulkArquivarBtn.addEventListener('click', () => arquivarIds([...state.selected]));
el.bulkExcluirBtn.addEventListener('click', () => excluirIds([...state.selected]));

el.prevPageBtn.addEventListener('click', () => { if (state.page > 1) { state.page -= 1; loadList(); } });
el.nextPageBtn.addEventListener('click', () => { if (state.page < state.totalPages) { state.page += 1; loadList(); } });

el.panelCloseBtn.addEventListener('click', closeEditor);
el.panelOverlay.addEventListener('click', closeEditor);

el.previewToggleBtns.forEach((btn) => btn.addEventListener('click', () => setPreviewMode(btn.dataset.mode)));
el.panelResposta.addEventListener('input', updatePreview);

el.refLivro.addEventListener('change', suggestDisplay);
el.refCapitulo.addEventListener('input', suggestDisplay);
el.refVersiculo.addEventListener('input', suggestDisplay);

el.refAddBtn.addEventListener('click', () => {
  const bookSlug = el.refLivro.value;
  const book = getBookBySlug(bookSlug);
  const chapter = Number(el.refCapitulo.value);
  const verseRaw = el.refVersiculo.value;
  const display = el.refDisplay.value.trim();

  if (!book || !chapter || chapter < 1 || chapter > book.chapters) {
    showToast(`Informe um capítulo válido para ${book ? book.name : 'o livro escolhido'} (1 a ${book ? book.chapters : '?'}).`, 'error');
    return;
  }
  if (!display) {
    showToast('O texto de exibição da referência não pode ficar vazio.', 'error');
    return;
  }

  state.referencias.push({
    display,
    bookSlug,
    chapter,
    verse: verseRaw ? Number(verseRaw) : undefined,
  });

  el.refCapitulo.value = '';
  el.refVersiculo.value = '';
  el.refDisplay.value = '';
  renderRefList();
});

el.palavraChaveField.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const valor = el.palavraChaveField.value.trim();
    if (valor && !state.palavrasChave.includes(valor)) {
      state.palavrasChave.push(valor);
      renderPalavrasChave();
    }
    el.palavraChaveField.value = '';
  }
});

el.panelArquivarBtn.addEventListener('click', () => salvarResposta('ARQUIVADA'));
el.panelPublicarBtn.addEventListener('click', () => salvarResposta('PUBLICADA'));

// ── Início ──────────────────────────────────────────────────────────

populateBookSelect();
renderTabs();
loadList();
