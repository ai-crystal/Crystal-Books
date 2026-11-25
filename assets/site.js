/* Crystal Books — rendering & interaction */
(function () {
  'use strict';

  var DATA = window.BOOK_DATA || [];
  var list = document.getElementById('series-list');
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

  function bookCard(s, b, j, disabled) {
    var top = '<div class="book-top"><span class="bnum">' + pad(j + 1) + '</span>' +
      (b.available ? '' : '<span class="badge">待发布</span>') + '</div>';
    var main = '<h3>' + esc(b.title) + '</h3>' +
      (b.one ? '<p>' + esc(b.one) + '</p>' : '');
    var foot = '<div class="book-foot"><span>' + b.chapters + ' 章 · ' + b.pages + ' 页</span>' +
      '<span class="go">' + (b.available ? '在线阅读 ' + ICON_ARROW : '') + '</span></div>';
    var cls = 'book' + (b.available ? '' : ' is-soon');
    if (b.available) {
      return '<a class="' + cls + '" href="' + esc(b.url) + '" target="_blank" rel="noopener" data-i="' + j + '">' +
        top + main + foot + '</a>';
    }
    return '<div class="' + cls + '" data-i="' + j + '">' + top + main + foot + '</div>';
  }

  function seriesHTML(s, i) {
    var n = pad(i + 1);
    var cards = s.books.map(function (b, j) { return bookCard(s, b, j, !b.available); }).join('');
    var enter = s.available && s.site
      ? '<a class="enter" href="' + esc(s.site + '#/README') + '" target="_blank" rel="noopener">进入系列 ' + ICON_EXT + '</a>'
      : '<span class="enter is-soon">待发布</span>';
    var paras = s.intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    var gh = s.repo
      ? '<a class="meta-link" href="' + esc(s.repo) + '" target="_blank" rel="noopener">GitHub</a>'
      : '';
    return '' +
      '<section class="series reveal" id="series-' + n + '" data-index="' + n + '" style="--accent:' + esc(s.theme) + '">' +
        '<div class="series-head">' +
          '<div class="series-title">' +
            '<p class="kicker">' + (s.available ? 'SERIES ' + n : 'SERIES ' + n + ' · 整理中') + ' · ' + s.books.length + ' 册</p>' +
            '<h2>' + esc(s.name) + '</h2>' +
            '<p class="sub">' + esc(s.subtitle) + '</p>' +
          '</div>' +
          enter +
        '</div>' +
        '<div class="series-body">' +
          '<div class="desc">' + paras +
            '<div class="meta"><span>' + s.books.length + ' 册</span><span>' + s.pages + ' 页</span>' + gh + '</div>' +
          '</div>' +
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
    DATA.forEach(function (s, i) {
      html += seriesHTML(s, i);
      if (i === 8) {
        html += interlude('assets/interlude-1.jpg', '把复杂的系统讲清楚，<br>让初学者也能走进去。', 'CRYSTAL BOOKS · 序');
      }
      if (i === 14) {
        html += interlude('assets/interlude-2.jpg', '每一个数字都有出处，<br>每一张插图都由代码画出。', 'CRYSTAL BOOKS · 约');
      }
    });
    list.innerHTML = html;

    chips.innerHTML = DATA.map(function (s, i) {
      return '<a class="chip" href="#series-' + pad(i + 1) + '" data-i="' + i + '">' + pad(i + 1) + '　' + esc(s.chip || s.name) + '</a>';
    }).join('');
  }

  render();

  var sections = Array.prototype.slice.call(list.querySelectorAll('.series'));
  var chipEls = Array.prototype.slice.call(chips.querySelectorAll('.chip'));

  /* ---- scroll reveal ---- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });

    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var idx = sections.indexOf(e.target);
        chipEls.forEach(function (c, k) { c.classList.toggle('active', k === idx); });
      });
    }, { rootMargin: '-42% 0px -52% 0px' });
    sections.forEach(function (s) { navIO.observe(s); });
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
    sections.forEach(function (sec, idx) {
      var s = DATA[idx];
      var seriesHit = q && normalize(s.name + ' ' + s.subtitle).indexOf(q) >= 0;
      var visible = 0;
      var cards = sec.querySelectorAll('.book');
      cards.forEach(function (el) {
        var b = s.books[+el.getAttribute('data-i')];
        var hit = !q || seriesHit || normalize(b.title + ' ' + b.one).indexOf(q) >= 0;
        el.classList.toggle('is-filtered', !hit);
        if (hit) visible++;
      });
      sec.classList.toggle('is-filtered', !!q && visible === 0);
      total += visible;
    });
    list.querySelectorAll('.interlude').forEach(function (el) {
      el.classList.toggle('is-filtered', !!q);
    });
    note.textContent = q ? '找到 ' + total + ' 本 / 共 ' + window.BOOK_TOTAL + ' 本' : '';
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
    // let hash navigation handle it; just close any focus state
    chipEls.forEach(function (c) { c.classList.remove('active'); });
    a.classList.add('active');
  });
})();
