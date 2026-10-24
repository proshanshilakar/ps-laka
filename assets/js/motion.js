/* Motion for the portfolio: loading counter, hero entrance, scroll reveals,
   growing charts, count-ups, plot tilt, scroll progress and active nav.
   Plain JavaScript, no libraries. Turns itself off for "reduce motion" and in the editor preview. */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('js-motion')) return;
  root.classList.add('motion-ready');

  var M = window.MOTION || {};
  var $ = function (id) { return document.getElementById(id); };
  var qa = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
  var finePointer = matchMedia('(pointer: fine)').matches;

  /* ---------- text splitting ---------- */
  function splitLetters(el) {
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    var i = 0, out = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 1 && n.tagName === 'BR') { out.push('<br>'); return; }
      (n.textContent || '').split(/(\s+)/).forEach(function (word) {
        if (!word) return;
        if (/^\s+$/.test(word)) { out.push(' '); return; }
        out.push('<span class="ln">' + word.split('').map(function (ch) {
          return '<span class="ch" style="--i:' + (i++) + '">' + ch.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
        }).join('') + '</span>');
      });
    });
    el.innerHTML = out.join('');
    el.setAttribute('aria-label', label);
    qa('.ln', el).forEach(function (s) { s.setAttribute('aria-hidden', 'true'); });
  }
  function splitWords(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(function (w, i) {
      return '<span class="wd" aria-hidden="true"><span style="--i:' + i + '">' + w.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span></span>';
    }).join(' ');
  }

  /* ---------- loader + hero entrance ---------- */
  splitLetters($('hero-title'));

  function heroIn() { root.classList.add('hero-in'); }

  if (M.loader && $('loader')) {
    var nText = ($('plot-n') && $('plot-n').textContent) || '';
    var total = parseInt(nText.replace(/[^\d]/g, ''), 10) || 7863;
    var nEl = $('loader-n'), bar = $('loader-bar'), start = performance.now(), DUR = 900;
    (function tick(now) {
      var t = Math.min(1, (now - start) / DUR), e = ease(t);
      nEl.textContent = Math.round(total * e).toLocaleString('en-US');
      bar.style.transform = 'scaleX(' + e + ')';
      if (t < 1) { requestAnimationFrame(tick); return; }
      setTimeout(function () {
        root.classList.add('loader-out');
        setTimeout(heroIn, 120);
        setTimeout(function () {
          root.classList.remove('js-loader', 'loader-out');
          var l = $('loader'); if (l) l.remove();
        }, 900);
      }, 120);
    })(start);
    try { sessionStorage.setItem('ps-intro', '1'); } catch (e) {}
  } else {
    var l = $('loader'); if (l) l.remove();
    requestAnimationFrame(function () { requestAnimationFrame(heroIn); });
  }

  /* ---------- scroll reveals ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      (function (t) { setTimeout(function () { t.classList.add('settled'); }, 1800); })(en.target);
      io.unobserve(en.target);
      qa('[data-count]', en.target).concat(en.target.hasAttribute('data-count') ? [en.target] : []).forEach(countUp);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

  function watch(el, cls, i) {
    if (!el || el.classList.contains('in')) return;
    if (cls) cls.split(' ').forEach(function (c) { el.classList.add(c); });
    if (i != null) el.style.setProperty('--i', Math.min(i, 10));
    io.observe(el);
  }
  function stagger(sel, cls) {
    var groups = new Map();
    qa(sel).forEach(function (el) {
      var p = el.parentNode, n = groups.get(p) || 0;
      groups.set(p, n + 1);
      watch(el, cls, n);
    });
  }
  function index(sel, ctx) { qa(sel, ctx).forEach(function (el, i) { el.style.setProperty('--i', Math.min(i, 14)); }); }

  qa('.section-head').forEach(function (h) { var h2 = h.querySelector('h2'); if (h2) splitWords(h2); watch(h); });
  var ch = document.querySelector('.contact h2'); if (ch) { splitWords(ch); watch(ch); }

  watch(document.querySelector('.about-photo'), 'rv-cover');
  stagger('.about-copy > *', 'rv');
  stagger('.loves > div', 'rv');
  stagger('.fields tbody tr', 'rv rv-left');
  qa('.gantt').forEach(function (g) { index('.g-bar', g); watch(g, 'rv'); });
  stagger('.job', 'rv');
  qa('.case-metric .num').forEach(function (n) { if (countable(n.textContent)) n.setAttribute('data-count', ''); });
  stagger('.case', 'rv');
  qa('.skillset').forEach(function (s) { index('.bar-row', s); });
  stagger('.skillset', 'rv');
  qa('.tagset').forEach(function (s) { index('.tags li', s); });
  stagger('.tagset', 'rv');
  watch(document.querySelector('#side .swipe'));
  watch(document.getElementById('footer-temple'));
  stagger('.footer-copy > *', 'rv');
  stagger('.contact .contact-text, .contact .email-row, .contact .socials', 'rv');

  /* ---------- number count-up (only for a single number, e.g. "+12%" or "Rs 4.2M") ---------- */
  function countable(s) { var m = (s || '').match(/\d[\d,]*(\.\d+)?/g); return !!m && m.length === 1; }
  function countUp(el) {
    var txt = el.textContent, m = txt.match(/\d[\d,]*(\.\d+)?/);
    if (!m) return;
    var raw = m[0], target = parseFloat(raw.replace(/,/g, '')), dec = (raw.split('.')[1] || '').length;
    var pre = txt.slice(0, m.index), post = txt.slice(m.index + raw.length), t0 = performance.now(), D = 1300;
    (function step(now) {
      var t = Math.min(1, (now - t0) / D), v = target * ease(t);
      el.textContent = pre + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + post;
      if (t < 1) requestAnimationFrame(step); else el.textContent = txt;
    })(t0);
  }

  /* ---------- scroll: progress bar, photo parallax ---------- */
  var header = document.querySelector('.site-header');
  var prog = document.createElement('div');
  prog.className = 'scroll-progress'; prog.setAttribute('aria-hidden', 'true'); prog.innerHTML = '<i></i>';
  if (header) header.appendChild(prog);
  var progBar = prog.firstChild, photo = document.querySelector('.about-photo img'), ticking = false;
  function onScroll() {
    ticking = false;
    var max = document.documentElement.scrollHeight - innerHeight;
    progBar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0) + ')';
    if (photo) {
      var r = photo.parentNode.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) {
        var off = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        photo.style.setProperty('--py', (off * -28).toFixed(1) + 'px');
      }
    }
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- active section in the menu ---------- */
  var links = qa('.nav-link[data-nav]');
  var navIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-nav') === en.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(function (a) { var s = $(a.getAttribute('data-nav')); if (s) navIO.observe(s); });

  /* ---------- hero: plot tilts toward the mouse, flattens while you inspect it ---------- */
  var hero = document.querySelector('.hero'), plot = $('plot'), canvas = $('portrait-canvas'), text = document.querySelector('.hero-text');
  if (finePointer && hero && plot) {
    var cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 }, raf = 0;
    var loop = function () {
      raf = 0;
      cur.x += (tgt.x - cur.x) * 0.09; cur.y += (tgt.y - cur.y) * 0.09;
      /* when the 3D portrait is running it rotates itself, so the card stays flat */
      var flatCard = plot.dataset.three === '1';
      plot.style.transform = flatCard ? '' : 'perspective(1100px) rotateX(' + (-cur.y * 7).toFixed(2) + 'deg) rotateY(' + (cur.x * 9).toFixed(2) + 'deg)';
      plot.style.setProperty('--sx', (-cur.x * 14).toFixed(1) + 'px');
      plot.style.setProperty('--sy', (18 - cur.y * 8).toFixed(1) + 'px');
      if (text) text.style.transform = 'translate3d(' + (-cur.x * 8).toFixed(1) + 'px,' + (-cur.y * 5).toFixed(1) + 'px,0)';
      if (Math.abs(tgt.x - cur.x) > 0.001 || Math.abs(tgt.y - cur.y) > 0.001) raf = requestAnimationFrame(loop);
    };
    var kick = function () { if (!raf) raf = requestAnimationFrame(loop); };
    hero.addEventListener('pointermove', function (ev) {
      if (ev.pointerType !== 'mouse') return;
      if (canvas && ev.target === canvas) { tgt.x = 0; tgt.y = 0; kick(); return; }
      var r = hero.getBoundingClientRect();
      tgt.x = (ev.clientX - r.left) / r.width - 0.5;
      tgt.y = (ev.clientY - r.top) / r.height - 0.5;
      kick();
    });
    hero.addEventListener('pointerleave', function () { tgt.x = 0; tgt.y = 0; kick(); });
  }
  /* ---------- living background: the graph paper reacts to the mouse ---------- */
  (function grid() {
    if (!finePointer) return;
    var G = 28;                                   /* must match background-size in site.css */
    var cv = document.createElement('canvas');
    cv.className = 'grid-fx'; cv.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(cv, document.body.firstChild);
    var ctx = cv.getContext('2d'), dpr = 1, W = 0, H = 0, raf = 0;
    var m = { x: -999, y: -999 }, sm = { x: -999, y: -999 }, k = 0, kT = 0;
    var trail = [], ripples = [], last = '', rgb = '47,47,224';
    var LIFE = 1100, R = 190;

    function readColor() {
      var c = getComputedStyle(root).getPropertyValue('--blue').trim();
      var h = c.replace('#', '');
      if (h.length === 3) h = h.split('').map(function (x) { return x + x; }).join('');
      if (/^[0-9a-f]{6}$/i.test(h)) rgb = [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }).join(',');
      kick();
    }
    function size() {
      dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      kick();
    }
    function col(a) { return 'rgba(' + rgb + ',' + a.toFixed(3) + ')'; }

    function draw(now) {
      raf = 0;
      var sy = scrollY, active = false;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      sm.x += (m.x - sm.x) * 0.22; sm.y += (m.y - sm.y) * 0.22;
      k += (kT - k) * 0.12;
      if (Math.abs(m.x - sm.x) > 0.3 || Math.abs(m.y - sm.y) > 0.3 || Math.abs(kT - k) > 0.005) active = true;

      /* heat trail: squares you pass over glow, then cool down */
      for (var i = trail.length - 1; i >= 0; i--) {
        var c = trail[i], a = 1 - (now - c.t) / LIFE;
        if (a <= 0) { trail.splice(i, 1); continue; }
        var y = c.r * G - sy;
        if (y > -G && y < H) { ctx.fillStyle = col(0.13 * a * a * c.w); ctx.fillRect(c.c * G + 1, y + 1, G - 1, G - 1); }
        active = true;
      }

      /* click ripple: a ring of squares travels outward */
      for (var j = ripples.length - 1; j >= 0; j--) {
        var rp = ripples[j], rad = (now - rp.t) * 0.75, MAX = 520;
        if (rad > MAX) { ripples.splice(j, 1); continue; }
        active = true;
        var fade = 1 - rad / MAX, cx = rp.x, cy = rp.y - sy;
        var c0 = Math.max(0, Math.floor((cx - rad - G) / G)), c1 = Math.floor((cx + rad + G) / G);
        var r0 = Math.floor((rp.y - rad - G) / G), r1 = Math.floor((rp.y + rad + G) / G);
        for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) {
          var dx = cc * G + G / 2 - cx, dy = rr * G + G / 2 - rp.y, d = Math.sqrt(dx * dx + dy * dy), band = Math.abs(d - rad);
          if (band > G * 1.2) continue;
          var yy = rr * G - sy;
          if (yy < -G || yy > H) continue;
          ctx.fillStyle = col(0.16 * fade * (1 - band / (G * 1.2)));
          ctx.fillRect(cc * G + 1, yy + 1, G - 1, G - 1);
        }
      }

      /* spotlight: grid lines brighten around the cursor, crossings become dots */
      if (k > 0.01) {
        var g = ctx.createRadialGradient(sm.x, sm.y, 0, sm.x, sm.y, R);
        g.addColorStop(0, col(0.55 * k)); g.addColorStop(1, col(0));
        ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath();
        var x0 = Math.floor((sm.x - R) / G), x1 = Math.ceil((sm.x + R) / G);
        var y0 = Math.floor((sm.y + sy - R) / G), y1 = Math.ceil((sm.y + sy + R) / G);
        for (var gx = x0; gx <= x1; gx++) { var lx = gx * G + 0.5; ctx.moveTo(lx, y0 * G - sy); ctx.lineTo(lx, y1 * G - sy); }
        for (var gy = y0; gy <= y1; gy++) { var ly = gy * G - sy + 0.5; ctx.moveTo(x0 * G, ly); ctx.lineTo(x1 * G, ly); }
        ctx.stroke();
        ctx.fillStyle = col(0.7 * k); ctx.beginPath();
        for (var px = x0; px <= x1; px++) for (var py = y0; py <= y1; py++) {
          var ddx = px * G - sm.x, ddy = py * G - sy - sm.y, dd = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dd >= R) continue;
          var f = 1 - dd / R, rd = 2.4 * f * f;
          if (rd < 0.3) continue;
          ctx.moveTo(px * G + rd, py * G - sy); ctx.arc(px * G, py * G - sy, rd, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      if (active) kick();
    }
    function kick() { if (!raf) raf = requestAnimationFrame(draw); }

    addEventListener('pointermove', function (ev) {
      if (ev.pointerType !== 'mouse') return;
      if (sm.x < -900) { sm.x = ev.clientX; sm.y = ev.clientY; }
      m.x = ev.clientX; m.y = ev.clientY; kT = 1;
      var c = Math.floor(ev.clientX / G), r = Math.floor((ev.clientY + scrollY) / G), key = c + ',' + r;
      if (key !== last) {
        last = key;
        var t = performance.now();
        trail.push({ c: c, r: r, t: t, w: 1 });
        if (trail.length > 90) trail.splice(0, trail.length - 90);
      }
      kick();
    }, { passive: true });
    addEventListener('pointerdown', function (ev) {
      if (ev.pointerType !== 'mouse') return;
      ripples.push({ x: ev.clientX, y: ev.clientY + scrollY, t: performance.now() });
      if (ripples.length > 4) ripples.shift();
      kick();
    }, { passive: true });
    document.addEventListener('pointerleave', function () { kT = 0; kick(); });
    document.documentElement.addEventListener('mouseleave', function () { kT = 0; kick(); });
    addEventListener('blur', function () { kT = 0; kick(); });
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', size);
    new MutationObserver(readColor).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColor); } catch (e) {}
    size(); readColor();
  })();
})();
