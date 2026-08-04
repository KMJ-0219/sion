// ============================================================
//  SION — 공통 유틸리티 & Supabase 클라이언트
// ============================================================

const SION = (() => {

  // ── Supabase ──────────────────────────────
  const SB_URL = 'https://cszwasbxeczeocmdifqj.supabase.co';
  const SB_KEY = 'sb_publishable_oyd1ya6arSUwFLhHxC4ixQ_BNJ9WpVn';

  async function db(path, opts = {}) {
    const url = `${SB_URL}/rest/v1/${path}`;
    const headers = {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || '',
      ...opts.headers
    };
    delete opts.headers;
    delete opts.prefer;
    const res = await fetch(url, { ...opts, headers });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`DB ${res.status}: ${msg}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  const select = (table, query = '') => db(`${table}?${query}`);
  const insert = (table, body) => db(table, {
    method: 'POST', prefer: 'return=representation',
    body: JSON.stringify(body)
  });
  const update = (table, match, body) => db(`${table}?${match}`, {
    method: 'PATCH', prefer: 'return=representation',
    body: JSON.stringify(body)
  });
  const remove = (table, match) => db(`${table}?${match}`, { method: 'DELETE' });
  const rpc = (fn, body) => db(`rpc/${fn}`, {
    method: 'POST', prefer: '',
    body: JSON.stringify(body)
  });

  // ── 날짜 유틸 ─────────────────────────────
  const DAYS = ['일','월','화','수','목','금','토'];
  const pad  = n => String(n).padStart(2,'0');

  function now() { return new Date(); }

  function toDate(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function parseDate(s) {
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d);
  }

  function toISO(d) {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function fmtDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())}`;
  }

  function dday(dateStr) {
    const t = parseDate(dateStr);
    const n = new Date(); n.setHours(0,0,0,0);
    const diff = Math.round((t - n) / 86400000);
    if (diff === 0)  return { label: 'D-Day', cls: 'today' };
    if (diff > 0)    return { label: `D-${diff}`, cls: diff <= 3 ? 'soon' : '' };
    return { label: `D+${Math.abs(diff)}`, cls: 'past' };
  }

  function fromDatetimeLocal(v) {
    if (!v) return null;
    return new Date(v);
  }

  function toDatetimeLocal(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ── 문자열 유틸 ───────────────────────────
  function esc(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── 토스트 ────────────────────────────────
  function toast(msg, type = 'info', duration = 3000) {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      document.body.appendChild(c);
    }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', info: '·' };
    t.innerHTML = `<span style="color:var(--${type==='success'?'green':type==='error'?'red':'ac'})">${icons[type]||'·'}</span><span>${esc(msg)}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(() => t.remove(), 300); }, duration);
  }

  // ── 사이드바 토글 ─────────────────────────
  function initSidebar() {
    const sb = document.getElementById('sidebar');
    const ct = document.getElementById('content');
    const btn = document.getElementById('sidebarToggle');
    const key = 'sion_sidebar_collapsed';
    if (!sb) return;

    if (localStorage.getItem(key) === '1') {
      sb.classList.add('collapsed');
      ct && ct.classList.add('expanded');
    }
    btn && btn.addEventListener('click', () => {
      const c = sb.classList.toggle('collapsed');
      ct && ct.classList.toggle('expanded', c);
      localStorage.setItem(key, c ? '1' : '0');
    });

    document.addEventListener('click', e => {
      document.querySelectorAll('.dropdown-menu.open').forEach(m => {
        if (!m.closest('.dropdown')?.contains(e.target)) m.classList.remove('open');
      });
    });
  }

  // ── 모달 ─────────────────────────────────
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('open');
    m.addEventListener('click', e => { if (e.target === m) closeModal(id); }, { once: true });
  }
  function closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
    }
  });

  // ── 카테고리 뱃지 HTML ────────────────────
  function catBadge(cat) {
    const safe = esc(cat || '기타');
    const cls  = ['과제','수행','시험','약속'].includes(cat) ? cat : '기타';
    return `<span class="badge badge-${cls}">${safe}</span>`;
  }

  // ── 로딩 스피너 ───────────────────────────
  function spinner(size = 16) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="animation:spin 0.8s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><style>@keyframes spin{to{transform:rotate(360deg)}}</style></svg>`;
  }

  // ── debounce ─────────────────────────────
  function debounce(fn, ms = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  return {
    db: { select, insert, update, remove, rpc },
    date: { now, toDate, parseDate, toISO, fmtDateTime, fmtDate, dday, fromDatetimeLocal, toDatetimeLocal },
    ui: { toast, initSidebar, openModal, closeModal, catBadge, spinner },
    util: { esc, debounce, pad }
  };

})();
