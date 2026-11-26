/* Crystal Books — rendering & interaction */
(function () {
  'use strict';

  var DATA = window.BOOK_DATA || [];
  var CATS = window.CATEGORIES || [];
  var list = document.getElementById('series-list');
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

  var byName = {};
  DATA.forEach(function (s) { byName[s.name] = s; });

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
    return '' +
      '<section class="series reveal" id="series-' + n + '" data-name="' + esc(s.name) + '" data-index="' + n + '" style="--accent:' + esc(s.theme) + '">' +
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

  function interlude(src, quote, cite) {
    return '<section class="interlude" style="background-image:url(\'' + src + '\')">' +
      '<div><blockquote>' + quote + '</blockquote><cite>' + cite + '</cite></div></section>';
  }

  function render() {
    var html = '';
    var gi = 0;

    CATS.forEach(function (cat, ci) {
      var items = DATA.filter(function (s) { return s.cat === cat.id; });
      if (!items.length) return;

      html += '<section class="category" id="cat-' + cat.id + '" data-cat="' + cat.id + '" style="--cat:' + esc(cat.color) + '">';
      html += '<div class="cat-head reveal">' +
        '<p class="cat-kicker">CATEGORY ' + pad(ci + 1) + '</p>' +
        '<h2>' + esc(cat.name) + '</h2>' +
        '<p class="cat-desc">' + esc(cat.desc) + '</p>' +
        '</div>';
      html += '<div class="cat-series">';
      items.forEach(function (s) { html += seriesHTML(s, gi); gi++; });
      html += '</div></section>';

      if (cat.id === 'ai') {
        html += interlude('assets/band-2.jpg', '把一件事从头讲起，<br>不跳步。', 'CRYSTAL BOOKS · 序');
      }
      if (cat.id === 'software') {
        html += interlude('assets/band-1.jpg', '先讲清楚为什么，<br>再讲怎么做。', 'CRYSTAL BOOKS · 约');
      }
    });

    list.innerHTML = html;

    catIndex.innerHTML = CATS.map(function (c, i) {
      return '<a class="cat-card" href="#cat-' + c.id + '" style="--c:' + esc(c.color) + '">' +
        '<span class="no">' + pad(i + 1) + '</span>' +
        '<b>' + esc(c.name) + '</b>' +
        '<p>' + esc(c.desc) + '</p></a>';
    }).join('');

    chips.innerHTML = CATS.map(function (c, i) {
      return '<a class="chip" href="#cat-' + c.id + '" data-i="' + i + '">' + esc(c.name) + '</a>';
    }).join('');
  }

  render();

  var categories = Array.prototype.slice.call(list.querySelectorAll('.category'));
  var chipEls = Array.prototype.slice.call(chips.querySelectorAll('.chip'));

  /* ---- scroll reveal ---- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });

    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var idx = categories.indexOf(e.target);
        chipEls.forEach(function (c, k) { c.classList.toggle('active', k === idx); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    categories.forEach(function (c) { navIO.observe(c); });
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
    nav.classList.toggle('show', y > 46);
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

  /* ---- search ---- */
  function normalize(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' '); }

  function filter() {
    var q = normalize(input.value.trim());
    document.body.classList.toggle('searching', !!q);
    var total = 0;
    var seriesEls = list.querySelectorAll('.series');

    seriesEls.forEach(function (sec) {
      var s = byName[sec.getAttribute('data-name')];
      if (!s) return;
      var seriesHit = q && normalize(s.name + ' ' + s.subtitle).indexOf(q) >= 0;
      var cat = CATS.filter(function (c) { return c.id === s.cat; })[0];
      if (!seriesHit && q && cat && normalize(cat.name).indexOf(q) >= 0) seriesHit = true;
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

    categories.forEach(function (catEl) {
      var any = Array.prototype.some.call(catEl.querySelectorAll('.series'), function (sec) {
        return !sec.classList.contains('is-filtered');
      });
      catEl.classList.toggle('is-filtered', !!q && !any);
    });

    list.querySelectorAll('.interlude').forEach(function (el) {
      el.classList.toggle('is-filtered', !!q);
    });
    catIndex.classList.toggle('is-filtered', !!q);
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

  chips.addEventListener('click', function (e) {
    var a = e.target.closest('.chip');
    if (!a) return;
    chipEls.forEach(function (c) { c.classList.remove('active'); });
    a.classList.add('active');
  });
})();
