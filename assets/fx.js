/* Crystal Books — 轻量渲染特效
   预算：不引外部素材，全部程序生成；canvas 限 30fps、DPR ≤ 1.5；
   只做 transform / opacity 合成，尊重 prefers-reduced-motion。 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  /* ---------- 背景浓度（淡 / 中 / 浓） ---------- */
  var VEIL_KEY = 'cb-veil';
  var veilState = 'mid';
  try {
    var savedVeil = localStorage.getItem(VEIL_KEY);
    if (savedVeil === 'light' || savedVeil === 'mid' || savedVeil === 'strong') veilState = savedVeil;
  } catch (e) {}
  document.documentElement.setAttribute('data-veil', veilState);

  var veilBtns = document.querySelectorAll('.veil-switch button');
  function paintVeil() {
    Array.prototype.forEach.call(veilBtns, function (b) {
      b.classList.toggle('on', b.getAttribute('data-veil') === veilState);
    });
  }
  paintVeil();
  Array.prototype.forEach.call(veilBtns, function (b) {
    b.addEventListener('click', function () {
      veilState = b.getAttribute('data-veil');
      document.documentElement.setAttribute('data-veil', veilState);
      paintVeil();
      try { localStorage.setItem(VEIL_KEY, veilState); } catch (e) {}
    });
  });

  /* ---------- 顶部阅读进度 ---------- */
  var bar = document.createElement('div');
  bar.className = 'fx-bar';
  document.body.appendChild(bar);

  /* ---------- 首屏浮尘 / 星座 ---------- */
  var host = document.querySelector('.hero') || document.querySelector('.cat-hero');
  var canvas = null;
  var ctx = null;
  var pts = [];
  var sprites = [];
  var W = 0;
  var H = 0;
  var raf = 0;
  var last = 0;
  var live = false;
  var pointer = { x: -999, y: -999 };

  function sprite(r, g, b) {
    var c = document.createElement('canvas');
    var R = 8;
    c.width = c.height = R * 2;
    var x = c.getContext('2d');
    var grd = x.createRadialGradient(R, R, 0, R, R, R);
    grd.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',.95)');
    grd.addColorStop(.38, 'rgba(' + r + ',' + g + ',' + b + ',.36)');
    grd.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    x.fillStyle = grd;
    x.fillRect(0, 0, R * 2, R * 2);
    return c;
  }

  function seed() {
    var rect = host.getBoundingClientRect();
    W = Math.max(320, Math.round(rect.width));
    H = Math.max(200, Math.round(rect.height));
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var n = Math.round(Math.min(54, Math.max(16, (W * H) / 26000)));
    pts = [];
    for (var i = 0; i < n; i++) {
      pts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - .5) * .16,
        vy: -(0.04 + Math.random() * .15),
        s: 3 + Math.random() * 5,
        a: .14 + Math.random() * .34,
        w: .003 + Math.random() * .01,
        ph: Math.random() * 6.283,
        c: Math.random() < .3 ? 1 : 0
      });
    }
  }

  function frame(t) {
    raf = 0;
    if (!live) return;
    if (last && t - last < 32) {
      raf = requestAnimationFrame(frame);
      return;
    }
    var dt = last ? Math.min(2.2, (t - last) / 33) : 1;
    last = t;

    ctx.clearRect(0, 0, W, H);

    /* 星座连线 */
    var link2 = 122 * 122;
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      for (var j = i + 1; j < pts.length; j++) {
        var q = pts[j];
        var dx0 = p.x - q.x;
        var dy0 = p.y - q.y;
        if (dx0 * dx0 + dy0 * dy0 < link2) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
        }
      }
    }
    ctx.strokeStyle = 'rgba(92,102,118,.14)';
    ctx.lineWidth = .6;
    ctx.stroke();

    /* 浮尘 */
    for (var k = 0; k < pts.length; k++) {
      var d = pts[k];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.ph += d.w * dt * 3;

      /* 指针轻推 */
      var px = d.x - pointer.x;
      var py = d.y - pointer.y;
      var dd = px * px + py * py;
      if (dd < 11000 && dd > 1) {
        var f = (1 - dd / 11000) * .5 * dt;
        d.x += px * f * .1;
        d.y += py * f * .1;
      }

      if (d.y < -14) { d.y = H + 10; d.x = Math.random() * W; }
      if (d.x < -14) d.x = W + 10;
      else if (d.x > W + 14) d.x = -10;

      ctx.globalAlpha = d.a * (.62 + .38 * Math.sin(d.ph));
      ctx.drawImage(sprites[d.c], d.x - d.s / 2, d.y - d.s / 2, d.s, d.s);
    }
    ctx.globalAlpha = 1;

    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!canvas || raf || reduce.matches) return;
    live = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    live = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  if (host && !reduce.matches && !saveData) {
    canvas = document.createElement('canvas');
    canvas.className = 'fx-stars';
    canvas.setAttribute('aria-hidden', 'true');
    ctx = canvas.getContext('2d', { alpha: true });
    if (ctx) {
      host.appendChild(canvas);
      sprites = [sprite(120, 128, 142), sprite(164, 116, 42)];
      seed();
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) start(); else stop();
        }, { threshold: 0 }).observe(host);
      } else {
        start();
      }
      host.addEventListener('pointermove', function (e) {
        var r = host.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
      }, { passive: true });
      host.addEventListener('pointerleave', function () {
        pointer.x = pointer.y = -999;
      }, { passive: true });
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  /* ---------- 卡片光斑跟随 ---------- */
  if (fine.matches && !reduce.matches) {
    var SPOT = '.book, .cat-card';
    var pending = null;
    var queued = false;

    function flush() {
      queued = false;
      var e = pending;
      pending = null;
      if (!e || !e.target || !e.target.closest) return;
      var el = e.target.closest(SPOT);
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }

    document.addEventListener('pointermove', function (e) {
      pending = e;
      if (!queued) {
        queued = true;
        requestAnimationFrame(flush);
      }
    }, { passive: true });

    /* 书卡微倾斜 */
    Array.prototype.forEach.call(document.querySelectorAll('.book:not(.is-soon)'), function (card) {
      card.addEventListener('pointerenter', function () {
        card.classList.add('is-tilt');
      });
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        if (!r.width) return;
        var px = (e.clientX - r.left) / r.width - .5;
        var py = (e.clientY - r.top) / r.height - .5;
        card.style.transform =
          'perspective(900px) rotateX(' + (-py * 3).toFixed(2) + 'deg) ' +
          'rotateY(' + (px * 3).toFixed(2) + 'deg) translateY(-4px)';
      });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilt');
        card.style.transform = '';
      });
    });
  }

  /* ---------- 滚动：进度条 + 大数字视差 ---------- */
  var secs = document.querySelectorAll('.series');
  var scrolling = false;

  function onScroll() {
    scrolling = false;
    var y = window.scrollY || document.documentElement.scrollTop;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';

    if (!secs.length || reduce.matches) return;
    var vh = window.innerHeight;
    for (var i = 0; i < secs.length; i++) {
      var el = secs[i];
      var r = el.getBoundingClientRect();
      if (r.top > vh + 160 || r.bottom < -160) continue;
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.setProperty('--np', Math.max(-1, Math.min(1, p)).toFixed(3));
    }
  }

  window.addEventListener('scroll', function () {
    if (!scrolling) {
      scrolling = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  /* ---------- 尺寸变化 ---------- */
  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (canvas && ctx) seed();
      onScroll();
    }, 180);
  });
})();
