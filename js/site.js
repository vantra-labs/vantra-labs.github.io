/* ============================================================================
   Скрипты сайта. Без библиотек.

   Общий принцип: страница обязана быть полностью рабочей без этого файла.
   Скрипт только добавляет удобство — он не создаёт содержимое и ничего не
   прячет навсегда. Если он не загрузился, читается всё, галерея листается
   пальцем и колесом, меню на телефоне остаётся раскрытым списком ссылок.

   Обработчиков прокрутки здесь нет намеренно: они срабатывают на каждом
   кадре и заметно портят плавность на телефоне. Вместо них
   IntersectionObserver, который браузер считает сам.
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
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Меню');
    nav.classList.toggle('is-open', open);
  };

  burger.addEventListener('click', () => {
    setOpen(burger.getAttribute('aria-expanded') !== 'true');
  });

  // Выбрали пункт — меню закрылось, иначе оно перекрывает то, к чему увело.
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      burger.focus();
    }
  });

  // При возврате на широкий экран меню не должно остаться «открытым»:
  // класс на десктопе ничего не делает, но состояние кнопки врало бы
  // программам чтения с экрана.
  window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}

/* --- Линия под шапкой -------------------------------------------------- */

function initHeaderLine() {
  const header = document.getElementById('header');
  if (!header) return;

  // Метка нулевой высоты в самом верху: пока она в кадре, страница не
  // прокручена. Дешевле и точнее, чем считать scrollY на каждом кадре.
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;';
  document.body.prepend(sentinel);

  new IntersectionObserver(
    ([entry]) => header.classList.toggle('is-stuck', !entry.isIntersecting)
  ).observe(sentinel);
}

/* --- Появление блоков при прокрутке ------------------------------------ */

function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  // Выключенные анимации или отсутствие наблюдателя — показываем всё сразу.
  if (REDUCED || !('IntersectionObserver' in window)) return;

  items.forEach((el) => el.classList.add('is-hidden'));

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      // Соседи в одной группе появляются по очереди, а не разом: так глаз
      // успевает пройти по ним, а не получает всё пятно целиком.
      const group = Array.from(el.parentElement.children).filter(
        (n) => n.classList.contains('reveal')
      );
      el.style.setProperty('--reveal-delay', `${group.indexOf(el) * 70}ms`);
      el.classList.remove('is-hidden');
      el.classList.add('is-shown');
      obs.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  items.forEach((el) => io.observe(el));
}

/* --- Галерея ------------------------------------------------------------
   Лента листается средствами браузера. Скрипт добавляет стрелки и точки и
   следит, какой слайд сейчас в центре. Сам он ленту не двигает никогда,
   кроме случая, когда человек нажал стрелку или точку.                    */

function initGallery(root) {
  const track = root.querySelector('[data-track]');
  const slides = Array.from(track.querySelectorAll('.slide'));
  const prev = root.querySelector('[data-prev]');
  const next = root.querySelector('[data-next]');
  const dotsBox = root.querySelector('[data-dots]');
  if (!slides.length) return;

  let current = 0;

  const dots = slides.map((slide, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'gallery__dot';
    // Подпись берём из заголовка слайда: «Слайд 3» не говорит ничего.
    const title = slide.querySelector('.slide__title');
    dot.setAttribute('aria-label', title ? title.textContent.trim() : `Экран ${i + 1}`);
    dot.addEventListener('click', () => scrollToSlide(i));
    dotsBox.appendChild(dot);
    return dot;
  });

  function scrollToSlide(i) {
    const target = slides[Math.max(0, Math.min(i, slides.length - 1))];
    // Считаем смещение внутри ленты сами: scrollIntoView увёл бы и всю
    // страницу вбок или вверх, а нам нужно двигать только ленту.
    const left = target.offsetLeft - (track.clientWidth - target.clientWidth) / 2;
    track.scrollTo({ left, behavior: REDUCED ? 'auto' : 'smooth' });
  }

  function setCurrent(i) {
    current = i;
    dots.forEach((dot, n) => {
      if (n === i) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === slides.length - 1;
  }

  if (prev) prev.addEventListener('click', () => scrollToSlide(current - 1));
  if (next) next.addEventListener('click', () => scrollToSlide(current + 1));

  // Кто сейчас в центре. Порог высокий: слайд считается текущим, когда он
  // действительно занял кадр, а не краем в него заехал.
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setCurrent(slides.indexOf(entry.target));
    });
  }, { root: track, threshold: 0.6 });

  slides.forEach((slide) => io.observe(slide));
  setCurrent(0);

  // Стрелками с клавиатуры, когда лента в фокусе. Браузер и сам умеет
  // прокручивать её стрелками, но по пикселю, а не по слайду.
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollToSlide(current + 1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollToSlide(current - 1); }
  });
}

/* --- Запуск ------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
  initMenu();
  initHeaderLine();
  initReveal();
  document.querySelectorAll('[data-gallery]').forEach(initGallery);
});
