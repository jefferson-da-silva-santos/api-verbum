// Utilitários compartilhados pelas telas "Perguntas & Respostas" (listagem e
// detalhe): formatação, toast, guarda de login e — o principal — o renderizador
// que transforma o texto puro da resposta em HTML estruturado (parágrafos,
// listas, subtítulos e referências bíblicas destacadas).
import { isAuthenticated } from './api.js';
import { BIBLE_BOOKS } from './books.js';

export const STATUS_LABELS = {
  PUBLICADA: 'Publicada',
  PENDENTE: 'Pendente',
  ARQUIVADA: 'Arquivada',
  REJEITADA: 'Rejeitada',
};

export function requireAuth() {
  if (!isAuthenticated()) {
    window.location.replace('/admin/index.html');
    return false;
  }
  return true;
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function formatDate(iso, { withTime = false } = {}) {
  if (!iso) return '—';
  const opts = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return new Date(iso).toLocaleDateString('pt-BR', opts);
}

export function plural(n, singular, pluralForm = `${singular}s`) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

export function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast visible toast-${type}`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.className = 'toast'; }, 3200);
}

// ── Busca: destaque do termo ─────────────────────────────────────────

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Escapa o texto e envolve as ocorrências de `q` em <mark>.
export function highlight(text, q) {
  const safe = escapeHtml(text);
  if (!q) return safe;
  const re = new RegExp(escapeRegExp(escapeHtml(q)), 'gi');
  return safe.replace(re, (m) => `<mark>${m}</mark>`);
}

// Prévia de uma linha só (sem quebras). Se houver busca e o termo estiver
// longe do início, a prévia começa perto dele — assim o admin vê POR QUE
// aquela pergunta apareceu no resultado.
export function answerSnippet(resposta, q, max = 320) {
  const flat = String(resposta || '').replace(/\s+/g, ' ').trim();
  if (!flat) return '';
  let start = 0;
  if (q) {
    const idx = flat.toLowerCase().indexOf(q.toLowerCase());
    if (idx > 140) start = Math.max(0, flat.lastIndexOf(' ', idx - 60) + 1);
  }
  let snippet = flat.slice(start, start + max);
  if (start + max < flat.length) snippet = snippet.replace(/\s+\S*$/, '') + '…';
  if (start > 0) snippet = `…${snippet}`;
  return snippet;
}

export function readingStats(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return { words, minutes };
}

// ── Referências bíblicas no texto ────────────────────────────────────
// As respostas citam referências inline, ex: "(Mt 6.16-18; 9.14,15; Lc 2.37)".
// Reconhecemos "Livro cap.vers" pelas abreviações oficiais (books.js) e também
// as continuações sem livro ("; 9.14,15") logo depois de uma referência.

const BOOK_BY_ABBR = new Map(BIBLE_BOOKS.map((b) => [b.abbr, b]));
// "1Tm" também aparece escrito "1 Tm" — o espaço depois do número é opcional
const ABBR_ALT = [...BOOK_BY_ABBR.keys()]
  .sort((a, b) => b.length - a.length)
  .map((abbr) => escapeRegExp(abbr).replace(/^(\d)/, '$1\\s?'))
  .join('|');

// capítulo, opcionalmente .versículo(s): "5", "5.12", "6.16-18", "4.1-3,11", "1:5,8"
const VERSES = '\\d{1,3}[a-c]?(?:\\s?[-–]\\s?\\d{1,3}[a-c]?)?(?:,\\s?\\d{1,3}[a-c]?(?:\\s?[-–]\\s?\\d{1,3}[a-c]?)?)*';
const CHV = `\\d{1,3}(?:[.:]${VERSES})?`;
const CHV_WITH_VERSE = `\\d{1,3}[.:]${VERSES}`;

const BOOK_REF_RE = new RegExp(`(?<![\\p{L}\\d])(${ABBR_ALT})\\s?(${CHV})(?![\\p{L}\\d])`, 'gu');
const CONT_REF_RE = new RegExp(`(\\s*;\\s*)(${CHV_WITH_VERSE})(?![\\p{L}\\d.:])`, 'uy');

function refSpan(book, label, cv) {
  return `<span class="ref" data-slug="${book.slug}" title="${escapeHtml(`${book.name} ${cv}`)}">${escapeHtml(label)}</span>`;
}

// Recebe texto puro e devolve HTML seguro com as referências destacadas.
export function linkifyRefs(text) {
  let out = '';
  let last = 0;
  BOOK_REF_RE.lastIndex = 0;

  let m;
  while ((m = BOOK_REF_RE.exec(text))) {
    // Só capítulo ("Sl 119") pode colidir com texto comum ("Os 3 homens"):
    // nesse caso exigimos contexto de citação — parênteses, ";" ou "cf.".
    if (!/[.:]/.test(m[2])) {
      const before = text.slice(0, m.index).trimEnd();
      const after = text.slice(m.index + m[0].length).trimStart();
      const citado = /[(;,]$|cf\.$|\bver$/i.test(before) || /^[);,]/.test(after);
      if (!citado) { BOOK_REF_RE.lastIndex = m.index + 1; continue; }
    }

    const book = BOOK_BY_ABBR.get(m[1].replace(/\s/g, ''));
    out += escapeHtml(text.slice(last, m.index));
    out += refSpan(book, m[0], m[2]);
    last = m.index + m[0].length;

    // continuações: "; 9.14,15; 13.2" herdam o livro anterior
    CONT_REF_RE.lastIndex = last;
    let c;
    while ((c = CONT_REF_RE.exec(text))) {
      out += escapeHtml(c[1]) + refSpan(book, c[2], c[2]);
      last = CONT_REF_RE.lastIndex;
    }
    BOOK_REF_RE.lastIndex = last;
  }

  out += escapeHtml(text.slice(last));
  return out;
}

// ── Estrutura da resposta ────────────────────────────────────────────

const ORDERED_RE = /^(\d{1,3}|[a-z])([.)])\s+(.+)$/u; // "1. ", "1) ", "01) ", "a) "
const BULLET_RE = /^[-•*–]\s+(.+)$/u;

function isAllCaps(line) {
  const letters = line.replace(/[^\p{L}]/gu, '');
  return letters.length >= 4 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
}

// Classifica cada linha em um bloco: heading | item | paragraph.
function classify(line) {
  const ordered = line.match(ORDERED_RE);
  if (ordered) {
    const [, marker, sep, body] = ordered;
    // "1. QUANTO À SEPARAÇÃO..." → subtítulo numerado
    // "02) O ARREBATAMENTO (Vinda de Cristo)" → também, se começa em caixa alta
    const comecaEmCaixaAlta = /^(?:\p{Lu}{1,3}\s+)?\p{Lu}{4,}(?![\p{Ll}])/u.test(body);
    if ((isAllCaps(body) && body.length < 140) || (comecaEmCaixaAlta && body.length < 100)) {
      return { type: 'heading', text: `${marker}${sep} ${body}` };
    }
    // "a)" só vale como item se o marcador for uma letra só e vier com ")"
    if (/^[a-z]$/.test(marker) && sep !== ')') return { type: 'paragraph', text: line };
    return { type: 'item', kind: 'ordered', marker: `${marker}${sep}`, text: body };
  }

  const bullet = line.match(BULLET_RE);
  if (bullet) return { type: 'item', kind: 'bullet', marker: '•', text: bullet[1] };

  if (line.length < 140 && isAllCaps(line)) return { type: 'heading', text: line };
  if (line.length < 80 && line.endsWith(':') && !/[.;!?]\s/.test(line)) return { type: 'heading', text: line.replace(/:$/, ''), subtle: true };

  return { type: 'paragraph', text: line };
}

// Converte o texto puro (quebras de linha = parágrafos, como o app exibe) em
// blocos estruturados. Devolve { html, headings } — headings alimentam o
// sumário das respostas longas.
export function renderAnswer(resposta) {
  const lines = String(resposta || '')
    .replace(/ /g, ' ')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const blocks = lines.map(classify);
  const headings = [];
  let html = '';
  let i = 0;

  while (i < blocks.length) {
    const b = blocks[i];

    if (b.type === 'item') {
      let items = '';
      const kind = b.kind;
      while (i < blocks.length && blocks[i].type === 'item' && blocks[i].kind === kind) {
        const it = blocks[i];
        items += `<li><span class="ans-marker">${escapeHtml(it.marker)}</span><div>${linkifyRefs(it.text)}</div></li>`;
        i += 1;
      }
      html += `<ul class="ans-list ans-list-${kind}">${items}</ul>`;
      continue;
    }

    if (b.type === 'heading') {
      const id = `secao-${headings.length + 1}`;
      headings.push({ id, text: b.text });
      html += `<h3 class="ans-heading${b.subtle ? ' ans-heading-subtle' : ''}" id="${id}">${linkifyRefs(b.text)}</h3>`;
      i += 1;
      continue;
    }

    const isLead = i === 0;
    html += `<p${isLead ? ' class="ans-lead"' : ''}>${linkifyRefs(b.text)}</p>`;
    i += 1;
  }

  return { html, headings };
}
