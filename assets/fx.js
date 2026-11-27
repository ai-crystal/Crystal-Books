/* Crystal Books — 轻量渲染特效
   预算：不引外部素材，全部程序生成；canvas 限 30fps、DPR ≤ 1.5；
   只做 transform / opacity 合成，尊重 prefers-reduced-motion。 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);

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
    grd.addColorStop(.38, 'rgba(' + r + ',' + g + ',' + b + ',.34)');
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
    var n = Math.round(Math.min(48, Math.max(14, (W * H) / 30000)));
    pts = [];
    for (var i = 0; i < n; i++) {
      pts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - .5) * .14,
        vy: -(0.03 + Math.random() * .12),
        s: 3 + Math.random() * 5,
        a: .12 + Math.random() * .3,
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

    var link2 = 124 * 124;
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
    ctx.strokeStyle = 'rgba(120,118,110,.13)';
    ctx.lineWidth = .6;
    ctx.stroke();

    for (var k = 0; k < pts.length; k++) {
      var d = pts[k];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.ph += d.w * dt * 3;

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

      ctx.globalAlpha = d.a * (.6 + .4 * Math.sin(d.ph));
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
      sprites = [sprite(126, 128, 138), sprite(170, 132, 62)];
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
    var pending = null;
    var queued = false;

    function flush() {
      queued = false;
      var e = pending;
      pending = null;
      if (!e || !e.target || !e.target.closest) return;
      var el = e.target.closest('.book, .cat-row');
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
  }

  /* ---------- 顶部进度条 ---------- */
  var scrolling = false;

  function onScroll() {
    scrolling = false;
    var y = window.scrollY || document.documentElement.scrollTop;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
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
