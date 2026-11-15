/* ============================================================================
   Скрипты сайта. Без библиотек.

   Страница обязана полностью работать без этого файла: скрипт добавляет
   удобство, но не создаёт содержимое и ничего не прячет навсегда. Без него
   всё видно сразу, экраны листаются пальцем, меню — просто список ссылок.

   Обработчиков прокрутки нет: только IntersectionObserver, который браузер
   считает сам и не на каждом кадре.
   ========================================================================= */

'use strict';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- Меню на узком экране --------------------------------------------- */

function initMenu() {
  const burger = document.querySelector('.burger');
  const nav = document.getElementById('nav');
  if (!burger || !nav) return;

  const setOpen = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('is-open', open);
  };

  burger.addEventListener('click', () => {
    setOpen(burger.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      burger.focus();
    }
  });
  window.matchMedia('(min-width: 821px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}

/* --- Затемнение под шапкой ---------------------------------------------
   Невидимая метка в самом верху страницы: ушла из вида — значит, под
   шапкой уже есть содержимое. */

function initHeader() {
  const header = document.getElementById('header');
  if (!header || !('IntersectionObserver' in window)) return;
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;';
  document.body.prepend(sentinel);
  new IntersectionObserver(([entry]) => {
    header.classList.toggle('is-scrolled', !entry.isIntersecting);
  }).observe(sentinel);
}

/* --- Проявление предметов при прокрутке --------------------------------
   Только то, что ниже первого экрана в момент загрузки: уже видимое не
   прячем, иначе оно мигнёт. Срабатывает один раз. */

function initUnveil() {
  if (REDUCED || !('IntersectionObserver' in window)) return;
  const items = [...document.querySelectorAll('.unveil')]
    .filter((el) => el.getBoundingClientRect().top > window.innerHeight);
  if (!items.length) return;

  items.forEach((el) => el.classList.add('is-pending'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-done');
      el.classList.remove('is-pending');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  items.forEach((el) => io.observe(el));
}

/* --- Вкладки с лентой ---------------------------------------------------
   Две дороги к одному состоянию: нажать вкладку или пролистнуть ленту.
   Лента — источник правды: вкладка подсвечивается по тому, какой экран
   сейчас в ленте, поэтому они не могут разойтись даже посреди жеста. */

function initTabs(root) {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const track = root.querySelector('.tabs__track');
  const panels = [...root.querySelectorAll('[role="tabpanel"]')];
  if (!tabs.length || !track || tabs.length !== panels.length) return;

  const select = (i) => {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p, j) => p.toggleAttribute('inert', i !== j));
  };

  const go = (i) => {
    select(i);
    track.scrollTo({ left: panels[i].offsetLeft - track.offsetLeft, behavior: REDUCED ? 'auto' : 'smooth' });
    // Активная вкладка не должна уезжать за край узкого списка.
    tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => go(i));
    tab.addEventListener('keydown', (e) => {
      const last = tabs.length - 1;
      let next = null;
      if (e.key === 'ArrowRight') next = i === last ? 0 : i + 1;
      if (e.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = last;
      if (next === null) return;
      e.preventDefault();
      go(next);
      tabs[next].focus();
    });
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio > 0.6) select(panels.indexOf(entry.target));
      });
    }, { root: track, threshold: [0.6] });
    panels.forEach((p) => io.observe(p));
  }

  select(0);
}

/* --- Запуск ------------------------------------------------------------ */

initMenu();
initHeader();
initUnveil();
document.querySelectorAll('[data-tabs]').forEach(initTabs);
