/* Crystal Books — 渲染与交互 */
(function () {
  'use strict';

  var DATA = window.BOOK_DATA || [];
  var CATS = window.CATEGORIES || [];
  var PAGE = window.PAGE || { mode: 'home', cat: '' };

  var nav = document.getElementById('nav');
  var chips = document.getElementById('chips');
  var root = document.getElementById('series-list');
  var rail = document.getElementById('rail');
  var catHero = document.getElementById('cat-hero');
  var catRows = document.getElementById('cat-rows');
  var allList = document.getElementById('all-series-list');
  var allNote = document.getElementById('all-note');
  var stats = document.getElementById('hero-stats');
  var note = document.getElementById('search-note');
  var empty = document.getElementById('empty');
  var input = document.getElementById('q');
  var toTop = document.getElementById('to-top');
  var catMain = document.querySelector('.cat-main');

  var ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
  var ICON_EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function bgUrl(p) {
    if (!p) return 'none';
    try { return "url('" + new URL(p, window.location.href).href + "')"; }
    catch (e) { return "url('" + p + "')"; }
  }

  var catById = {};
  CATS.forEach(function (c) { catById[c.id] = c; });

  /* ---------- 公共：分类导航 ---------- */

  function renderChips() {
    if (!chips) return;
    chips.innerHTML = CATS.map(function (c) {
      var cls = 'chip' + (PAGE.cat === c.id ? ' active' : '');
      return '<a class="' + cls + '" href="' + esc(c.id) + '.html">' + esc(c.name) + '</a>';
    }).join('');
  }

  /* ---------- 首页 ---------- */

  function totals() {
    var books = 0, pages = 0;
    DATA.forEach(function (s) { books += s.books.length; pages += s.pages || 0; });
    return { series: DATA.length, books: books, pages: pages, cats: CATS.length };
  }

  function renderStats() {
    if (!stats) return;
    var t = totals();
    stats.innerHTML =
      '<div><dt>系列</dt><dd>' + num(t.series) + '<small>SERIES</small></dd></div>' +
      '<div><dt>册数</dt><dd>' + num(t.books) + '<small>VOLUMES</small></dd></div>' +
      '<div><dt>篇幅</dt><dd>' + num(t.pages) + '<small>PAGES</small></dd></div>' +
      '<div><dt>类目</dt><dd>' + num(t.cats) + '<small>FIELDS</small></dd></div>';
  }

  function renderHome() {
    if (catRows) {
      catRows.innerHTML = CATS.map(function (c, i) {
        var items = DATA.filter(function (s) { return s.cat === c.id; });
        var count = 0;
        items.forEach(function (s) { count += s.books.length; });
        var seriesLine = items.map(function (s, k) {
          return '<span class="sx">' + esc(s.name) + '</span>' + (k === 5 && items.length > 6 ? '<span class="more">+' + (items.length - 6) + '</span>' : '');
        }).join('');
        return '<a class="cat-row reveal" href="' + esc(c.id) + '.html" style="--c:' + esc(c.color) + '">' +
          '<span class="cat-num">' + pad(i + 1) + '</span>' +
          '<div class="cat-body-inner">' +
            '<h3 class="cat-name">' + esc(c.name) + '</h3>' +
            '<p class="cat-desc">' + esc(c.desc) + '</p>' +
            '<p class="cat-series-line">' + seriesLine + '</p>' +
          '</div>' +
          '<div class="cat-thumb"><img src="' + esc(c.bg) + '" alt="" loading="lazy">' +
            '<span class="cat-go" aria-hidden="true">' + ICON_ARROW + '</span></div>' +
          '<span class="sr-only">' + esc(c.name) + '，' + items.length + ' 个系列 ' + count + ' 册</span>' +
          '</a>';
      }).join('');
    }

    if (allList) {
      allList.innerHTML = CATS.map(function (c) {
        var items = DATA.filter(function (s) { return s.cat === c.id; });
        var lis = items.map(function (s, i) {
          return '<li class="all-item"><a href="' + esc(c.id) + '.html#s' + pad(i + 1) + '" style="--c:' + esc(c.color) + '">' +
            '<span class="n">' + pad(i + 1) + '</span>' +
            '<span class="t">' + esc(s.name) + '</span>' +
            '<span class="c">' + s.books.length + ' 册</span></a></li>';
        }).join('');
        return '<div class="all-group" style="--c:' + esc(c.color) + '">' +
          '<h3><i></i>' + esc(c.name) + '<em>' + pad(items.length) + ' SERIES</em></h3>' +
          '<ul>' + lis + '</ul></div>';
      }).join('');
    }

    if (allNote) {
      var t = totals();
      allNote.textContent = '共 ' + t.series + ' 个系列、' + t.books + ' 册书，按类目列出。点任意一行直接进入该系列的目录。';
    }
  }

  /* ---------- 分类页 ---------- */

  function bookCard(b, j, accent) {
    var cover = '<div class="book-cover"><span class="no">' + pad(j + 1) + '</span><span class="mark" aria-hidden="true"></span></div>';
    var meta = b.pages ? '<span>' + num(b.pages) + ' 页</span>' : (b.chapters ? '<span>' + b.chapters + ' 章</span>' : '');
    if (b.available) {
      return '<a class="book" data-j="' + j + '" href="' + esc(b.url) + '" target="_blank" rel="noopener" style="--accent:' + esc(accent) + '">' +
        cover +
        '<div class="book-body">' +
          '<h3 class="book-title">' + esc(b.title) + '</h3>' +
          (b.one ? '<p class="book-one">' + esc(b.one) + '</p>' : '') +
          '<div class="book-foot">' + meta +
            '<span class="go">阅读 ' + ICON_EXT + '</span>' +
          '</div>' +
        '</div>' +
        '</a>';
    }
    return '<div class="book is-soon" data-j="' + j + '" style="--accent:' + esc(accent) + '">' +
      cover +
      '<div class="book-body">' +
        '<h3 class="book-title">' + esc(b.title) + '</h3>' +
        (b.one ? '<p class="book-one">' + esc(b.one) + '</p>' : '') +
        '<div class="book-foot"><span>待发布</span></div>' +
      '</div>' +
      '</div>';
  }

  function seriesHTML(s, i) {
    var n = pad(i + 1);
    var accent = s.theme || '#a4742a';
    var cards = s.books.map(function (b, j) { return bookCard(b, j, accent); }).join('');
    var enter = s.available && s.site
      ? '<a class="enter" href="' + esc(s.site + '#/README') + '" target="_blank" rel="noopener">进入系列 ' + ICON_EXT + '</a>'
      : '<span class="enter is-soon">整理中</span>';
    var paras = s.intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    return '' +
      '<section class="series reveal" id="s' + n + '" data-name="' + esc(s.name) + '" style="--accent:' + esc(accent) + '">' +
        '<header class="series-head">' +
          '<div>' +
            '<p class="series-kicker"><span class="dot"></span>SERIES ' + n +
              '<span class="sep"></span>' + s.books.length + ' 册' +
              (s.pages ? '<span class="sep"></span>' + num(s.pages) + ' 页' : '') +
              (s.available ? '' : '<span class="soon">· 整理中</span>') +
            '</p>' +
            '<h2>' + esc(s.name) + '</h2>' +
            '<p class="sub">' + esc(s.subtitle) + '</p>' +
          '</div>' +
          enter +
        '</header>' +
        '<div class="series-intro">' + paras + '</div>' +
        '<div class="books">' + cards + '</div>' +
      '</section>';
  }

  function renderCategory() {
    var cat = catById[PAGE.cat];
    if (!cat) return;
    var items = DATA.filter(function (s) { return s.cat === cat.id; });

    if (catHero) {
      catHero.style.setProperty('--catbg', bgUrl(cat.bg));
      catHero.style.setProperty('--c', cat.color);
      var books = 0, pages = 0;
      items.forEach(function (s) { books += s.books.length; pages += s.pages || 0; });
      catHero.innerHTML = '<div class="wrap">' +
        '<p class="cat-kicker">CATEGORY ' + pad(CATS.indexOf(cat) + 1) + ' · 目录</p>' +
        '<h1>' + esc(cat.name) + '</h1>' +
        '<p class="cat-desc">' + esc(cat.desc) + '</p>' +
        '<p class="cat-meta">' +
          '<span><b>' + items.length + '</b> 个系列</span>' +
          '<span><b>' + books + '</b> 册书</span>' +
          (pages ? '<span><b>' + num(pages) + '</b> 页</span>' : '') +
        '</p>' +
        '</div>';
    }

    if (rail) {
      rail.innerHTML = '<p class="rail-title">目录 · ' + items.length + '</p>' +
        '<ol>' + items.map(function (s, i) {
          return '<li class="rail-item" data-id="s' + pad(i + 1) + '" style="--c:' + esc(s.theme) + '">' +
            '<a href="#s' + pad(i + 1) + '"><span class="n">' + pad(i + 1) + '</span>' +
            '<span class="t"><span class="full">' + esc(s.name) + '</span><span class="short">' + esc(s.chip || s.name) + '</span>' +
            (s.available ? '' : '<span class="soon">· 整理中</span>') + '</span>' +
            '<span class="cnt">' + s.books.length + '</span></a>' +
            '</li>';
        }).join('') + '</ol>' +
        '<p class="rail-foot">CRYSTAL BOOKS</p>';
    }

    if (root) {
      var others = CATS.filter(function (c) { return c.id !== cat.id; });
      var next = '<nav class="next" aria-label="其他分类">' +
        '<p class="next-head">继续浏览 · OTHER FIELDS</p>' +
        '<div class="next-grid">' +
        others.map(function (c) {
          var n = DATA.filter(function (x) { return x.cat === c.id; }).length;
          return '<a class="next-card" href="' + esc(c.id) + '.html" style="--c:' + esc(c.color) + '">' +
            '<span>' + esc(c.name) + '</span><em>' + n + ' SERIES →</em></a>';
        }).join('') +
        '</div></nav>';
      root.innerHTML = items.map(function (s, i) { return seriesHTML(s, i); }).join('') + next;
      sections = Array.prototype.slice.call(root.querySelectorAll('.series'));
    }
  }

  function renderFooter() {
    var links = document.querySelector('.footer-links');
    if (!links) return;
    var row = document.createElement('nav');
    row.className = 'footer-cats';
    row.setAttribute('aria-label', '分类');
    row.innerHTML = '<b>分类</b>' + CATS.map(function (c) {
      return '<a href="' + esc(c.id) + '.html"' + (PAGE.cat === c.id ? ' class="on"' : '') + '>' + esc(c.name) + '</a>';
    }).join('');
    links.parentNode.insertBefore(row, links);
  }

  /* ---------- 启动 ---------- */

  renderChips();
  renderFooter();
  if (PAGE.mode === 'home') renderHome(); else renderCategory();
  renderStats();

  /* ---------- 入场动画 ---------- */

  function observeReveal() {
    var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.04, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }
  observeReveal();

  /* ---------- 顶栏 / 进度 / 视差 ---------- */

  var heroMedia = document.querySelector('.hero-media');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ticking = false;

  function onScroll() {
    ticking = false;
    var y = window.scrollY || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle('show', PAGE.mode === 'category' || y > 40);
    if (toTop) toTop.classList.toggle('show', y > 700);
    if (heroMedia && !reduced) {
      heroMedia.style.transform = 'translate3d(0,' + Math.min(y * 0.14, 140) + 'px,0)';
    }
    spy(y);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 目录 scrollspy ---------- */

  var railItems = rail ? Array.prototype.slice.call(rail.querySelectorAll('.rail-item')) : [];
  var sections = root ? Array.prototype.slice.call(root.querySelectorAll('.series')) : [];
  var activeId = '';
  if (sections.length) setActive(sections[0].id);

  function setActive(id) {
    if (id === activeId || !railItems || !railItems.length) return;
    activeId = id;
    railItems.forEach(function (li) {
      li.classList.toggle('active', li.getAttribute('data-id') === id);
    });
    if (rail && rail.scrollWidth > rail.clientWidth + 4) {
      var cur = rail.querySelector('.rail-item.active');
      if (cur) {
        var rr = rail.getBoundingClientRect();
        var cr = cur.getBoundingClientRect();
        if (cr.left < rr.left + 8 || cr.right > rr.right - 8) {
          rail.scrollTo({ left: rail.scrollLeft + (cr.left - rr.left) - 40, behavior: 'smooth' });
        }
      }
    }
  }

  function spy(y) {
    if (!sections || !sections.length) return;
    var line = y + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 66) + 90;
    var cur = sections[0].id;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= line) cur = sections[i].id;
      else break;
    }
    setActive(cur);
  }

  /* ---------- 搜索 ---------- */

  if (!input || !root) return;

  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' '); }

  var searchIndex = DATA.map(function (s) {
    return {
      name: s.name,
      seriesHit: norm(s.name + ' ' + s.subtitle + ' ' + s.intro.join(' ')),
      books: s.books.map(function (b) { return norm(b.title + ' ' + b.one); })
    };
  });

  function filter() {
    var q = norm(input.value.trim());
    var total = 0;
    var shownSeries = 0;

    sections.forEach(function (sec) {
      var i = +sec.id.slice(1) - 1;
      var idx = searchIndex[i];
      if (!idx) return;
      var seriesHit = q && idx.seriesHit.indexOf(q) >= 0;
      var visible = 0;
      sec.querySelectorAll('.book').forEach(function (el) {
        var j = +el.getAttribute('data-j');
        var hit = !q || seriesHit || (idx.books[j] || '').indexOf(q) >= 0;
        el.classList.toggle('is-filtered', !hit);
        if (hit) visible++;
      });
      var hide = !!q && visible === 0;
      sec.classList.toggle('is-filtered', hide);
      if (!hide) shownSeries++;
      total += visible;
    });

    railItems.forEach(function (li) {
      var id = li.getAttribute('data-id');
      var sec = document.getElementById(id);
      li.style.display = sec && sec.classList.contains('is-filtered') ? 'none' : '';
    });

    if (note) note.textContent = q ? '“' + input.value.trim() + '” · ' + total + ' 册 / ' + shownSeries + ' 个系列' : '';
    var railTitle = rail && rail.querySelector('.rail-title');
    if (railTitle) railTitle.textContent = q ? '搜索结果 · ' + shownSeries : '目录 · ' + sections.length;
    if (empty) empty.classList.toggle('show', !!q && total === 0);
    if (root) root.style.display = q && total === 0 ? 'none' : '';
    document.body.classList.toggle('searching', !!q);
  }

  var searchBox = input.closest('.search');
  if (searchBox) {
    input.addEventListener('focus', function () { searchBox.classList.add('open'); });
    input.addEventListener('blur', function () {
      if (!input.value) searchBox.classList.remove('open');
    });
  }

  input.addEventListener('input', filter);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { input.value = ''; filter(); input.blur(); }
  });
  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault();
      if (nav) nav.classList.add('show');
      input.focus();
    }
  });

  if (input.value) filter();
})();
