import { apiFetch, logout } from './api.js';
import { getBookBySlug } from './books.js';
import {
  requireAuth, escapeHtml, formatDate, plural, showToast, renderAnswer, readingStats, STATUS_LABELS,
} from './ui.js';

// Página de leitura de uma pergunta: resposta estruturada (parágrafos, listas,
// subtítulos, referências destacadas) + painel lateral com referências,
// palavras-chave, engajamento e metadados. Editar leva ao painel de moderação.

requireAuth();

const root = document.getElementById('detail-root');
const backLink = document.getElementById('back-link');
document.getElementById('logout-btn').addEventListener('click', logout);

// "Voltar" para a listagem com a busca, os filtros e a página que o admin
// estava usando. A listagem salva a própria URL no sessionStorage ao abrir um
// card (não dá pra usar document.referrer: o helmet manda no-referrer). Se
// viemos direto dela, usamos o histórico, que também restaura a rolagem.
let veioDaLista = false;
try {
  const urlLista = sessionStorage.getItem('verbum_lista_url');
  if (urlLista) backLink.href = urlLista;
  veioDaLista = sessionStorage.getItem('verbum_veio_da_lista') === '1';
  sessionStorage.removeItem('verbum_veio_da_lista');
} catch { /* storage indisponível: fica o link padrão */ }

backLink.addEventListener('click', (e) => {
  if (veioDaLista && window.history.length > 1) {
    e.preventDefault();
    window.history.back();
  }
});

const COPY_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const EDIT_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

// ── Blocos do painel lateral ─────────────────────────────────────────

function renderReferencias(referencias) {
  // o dataset importado tem referências repetidas — mostra cada uma uma vez
  const vistas = new Set();
  const unicas = (referencias || []).filter((r) => {
    const key = `${r.bookSlug}|${r.chapter}|${r.verse ?? ''}|${r.display}`;
    if (vistas.has(key)) return false;
    vistas.add(key);
    return true;
  });

  if (!unicas.length) return '<p class="muted">Nenhuma referência cadastrada.</p>';

  // Agrupa por livro (na ordem em que aparecem): "Salmos — 117.2 · 146.1 · 147.1".
  // O display pode vir com o livro ("Sl 117.2") ou sem ("146.1"); na linha só
  // mostramos capítulo/versículo, já que o livro é o título da linha.
  const grupos = new Map();
  unicas.forEach((r) => {
    if (!grupos.has(r.bookSlug)) grupos.set(r.bookSlug, []);
    const semLivro = r.display.match(/^(?:\d\s?)?\p{L}+\.?\s+(\d.*)$/u);
    grupos.get(r.bookSlug).push(semLivro ? semLivro[1] : r.display);
  });

  return `<div class="ref-rows">${[...grupos].map(([slug, cvs]) => {
    const book = getBookBySlug(slug);
    return `
      <div class="ref-row">
        <span class="book">${escapeHtml(book ? book.name : slug)}</span>
        <span class="cv">${cvs.map(escapeHtml).join('<span class="sep"> · </span>')}</span>
      </div>`;
  }).join('')}</div>`;
}

function renderEngajamento(p) {
  const ok = p.reacoes?.ESCLARECIDA ?? 0;
  const doubt = p.reacoes?.DUVIDA ?? 0;
  const total = ok + doubt;
  const pctOk = total ? Math.round((ok / total) * 100) : 0;

  const reacoes = total
    ? `
      <div class="reaction-bar" role="img" aria-label="${pctOk}% esclarecidas">
        <span class="ok" style="width:${pctOk}%"></span>
        <span class="doubt" style="width:${100 - pctOk}%"></span>
      </div>
      <div class="reaction-legend">
        <span><i style="background:var(--success)"></i>Esclarecida · <b>${ok}</b></span>
        <span><i style="background:var(--warn)"></i>Ainda com dúvida · <b>${doubt}</b></span>
      </div>`
    : '<p class="muted" style="margin-bottom:14px">Ninguém reagiu a esta resposta ainda.</p>';

  const c = p._count || {};
  return `
    ${reacoes}
    <div class="stat-grid">
      <div class="stat"><b>${c.comentarios ?? 0}</b><span>comentários</span></div>
      <div class="stat"><b>${c.favoritos ?? 0}</b><span>favoritos</span></div>
      <div class="stat"><b>${c.leituras ?? 0}</b><span>leituras</span></div>
    </div>`;
}

function renderToc(headings) {
  if (headings.length < 3) return '';
  return `
    <section class="panel">
      <div class="section-label">Nesta resposta</div>
      <nav class="toc">${headings.map((h) => `<a href="#${h.id}">${escapeHtml(h.text)}</a>`).join('')}</nav>
    </section>`;
}

function renderComentarios(p) {
  const lista = p.comentarios || [];
  const total = p._count?.comentarios ?? lista.length;
  if (!total) return '';

  const extra = total > lista.length ? `<p class="muted" style="padding:12px 18px">Mostrando os ${lista.length} mais recentes de ${total}.</p>` : '';

  return `
    <section class="comments">
      <h2>Comentários (${total})</h2>
      <div class="panel">
        ${lista.map((c) => `
          <div class="comment">
            <div class="comment-head">
              <strong>${escapeHtml(c.autor || 'Anônimo')}</strong>
              <span>${formatDate(c.createdAt, { withTime: true })}</span>
            </div>
            <p>${escapeHtml(c.texto)}</p>
          </div>`).join('')}
        ${extra}
      </div>
    </section>`;
}

// ── Página ───────────────────────────────────────────────────────────

function render(p) {
  document.title = `#${p.id} · ${p.pergunta.slice(0, 60)} — Verbum Admin`;

  const { html, headings } = renderAnswer(p.resposta);
  const { words, minutes } = readingStats(p.resposta);
  const editarHref = `/admin/dashboard.html?editar=${p.id}`;
  const foiEditada = p.updatedAt && Math.abs(new Date(p.updatedAt) - new Date(p.createdAt)) > 60_000;

  const answer = p.resposta
    ? `
      <div class="answer-toolbar">
        <div class="section-label">Resposta</div>
        <div class="answer-toolbar-right">
          <span class="reading">${words.toLocaleString('pt-BR')} palavras · ${minutes} min de leitura</span>
          <button class="btn btn-ghost btn-sm" id="copy-btn" type="button">${COPY_ICON}Copiar</button>
        </div>
      </div>
      <article class="answer-body">${html}</article>`
    : `
      <div class="answer-empty">
        <p>Esta pergunta ainda não foi respondida.</p>
        <a class="btn btn-primary" href="${editarHref}">${EDIT_ICON}Responder agora</a>
      </div>`;

  const kws = (p.palavrasChave || []).length
    ? `<div class="kw-list">${p.palavrasChave.map((k) => `<span class="kw">${escapeHtml(k)}</span>`).join('')}</div>`
    : '<p class="muted">Nenhuma palavra-chave.</p>';

  root.innerHTML = `
    <header class="detail-hero">
      <div class="qa-card-head">
        <span class="qa-id">#${p.id}</span>
        <span class="badge badge-${p.status}">${STATUS_LABELS[p.status] || p.status}</span>
        ${p.categoria ? `<span class="pill-cat">${escapeHtml(p.categoria)}</span>` : ''}
      </div>
      <h1>${escapeHtml(p.pergunta)}</h1>
      <div class="detail-meta">
        <span>Enviada por <strong>${escapeHtml(p.autorPergunta || 'autor desconhecido')}</strong></span>
        <span>·</span>
        <span>${formatDate(p.createdAt)}</span>
        ${foiEditada ? `<span>·</span><span>atualizada em ${formatDate(p.updatedAt)}</span>` : ''}
      </div>
    </header>

    <div class="detail-grid">
      <div>
        <section class="panel answer-panel">${answer}</section>
        ${renderComentarios(p)}
      </div>

      <aside class="side">
        <section class="panel side-actions">
          <a class="btn btn-primary btn-block" href="${editarHref}">${EDIT_ICON}${p.resposta ? 'Editar resposta' : 'Responder'}</a>
        </section>

        ${renderToc(headings)}

        <section class="panel">
          <div class="section-label">Referências bíblicas</div>
          ${renderReferencias(p.referencias)}
        </section>

        <section class="panel">
          <div class="section-label">Palavras-chave</div>
          ${kws}
        </section>

        <section class="panel">
          <div class="section-label">Engajamento no app</div>
          ${renderEngajamento(p)}
        </section>

        <section class="panel">
          <div class="section-label">Detalhes</div>
          <dl class="meta-list">
            <dt>ID</dt><dd>#${p.id}</dd>
            <dt>Status</dt><dd>${STATUS_LABELS[p.status] || p.status}</dd>
            <dt>Categoria</dt><dd>${escapeHtml(p.categoria || '—')}</dd>
            <dt>Autor</dt><dd>${escapeHtml(p.autorPergunta || '—')}</dd>
            <dt>Criada em</dt><dd>${formatDate(p.createdAt, { withTime: true })}</dd>
            <dt>Atualizada em</dt><dd>${formatDate(p.updatedAt, { withTime: true })}</dd>
          </dl>
        </section>
      </aside>
    </div>
  `;

  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(`${p.pergunta}\n\n${p.resposta}`);
        showToast('Pergunta e resposta copiadas.');
      } catch {
        showToast('Não foi possível copiar.', 'error');
      }
    });
  }
}

function renderError(title, message) {
  root.innerHTML = `
    <div class="panel detail-error">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
      <a class="btn btn-secondary" href="/admin/perguntas.html">Ver todas as perguntas</a>
    </div>`;
}

async function init() {
  const raw = new URLSearchParams(window.location.search).get('id');
  const id = Number(raw);
  // cuidado: ids começam em 0 (perguntas importadas), então "sem id" não pode virar 0
  if (raw === null || raw.trim() === '' || !Number.isInteger(id) || id < 0) {
    renderError('Pergunta não informada', 'O link está incompleto — volte para a listagem e escolha uma pergunta.');
    return;
  }

  try {
    const { data } = await apiFetch(`/admin/perguntas/${id}`);
    render(data);
  } catch (err) {
    if (err.status === 404) renderError('Pergunta não encontrada', `Não existe pergunta com o id #${id}. Ela pode ter sido excluída.`);
    else renderError('Erro ao carregar', err.message);
  }
}

init();
