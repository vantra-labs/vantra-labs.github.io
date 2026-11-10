/* VANTRA v2. Без библиотек. Страница полностью читается и без этого файла:
   сборка акта стоит в финальном состоянии, поле Clarify — обычное поле. */
'use strict';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- Сборка акта: пункт карточки отмечается → его место в акте подсвечивается. */
function initAssembly() {
  const stage = document.querySelector('.assembly');
  if (!stage) return;
  const items = [...stage.querySelectorAll('.card li')];
  const step = 0.42;
  items.forEach((li, i) => {
    const d = 0.35 + i * step;
    li.style.setProperty('--d', d + 's');
    li.querySelector('.tick').style.setProperty('--d', d + 's');
    const hl = stage.querySelector(`.hl[data-k="${li.dataset.k}"]`);
    if (hl) hl.style.setProperty('--d', d + 0.12 + 's');
  });
  const end = 0.35 + items.length * step;
  stage.querySelector('.hl.warn')?.style.setProperty('--d', end + 0.2 + 's');
  stage.querySelector('.n-date')?.style.setProperty('--d', end + 0.35 + 's');
  stage.querySelector('.n-ready')?.style.setProperty('--d', end + 0.9 + 's');

  if (REDUCED || !('IntersectionObserver' in window)) { stage.classList.add('play'); return; }
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { stage.classList.add('play'); io.disconnect(); }
  }, { threshold: 0.2 });
  io.observe(stage);
}

/* --- Clarify: тот же разбор фразы, что в приложении, только упрощённый. --- */
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const DAYS = { 'понедельник': 1, 'вторник': 2, 'среду': 3, 'среда': 3, 'четверг': 4, 'пятницу': 5, 'пятница': 5, 'субботу': 6, 'суббота': 6, 'воскресенье': 0 };
const SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function fmt(d, rel) {
  if (rel) return rel;
  return `${SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function parse(text) {
  let s = ' ' + text.toLowerCase() + ' ';
  const out = {};
  const now = new Date();
  const cut = (re) => { s = s.replace(re, ' '); };

  const tags = [...s.matchAll(/#([\p{L}\d_-]+)/gu)].map((m) => m[1]);
  if (tags.length) { out.tags = tags; cut(/#[\p{L}\d_-]+/gu); }

  let m = s.match(/\s(?:в|к)\s(\d{1,2})(?::(\d{2}))?(?=\s)/);
  if (m && +m[1] < 24 && (!m[2] || +m[2] < 60)) { out.time = `${m[1].padStart(2, '0')}:${m[2] || '00'}`; cut(m[0]); }

  m = s.match(/\s(сегодня|завтра|послезавтра)(?=\s)/);
  if (m) {
    const add = { 'сегодня': 0, 'завтра': 1, 'послезавтра': 2 }[m[1]];
    const d = new Date(now); d.setDate(d.getDate() + add);
    out.date = fmt(d, m[1]); cut(m[0]);
  } else if ((m = s.match(/\s(?:в|во)\s(понедельник|вторник|среду|среда|четверг|пятницу|пятница|субботу|суббота|воскресенье)(?=\s)/))) {
    const d = new Date(now); let add = (DAYS[m[1]] - d.getDay() + 7) % 7; if (!add) add = 7;
    d.setDate(d.getDate() + add); out.date = fmt(d); cut(m[0]);
  } else if ((m = s.match(new RegExp(`\\s(\\d{1,2})\\s(${MONTHS.join('|')})(?=\\s)`)))) {
    const d = new Date(now.getFullYear(), MONTHS.indexOf(m[2]), +m[1]);
    if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setFullYear(d.getFullYear() + 1);
    out.date = fmt(d); cut(m[0]);
  }
  const title = s.replace(/\s+/g, ' ').trim();
  out.title = title ? title[0].toUpperCase() + title.slice(1) : '';
  return out;
}

function initSay() {
  const input = document.getElementById('say');
  const box = document.getElementById('chips');
  if (!input || !box) return;
  const chip = (label, value, cls = '') => {
    const el = document.createElement('span');
    el.className = 'chip ' + cls;
    el.innerHTML = label ? `<i>${label}</i>` : '';
    el.append(value);
    return el;
  };
  const render = () => {
    const r = parse(input.value);
    box.replaceChildren(
      ...(r.title ? [chip('', r.title, 'title')] : []),
      ...(r.date ? [chip('Дата', r.date)] : []),
      ...(r.time ? [chip('Время', r.time)] : []),
      ...(r.tags || []).map((t) => chip('Метка', '#' + t))
    );
  };
  input.addEventListener('input', render);
  document.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', () => {
    input.value = b.dataset.say; render(); input.focus();
  }));
  render();
}

initAssembly();
initSay();
