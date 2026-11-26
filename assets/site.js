/* Crystal Books — rendering & interaction */
(function () {
  'use strict';

  var DATA = window.BOOK_DATA || [];
  var CATS = window.CATEGORIES || [];
  var PAGE = window.PAGE || { mode: 'home', cat: '' };

  var root = document.getElementById('series-list');
  var catHero = document.getElementById('cat-hero');
  var catIndex = document.getElementById('cat-index');
  var chips = document.getElementById('chips');
  var note = document.getElementById('search-note');
  var empty = document.getElementById('empty');
  var input = document.getElementById('q');

  var ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
  var ICON_EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function bgUrl(p) {
    try { return "url('" + new URL(p, window.location.href).href + "')"; }
    catch (e) { return "url('" + p + "')"; }
  }

  function bookCard(b, j) {
    var top = '<div class="book-top"><span class="bnum">' + pad(j + 1) + '</span>' +
      (b.available ? '' : '<span class="badge">待发布</span>') + '</div>';
    var main = '<h3>' + esc(b.title) + '</h3>' +
      (b.one ? '<p>' + esc(b.one) + '</p>' : '');
    var foot = '<div class="book-foot">' +
      (b.available ? '<span class="go">在线阅读 ' + ICON_ARROW + '</span>' : '') + '</div>';
    var cls = 'book' + (b.available ? '' : ' is-soon');
    if (b.available) {
      return '<a class="' + cls + '" href="' + esc(b.url) + '" target="_blank" rel="noopener" data-i="' + j + '">' +
        top + main + foot + '</a>';
    }
    return '<div class="' + cls + '" data-i="' + j + '">' + top + main + foot + '</div>';
  }

  function seriesHTML(s, i) {
    var n = pad(i + 1);
    var cards = s.books.map(bookCard).join('');
    var enter = s.available && s.site
      ? '<a class="enter" href="' + esc(s.site + '#/README') + '" target="_blank" rel="noopener">进入系列 ' + ICON_EXT + '</a>'
      : '<span class="enter is-soon">待发布</span>';
    var paras = s.intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    var bg = s.bg ? ";--series-bg:" + bgUrl(s.bg) : '';
    return '' +
      '<section class="series reveal" id="series-' + n + '" data-name="' + esc(s.name) + '" data-index="' + n + '" style="--accent:' + esc(s.theme) + bg + '">' +
        '<div class="series-head">' +
          '<div class="series-title">' +
            '<p class="kicker">SERIES ' + n + (s.available ? '' : ' · 整理中') + '</p>' +
            '<h2>' + esc(s.name) + '</h2>' +
            '<p class="sub">' + esc(s.subtitle) + '</p>' +
          '</div>' +
          enter +
        '</div>' +
        '<div class="series-body">' +
          '<div class="desc">' + paras + '</div>' +
          '<div class="books">' + cards + '</div>' +
        '</div>' +
      '</section>';
  }

  function renderChips() {
    chips.innerHTML = CATS.map(function (c) {
      var cls = 'chip' + (PAGE.cat === c.id ? ' active' : '');
      return '<a class="' + cls + '" href="' + esc(c.id) + '.html">' + esc(c.name) + '</a>';
    }).join('');
  }

  function renderHome() {
    if (!catIndex) return;
    catIndex.innerHTML = CATS.map(function (c, i) {
      return '<a class="cat-card reveal" href="' + esc(c.id) + '.html" style="--c:' + esc(c.color) + '">' +
        '<span class="no">' + pad(i + 1) + '</span>' +
        '<b>' + esc(c.name) + '</b>' +
        '<p>' + esc(c.desc) + '</p>' +
        '<span class="cat-go">查看书目 ' + ICON_ARROW + '</span></a>';
    }).join('');
  }

  function renderCategory() {
    var idx = -1;
    CATS.forEach(function (c, i) { if (c.id === PAGE.cat) idx = i; });
    if (idx < 0) return;
    var cat = CATS[idx];
    var items = DATA.filter(function (s) { return s.cat === cat.id; });

    if (catHero) {
      catHero.style.setProperty('--catbg', bgUrl(cat.bg));
      catHero.innerHTML = '<div class="wrap">' +
        '<p class="cat-kicker">CATEGORY ' + pad(idx + 1) + '</p>' +
        '<h1>' + esc(cat.name) + '</h1>' +
        '<p class="cat-desc">' + esc(cat.desc) + '</p>' +
        '<a class="back" href="index.html">← 全部分类</a>' +
        '</div>';
    }

    if (root) {
      root.innerHTML = items.map(function (s) {
        return seriesHTML(s, DATA.indexOf(s));
      }).join('');
    }
  }

  renderChips();
  if (PAGE.mode === 'home') {
    renderHome();
  } else {
    renderCategory();
  }

  /* ---- reveal ---- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- nav / top button ---- */
  var nav = document.getElementById('nav');
  var toTop = document.getElementById('to-top');
  var heroBg = document.querySelector('.hero-bg');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    nav.classList.toggle('show', PAGE.mode === 'category' || y > 46);
    toTop.classList.toggle('show', y > 720);
    if (heroBg && !reduced) {
      heroBg.style.transform = 'translate3d(0,' + Math.min(y * 0.16, 180) + 'px,0) scale(1.04)';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ---- search (category pages) ---- */
  if (!input || !root) return;

  function normalize(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' '); }

  function filter() {
    var q = normalize(input.value.trim());
    var total = 0;
    root.querySelectorAll('.series').forEach(function (sec) {
      var name = sec.getAttribute('data-name');
      var s = DATA.filter(function (x) { return x.name === name; })[0];
      if (!s) return;
      var seriesHit = q && normalize(s.name + ' ' + s.subtitle).indexOf(q) >= 0;
      var visible = 0;
      sec.querySelectorAll('.book').forEach(function (el) {
        var b = s.books[+el.getAttribute('data-i')];
        var hit = !q || seriesHit || normalize(b.title + ' ' + b.one).indexOf(q) >= 0;
        el.classList.toggle('is-filtered', !hit);
        if (hit) visible++;
      });
      sec.classList.toggle('is-filtered', !!q && visible === 0);
      total += visible;
    });
    note.textContent = q ? '找到 ' + total + ' 个结果' : '';
    empty.classList.toggle('show', !!q && total === 0);
  }

  input.addEventListener('input', filter);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { input.value = ''; filter(); input.blur(); }
  });
  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault(); nav.classList.add('show'); input.focus();
    }
  });
})();
