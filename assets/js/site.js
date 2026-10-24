/* Renders the portfolio from window.SITE (content.js). You normally don't need to edit this file. */
(function () {
  'use strict';

  /* ---------------- helpers ---------------- */
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var has = function (s) { return typeof s === 'string' ? s.trim() !== '' : !!s; };
  var list = function (a) { return Array.isArray(a) ? a : []; };
  var stars = function (s) { return esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>'); };
  var $ = function (id) { return document.getElementById(id); };
  var safeUrl = function (u) {
    u = String(u || '').trim();
    return /^(https?:|mailto:|tel:|assets\/|\.\/|\/|#)/i.test(u) || /^[\w.-]+\.(jpe?g|png|webp|gif|svg|avif|pdf)$/i.test(u) ? u : '';
  };
  var SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)'];
  var fmtNum = function (n) { return Number(n).toLocaleString('en-US'); };
  var slugify = function (t) { return String(t || 'story').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'story'; };
  var POSTS = [], READER_OPEN = false;

  /* ---------- swipe cards: snap scrolling, mouse drag, arrows, dots ---------- */
  function initSwipe(box) {
    if (!box) return;
    var track = box.querySelector('.swipe-track'), cards = [].slice.call(track.children);
    var dots = [].slice.call(box.querySelectorAll('.swipe-dots button')), count = box.querySelector('.swipe-count b');
    var prev = box.querySelector('[data-dir="-1"]'), next = box.querySelector('[data-dir="1"]');
    var current = 0;
    function left(i) { return cards[i].offsetLeft - cards[0].offsetLeft; }
    function go(i) { i = Math.max(0, Math.min(cards.length - 1, i)); track.scrollTo({ left: left(i), behavior: 'smooth' }); }
    function pad() {
      var pl = getComputedStyle(track).paddingLeft;
      if (track.style.scrollPaddingLeft !== pl) { track.style.scrollPaddingLeft = pl; track.style.scrollPaddingRight = pl; }
    }
    function update() {
      pad();
      var best = 0, bd = Infinity;
      cards.forEach(function (c, i) { var d = Math.abs(left(i) - track.scrollLeft); if (d < bd) { bd = d; best = i; } });
      var max = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= max - 4) best = cards.length - 1;
      current = best;
      dots.forEach(function (d, i) { d.setAttribute('aria-selected', i === best ? 'true' : 'false'); });
      if (count) count.textContent = String(best + 1).padStart(2, '0');
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= max - 4;
      box.classList.toggle('static', max <= 4);
    }
    prev.addEventListener('click', function () { go(current - 1); });
    next.addEventListener('click', function () { go(current + 1); });
    dots.forEach(function (d) { d.addEventListener('click', function () { go(+d.getAttribute('data-go')); }); });
    var raf = 0;
    track.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; update(); }); }, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
    });
    /* drag with the mouse (touch already swipes natively) */
    var down = false, moved = false, sx = 0, sl = 0, lastX = 0, vel = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; sx = lastX = e.clientX; sl = track.scrollLeft; vel = 0;
    });
    addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('dragging'); }
      if (moved) { vel = e.clientX - lastX; lastX = e.clientX; track.scrollLeft = sl - dx; }
    });
    addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (!moved) return;
      track.classList.remove('dragging');
      var target = current + (vel < -3 ? 1 : vel > 3 ? -1 : 0);
      if (Math.abs(vel) <= 3) {
        var best = 0, bd = Infinity;
        cards.forEach(function (c, i) { var d = Math.abs(left(i) - track.scrollLeft); if (d < bd) { bd = d; best = i; } });
        target = best;
      }
      go(target);
    });
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    if (window.ResizeObserver) new ResizeObserver(update).observe(track);
    pad(); track.scrollLeft = 0; update();
  }

  /* ---------- story reader (opens like a blog post; link: #story/<name>) ---------- */
  var openedFromPage = false;
  function storyFor(hash) {
    var m = /^#story\/(.+)$/.exec(hash || '');
    if (!m) return null;
    for (var i = 0; i < POSTS.length; i++) if (POSTS[i].slug === decodeURIComponent(m[1])) return i;
    return null;
  }
  function renderStory(i) {
    var q = POSTS[i], x = q.p;
    var meta = [x.category ? '<span class="tag-mono">' + esc(x.category) + '</span>' : '', q.mins + ' min read', has(x.date) ? esc(x.date) : ''].filter(Boolean).join('<i aria-hidden="true">·</i>');
    var pics = q.imgs.map(function (src) { return '<figure><img src="' + esc(safeUrl(src)) + '" alt="' + esc(x.title) + '"></figure>'; }).join('');
    var other = function (j, lbl) {
      if (j < 0 || j >= POSTS.length) return '<span></span>';
      return '<a class="reader-next' + (lbl === 'Next' ? ' r' : '') + '" href="#story/' + POSTS[j].slug + '"><span class="mono-caption">' + lbl + ' story</span><b>' + esc(POSTS[j].p.title) + '</b></a>';
    };
    var html = '<p class="post-meta">' + meta + '</p><h2 id="reader-title">' + esc(x.title) + '</h2>' +
      (has(x.text) ? '<p class="reader-lead">' + esc(x.text) + '</p>' : '') +
      (pics ? '<div class="reader-pics n' + Math.min(q.imgs.length, 3) + '">' + pics + '</div>' : '') +
      '<div class="reader-text">' + q.body.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>' +
      (q.tags.length ? '<ul class="chips">' + q.tags.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
      (q.link ? '<p><a class="btn" href="' + esc(q.link) + '" target="_blank" rel="noopener">Visit ↗</a></p>' : '') +
      (POSTS.length > 1 ? '<nav class="reader-more" aria-label="More stories">' + other(i - 1, 'Previous') + other(i + 1, 'Next') + '</nav>' : '');
    $('reader-body').innerHTML = html;
  }
  function openStory(hash, quiet) {
    var dlg = $('reader'), i = storyFor(hash);
    if (!dlg || i == null || !POSTS[i].body.length) return false;
    renderStory(i);
    dlg.querySelector('.reader-sheet').scrollTop = 0;
    if (!dlg.open) {
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      document.documentElement.classList.add('reader-open');
      requestAnimationFrame(function () { requestAnimationFrame(function () { dlg.classList.add('show'); }); });
    }
    READER_OPEN = true;
    return true;
  }
  function hideStory() {
    var dlg = $('reader');
    if (!dlg || !dlg.open) { READER_OPEN = false; return; }
    READER_OPEN = false;
    dlg.classList.remove('show');
    document.documentElement.classList.remove('reader-open');
    var done = function () { if (!READER_OPEN && dlg.open) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); } };
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(done, reduce ? 0 : 420);
  }
  function closeStory() {
    if (openedFromPage) { openedFromPage = false; history.back(); }
    else { history.replaceState(null, '', location.pathname + location.search + '#side'); hideStory(); }
  }


  function setSection(id, show, html) {
    var el = $(id);
    if (!el) return;
    el.hidden = !show;
    var body = el.querySelector('[data-body]');
    if (body && html != null) body.innerHTML = show ? html : '';
    var link = document.querySelector('[data-nav="' + id + '"]');
    if (link) link.hidden = !show;
  }

  var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  var now = new Date();
  var NOW = now.getFullYear() + now.getMonth() / 12;
  function isOpenEnd(s) { return !has(s) || /present|now|current|today|ongoing/i.test(s); }
  function parseWhen(s) {
    if (!has(s)) return null;
    s = String(s).toLowerCase();
    if (/present|now|current|today|ongoing/.test(s)) return NOW;
    var y = s.match(/(19|20)\d{2}/);
    if (!y) return null;
    var year = +y[0], m = 0;
    var mm = s.match(/(19|20)\d{2}[-/.](\d{1,2})/) || s.match(/(\d{1,2})[-/.](19|20)\d{2}/);
    if (mm) m = Math.min(11, Math.max(0, +(mm[2].length <= 2 ? mm[2] : mm[1]) - 1));
    var name = s.match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/);
    if (name) m = MONTHS[name[0]];
    return year + m / 12;
  }

  function fmtYears(y) {
    y = Number(y) || 0;
    if (y <= 0) return '';
    if (y < 1) return Math.max(1, Math.round(y * 12)) + ' mo';
    var r = Math.round(y * 2) / 2;
    return (r % 1 ? r.toFixed(1) : r) + (r === 1 ? ' yr' : ' yrs');
  }

  /* ---------------- render ---------------- */
  function render(S) {
    S = S || {};
    var p = S.profile || {};
    var name = (p.name || '').trim() || 'Your Name';
    var parts = name.split(/\s+/);

    document.title = name + (p.role ? ' · ' + p.role : '');
    $('brand-name').textContent = name;
    $('hero-title').innerHTML = esc(parts[0]) + (parts.length > 1 ? '<br>' + esc(parts.slice(1).join(' ')) : '');
    $('hero-role').textContent = p.role || '';
    $('hero-location').textContent = p.location || '';
    $('hero-role').hidden = !has(p.role);
    $('hero-location').hidden = !has(p.location);
    document.querySelector('.hero .eyebrow .sep').hidden = !(has(p.role) && has(p.location));
    $('hero-ranjana').hidden = p.showRanjanaName === false;
    $('hero-lead').innerHTML = stars(p.headline || '');
    $('hero-lead').hidden = !has(p.headline);
    var resume = safeUrl(p.resume);
    /* Download CV: local PDFs download straight away, outside links (Drive etc.) open in a new tab */
    var external = /^https?:/i.test(resume || '') && !(resume.indexOf(location.origin + '/') === 0);
    var cvName = name.replace(/\s+/g, '-') + '-CV' + ((/\.(pdf|docx?)$/i.exec(resume || '') || ['.pdf'])[0]);
    ['hero-resume-btn', 'contact-cv-btn'].forEach(function (id) {
      var b = $(id);
      if (!b) return;
      b.hidden = !resume;
      if (!resume) return;
      b.href = resume;
      if (external) { b.target = '_blank'; b.rel = 'noopener'; b.removeAttribute('download'); }
      else { b.setAttribute('download', cvName); b.removeAttribute('target'); }
    });

    /* areas → colours (shared by timeline + job tags) */
    var exAll = list(S.experience).filter(function (e) { return e && (has(e.role) || has(e.company)); });
    var areaColor = {}, areaOrder = [];
    exAll.forEach(function (e) {
      var a = (e.area || '').trim();
      if (a && !(a in areaColor)) { areaColor[a] = SERIES[areaOrder.length % SERIES.length]; areaOrder.push(a); }
    });
    var colorFor = function (a) { a = (a || '').trim(); return a ? areaColor[a] : 'var(--faint)'; };

    var sides = list(S.sideProjects).filter(function (x) { return x && has(x.title); });
    var cases = list(S.caseStudies).filter(function (c) { return c && has(c.title); });
    var groups = list(S.skills).map(function (g) {
      return { group: g && g.group, items: list(g && g.items).filter(function (it) { return it && has(it.name); }) };
    }).filter(function (g) { return g.items.length; });

    /* About */
    var a = S.about || {};
    var paras = list(a.paragraphs).filter(has);
    var facts = list(a.facts).filter(function (f) { return f && (has(f.label) || has(f.value)); });
    var loves = list(a.interests).filter(function (i) { return i && (has(i.title) || has(i.text)); });
    $('about-title').textContent = a.heading || 'About me';
    var ah = '<div class="about-grid' + (has(a.photo) ? '' : ' no-photo') + '">';
    if (has(a.photo)) ah += '<div class="about-photo"><img src="' + esc(safeUrl(a.photo)) + '" alt="Photo of ' + esc(name) + '" loading="lazy"></div>';
    ah += '<div class="about-copy">';
    if (has(a.intro)) ah += '<p class="big">' + esc(a.intro) + '</p>';
    paras.forEach(function (t) { ah += '<p>' + esc(t) + '</p>'; });
    if (facts.length) ah += '<dl class="facts">' + facts.map(function (f) { return '<div><dt>' + esc(f.label) + '</dt><dd>' + esc(f.value) + '</dd></div>'; }).join('') + '</dl>';
    ah += '</div></div>';
    if (loves.length) {
      ah += '<div class="loves cols-' + Math.min(loves.length, 3) + '">' + loves.map(function (i) {
        return '<div>' + (has(i.title) ? '<h3>' + esc(i.title) + '</h3>' : '') + (has(i.text) ? '<p>' + esc(i.text) + '</p>' : '') + '</div>';
      }).join('') + '</div>';
    }
    setSection('about', has(a.intro) || paras.length || facts.length || loves.length || has(a.photo), ah);

    /* Fields table */
    var sv = list(S.services).filter(function (s) { return s && has(s.title); });
    var anyDesc = sv.some(function (s) { return has(s.text); });
    setSection('services', sv.length > 0, '<div class="table-wrap"><table class="fields' + (anyDesc ? ' has-desc' : '') + '"><thead><tr><th scope="col">#</th><th scope="col">field</th>' +
      (anyDesc ? '<th scope="col">focus</th>' : '') + '</tr></thead><tbody>' + sv.map(function (s, i) {
        return '<tr><td class="idx">' + String(i + 1).padStart(2, '0') + '</td><td class="name">' + esc(s.title) + '</td>' +
          (anyDesc ? '<td class="desc">' + (has(s.text) ? esc(s.text) : '<span class="null">—</span>') + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>');

    /* Experience: Gantt + list */
    var chartable = exAll.map(function (e) {
      var s = parseWhen(e.start), en = isOpenEnd(e.end) ? NOW : parseWhen(e.end);
      return s == null ? null : { e: e, s: s, en: Math.max(en == null ? s + 1 / 12 : en, s + 1 / 24), open: isOpenEnd(e.end) };
    }).filter(Boolean);
    var eh = '';
    if (chartable.length) {
      var y0 = Math.floor(Math.min.apply(null, chartable.map(function (c) { return c.s; })));
      var y1 = Math.ceil(Math.max.apply(null, chartable.map(function (c) { return c.en; })) + 0.01);
      var cols = Math.max(1, y1 - y0), stepY = cols > 12 ? 2 : 1;
      var pct = function (v) { return ((v - y0) / cols * 100).toFixed(2); };
      var axis = '';
      for (var yy = y0; yy <= y1; yy += stepY) axis += '<span style="left:' + pct(yy) + '%' + (yy === y0 ? ';translate:0 0' : yy + stepY > y1 ? ';translate:-100% 0' : '') + '">' + yy + '</span>';
      eh += '<div class="gantt"><div class="gantt-inner" style="--cols:' + cols + '">';
      eh += '<div class="g-row g-axis" aria-hidden="true"><span></span><div class="g-track">' + axis + '</div></div>';
      chartable.forEach(function (c) {
        var col = colorFor(c.e.area);
        eh += '<div class="g-row"><div class="g-label"><b>' + esc(c.e.role || c.e.company) + '</b><span>' + esc(c.e.role ? c.e.company || '' : '') + '</span></div>' +
          '<div class="g-track"><div class="g-bar' + (c.open ? ' open' : '') + '" style="left:' + pct(c.s) + '%;width:' + (pct(c.en) - pct(c.s)).toFixed(2) +
          '%;background:' + col + ';color:' + col + '" title="' + esc((c.e.start || '') + ' – ' + (c.e.end || 'Present')) + '"></div></div></div>';
      });
      eh += '</div>';
      if (areaOrder.length) eh += '<div class="g-legend">' + areaOrder.map(function (ar) { return '<span><i style="background:' + areaColor[ar] + '"></i>' + esc(ar) + '</span>'; }).join('') + '</div>';
      eh += '</div>';
    }
    eh += '<ol class="jobs">' + exAll.map(function (e) {
      var when = [e.start, has(e.start) && !has(e.end) ? 'Present' : e.end].filter(has).map(esc).join(' – ');
      var where = [e.company, e.place].filter(has).map(esc).join(' · ');
      return '<li class="job"><p class="when">' + (when || '&nbsp;') + '</p><div>' +
        (has(e.role) ? '<h3>' + esc(e.role) + '</h3>' : '') +
        '<p class="where">' + where + (has(e.area) ? ' <span class="area" style="background:' + colorFor(e.area) + '">' + esc(e.area) + '</span>' : '') + '</p>' +
        (has(e.text) ? '<p class="desc">' + esc(e.text) + '</p>' : '') + '</div></li>';
    }).join('') + '</ol>';
    setSection('experience', exAll.length > 0, eh);

    /* Case studies */
    setSection('cases', cases.length > 0, '<div class="cases">' + cases.map(function (c, i) {
      var tools = list(c.tools).filter(has);
      var link = safeUrl(c.link);
      var rows = [['question', c.question], ['approach', c.approach], ['result', c.result]].filter(function (r) { return has(r[1]); });
      return '<article class="case"><div class="case-metric"><div>' +
        (has(c.metricValue) ? '<p class="num">' + esc(c.metricValue) + '</p>' + (has(c.metricLabel) ? '<p class="lbl">' + esc(c.metricLabel) + '</p>' : '')
          : '<p class="num">' + String(i + 1).padStart(2, '0') + '</p>') +
        '</div>' + (has(c.area) ? '<p class="tag-mono">' + esc(c.area) + '</p>' : '') + '</div>' +
        '<div class="case-body"><h3>' + esc(c.title) + '</h3>' +
        (rows.length ? '<dl class="qa">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' : '') +
        (tools.length ? '<ul class="chips">' + tools.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
        (link ? '<a class="text-link" href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(c.linkLabel || 'View project') + ' ↗</a>' : '') +
        '</div>' + (has(c.image) ? '<div class="case-img"><img src="' + esc(safeUrl(c.image)) + '" alt="' + esc(c.title) + '" loading="lazy"></div>' : '') +
        '</article>';
    }).join('') + '</div>');
    $('hero-work-btn').hidden = !cases.length;
    $('hero-contact-btn').classList.toggle('btn-primary', !cases.length);

    /* Skills bar chart */
    var maxY = 1;
    groups.forEach(function (g) { g.items.forEach(function (it) { maxY = Math.max(maxY, Number(it.years) || 0); }); });
    var scale = Math.max(3, Math.ceil(maxY));
    var ticks = '';
    for (var t = 0; t <= scale; t++) ticks += '<span style="left:' + (t / scale * 100) + '%' + (t === scale ? ';translate:-100% 0' : '') + '">' + t + '</span>';
    setSection('skills', groups.length > 0, '<div class="skillsets' + (groups.length === 1 ? ' one' : '') + '">' + groups.map(function (g, gi) {
      var col = SERIES[gi % SERIES.length];
      return '<div class="skillset">' + (has(g.group) ? '<h3><i style="background:' + col + '"></i>' + esc(g.group) + '</h3>' : '') +
        '<div class="bars" style="--cols:' + scale + '">' + g.items.map(function (it) {
          var y = Math.max(0, Number(it.years) || 0);
          return '<div class="bar-row"><span class="name" title="' + esc(it.name) + '">' + esc(it.name) + '</span><div class="track"><div class="bar" style="width:' +
            Math.min(100, y / scale * 100).toFixed(2) + '%;background:' + col + '"></div></div><span class="len">' + fmtYears(y) + '</span></div>';
        }).join('') + '<div class="bar-axis" aria-hidden="true"><span></span><div class="track">' + ticks + '</div><span class="unit">years</span></div></div></div>';
    }).join('') + '</div>');

    /* Skills (short tag lists) */
    var ex = S.expertise || {};
    var sets = list(ex.groups).map(function (g) {
      return { group: g && g.group, items: list(g && g.items).filter(has) };
    }).filter(function (g) { return g.items.length; });
    $('expertise-title').textContent = has(ex.heading) ? ex.heading : 'Skills';
    setSection('expertise', sets.length > 0, '<div class="tagsets">' + sets.map(function (g, gi) {
      return '<div class="tagset" style="--c:' + SERIES[gi % SERIES.length] + '">' + (has(g.group) ? '<h3><i></i>' + esc(g.group) + '</h3>' : '') +
        '<ul class="tags">' + g.items.map(function (it) { return '<li>' + esc(it) + '</li>'; }).join('') + '</ul></div>';
    }).join('') + '</div>');

    /* Beyond data: swipeable story cards that open as blog posts */
    POSTS = sides.map(function (x) {
      var body = list(x.body).filter(has);
      var words = (body.join(' ') + ' ' + (x.text || '')).split(/\s+/).filter(Boolean).length;
      return { p: x, slug: slugify(x.title), body: body, mins: Math.max(1, Math.round(words / 200)), imgs: list(x.images).filter(has), tags: list(x.tags).filter(has), link: safeUrl(x.link) };
    });
    setSection('side', POSTS.length > 0, '<div class="swipe">' +
      '<div class="swipe-track" role="list">' + POSTS.map(function (q, i) {
        var x = q.p, readable = q.body.length > 0;
        var href = readable ? '#story/' + q.slug : (q.link || '');
        var tag = href ? 'a' : 'div';
        var attrs = href ? ' href="' + esc(href) + '"' + (readable ? '' : ' target="_blank" rel="noopener"') + ' draggable="false"' : '';
        var meta = [x.category ? '<span class="tag-mono">' + esc(x.category) + '</span>' : '', readable ? '<span>' + q.mins + ' min read</span>' : '', has(x.date) ? '<span>' + esc(x.date) + '</span>' : ''].filter(Boolean).join('<i aria-hidden="true">·</i>');
        return '<' + tag + ' class="post-card" role="listitem"' + attrs + ' style="--i:' + i + '">' +
          '<div class="post-media">' + (q.imgs.length ? '<img src="' + esc(safeUrl(q.imgs[0])) + '" alt="" loading="lazy" draggable="false">' : '<span class="post-noimg">' + esc((x.title || '?').charAt(0)) + '</span>') +
          (q.imgs.length > 1 ? '<span class="post-count">' + q.imgs.length + ' photos</span>' : '') + '<span class="post-no">' + String(i + 1).padStart(2, '0') + '</span></div>' +
          '<div class="post-body"><p class="post-meta">' + meta + '</p><h3>' + esc(x.title) + '</h3>' + (has(x.text) ? '<p class="post-excerpt">' + esc(x.text) + '</p>' : '') +
          (readable ? '<span class="post-read">Read story <i aria-hidden="true">→</i></span>' : q.link ? '<span class="post-read">Visit <i aria-hidden="true">↗</i></span>' : '') + '</div></' + tag + '>';
      }).join('') + '</div>' +
      '<div class="swipe-bar"><div class="swipe-dots" role="tablist" aria-label="Stories">' + POSTS.map(function (q, i) {
        return '<button type="button" role="tab" aria-label="Story ' + (i + 1) + ': ' + esc(q.p.title) + '" data-go="' + i + '"></button>';
      }).join('') + '</div><span class="mono-caption swipe-count"><b>01</b> / ' + String(POSTS.length).padStart(2, '0') + '</span>' +
      '<div class="swipe-btns"><button type="button" class="swipe-btn" data-dir="-1" aria-label="Previous story">←</button><button type="button" class="swipe-btn" data-dir="1" aria-label="Next story">→</button></div></div></div>');
    initSwipe(document.querySelector('#side .swipe'));
    if (READER_OPEN) openStory(location.hash, true);

    /* Contact */
    var c = S.contact || {};
    var socials = list(S.socials).filter(function (s) { return s && has(s.url); });
    $('contact-title').textContent = c.heading || 'Get in touch';
    $('contact-text').textContent = c.text || '';
    $('contact-text').hidden = !has(c.text);
    var email = (p.email || '').trim();
    $('email-row').hidden = !email;
    $('email').textContent = email;
    $('email').href = email ? 'mailto:' + email : '#';
    $('socials').innerHTML = socials.map(function (s) {
      return '<li><a href="' + esc(safeUrl(s.url)) + '" target="_blank" rel="noopener">' + esc(s.label || s.url) + ' ↗</a></li>';
    }).join('');
    $('hero-contact-btn').hidden = !(email || socials.length);

    $('footer-name').textContent = '© ' + now.getFullYear() + ' ' + name;
    $('footer-coords').textContent = [p.location, p.coordinates].filter(has).join(' · ');
    $('footer-ranjana').hidden = p.showRanjanaName === false;
    var ft = S.footer || {};
    $('footer-art').hidden = ft.showTemple === false;
    $('footer-title').textContent = has(ft.heading) ? ft.heading : 'Made in Bhaktapur';
    $('footer-text').textContent = ft.text || '';
    $('footer-text').hidden = !has(ft.text);
  }

  window.renderSite = render;
  render(window.SITE);

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#story/"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    var h = a.getAttribute('href');
    if (READER_OPEN) { history.replaceState(null, '', h); openStory(h); }
    else { openedFromPage = true; history.pushState(null, '', h); openStory(h); }
  });
  addEventListener('popstate', function () { if (storyFor(location.hash) != null) openStory(location.hash); else hideStory(); });
  addEventListener('hashchange', function () { if (storyFor(location.hash) != null) openStory(location.hash); else if (READER_OPEN) hideStory(); });
  (function () {
    var dlg = $('reader');
    if (!dlg) return;
    $('reader-close').addEventListener('click', closeStory);
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeStory(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeStory(); });
  })();
  if (storyFor(location.hash) != null) openStory(location.hash);

  /* ---------------- portrait scatter plot ---------------- */
  (function plot() {
    var P = window.PORTRAIT_POINTS, canvas = $('portrait-canvas');
    if (!P || !canvas || !canvas.getContext) { var f = $('plot'); if (f) f.hidden = true; return; }
    var AL = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ';
    var CLASS_NAMES = ['moon', 'hair & lines', 'skin'];
    var MULT = [0.55, 1.0, 0.82];
    var pts = [], grid = {}, counts = [0, 0, 0];
    P.rows.forEach(function (row, r) {
      for (var c = 0; c < row.length; c++) {
        var ch = row.charAt(c);
        if (ch === '.') continue;
        var i = AL.indexOf(ch), cls = Math.floor(i / 9), lvl = i % 9 + 1;
        grid[r + ',' + c] = pts.length;
        pts.push({ x: c * P.cell + P.cell / 2, y: r * P.cell + P.cell / 2, cls: cls, lvl: lvl, r: r, c: c });
        counts[cls]++;
      }
    });
    $('plot-n').textContent = 'n = ' + fmtNum(pts.length);
    var legendColors = ['var(--moon)', 'var(--hair)', 'var(--s2)'];
    $('plot-legend').innerHTML = [1, 2, 0].map(function (k) {
      return '<span><i style="background:' + legendColors[k] + '"></i>' + CLASS_NAMES[k] + ' <b>' + fmtNum(counts[k]) + '</b></span>';
    }).join('') + '<span>hover to inspect</span>';

    var ctx = canvas.getContext('2d');
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var M = { l: 38, b: 26, t: 6, r: 6 };
    var W = 0, H = 0, dpr = 1, sc = 1, ox = 0, oy = 0;
    var colors = {};
    var mouse = { x: -1e4, y: -1e4, k: 0, target: 0, fine: true };
    var hoverIdx = -1;
    var t0 = performance.now() + ((window.MOTION && window.MOTION.plotDelay) || 0), introMs = reduce ? 0 : 1500;
    var raf = 0;

    function readColors() {
      var cs = getComputedStyle(document.documentElement);
      colors = {
        moon: cs.getPropertyValue('--moon').trim(), ink: cs.getPropertyValue('--hair').trim(),
        skin: cs.getPropertyValue('--s2').trim(), axis: cs.getPropertyValue('--faint').trim(),
        label: cs.getPropertyValue('--muted').trim(), hi: cs.getPropertyValue('--blue').trim(),
        mono: cs.getPropertyValue('--mono').trim() || 'monospace'
      };
    }
    function resize() {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      var aw = W - M.l - M.r, ah = H - M.t - M.b;
      sc = Math.min(aw / P.w, ah / P.h);
      ox = M.l + (aw - P.w * sc) / 2; oy = M.t + (ah - P.h * sc) / 2;
      kick();
    }
    var ease = function (x) { return 1 - Math.pow(1 - x, 3); };

    function draw(time) {
      raf = 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      /* axes */
      ctx.strokeStyle = colors.axis; ctx.lineWidth = 1; ctx.fillStyle = colors.label;
      ctx.font = '9px ' + colors.mono;
      var x0 = M.l - 6, yb = H - M.b + 4;
      ctx.beginPath(); ctx.moveTo(x0 + .5, M.t); ctx.lineTo(x0 + .5, yb + .5); ctx.lineTo(W - M.r, yb + .5); ctx.stroke();
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (var v = 0; v <= P.h; v += 250) {
        var ty = oy + v * sc;
        ctx.beginPath(); ctx.moveTo(x0 - 4, ty + .5); ctx.lineTo(x0, ty + .5); ctx.stroke();
        ctx.fillText(String(v), x0 - 6, ty);
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (var u = 0; u <= P.w; u += 250) {
        var tx = ox + u * sc;
        ctx.beginPath(); ctx.moveTo(tx + .5, yb); ctx.lineTo(tx + .5, yb + 4); ctx.stroke();
        ctx.fillText(String(u), tx, yb + 6);
      }

      /* points */
      var elapsed = (time || performance.now()) - t0;
      var animating = elapsed < introMs;
      mouse.k += (mouse.target - mouse.k) * 0.18;
      var R = 52, push = 16 * mouse.k;
      var fill = [colors.moon, colors.ink, colors.skin];
      var cellPx = P.cell * sc;
      for (var cls = 0; cls < 3; cls++) {
        ctx.fillStyle = fill[cls];
        ctx.beginPath();
        for (var i = 0; i < pts.length; i++) {
          var p = pts[i];
          if (p.cls !== cls) continue;
          var px = ox + p.x * sc, py = oy + p.y * sc;
          var rad = cellPx * 0.5 * (p.lvl / 9) * MULT[cls] + 0.35;
          if (animating) {
            var local = Math.min(1, Math.max(0, (elapsed - (p.x / P.w) * 550 - (1 - p.y / P.h) * 150) / 850));
            if (local <= 0) continue;
            var e = ease(local);
            py = (H - M.b) + (py - (H - M.b)) * e;
            rad *= 0.4 + 0.6 * e;
          }
          if (push > 0.2) {
            var dx = px - mouse.x, dy = py - mouse.y, d2 = dx * dx + dy * dy;
            if (d2 < R * R && d2 > 0.01) {
              var d = Math.sqrt(d2), f = (1 - d / R); f = f * f * push;
              px += dx / d * f; py += dy / d * f;
            }
          }
          ctx.moveTo(px + rad, py);
          ctx.arc(px, py, rad, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      /* hover crosshair */
      if (hoverIdx >= 0 && !animating) {
        var h = pts[hoverIdx], hx = ox + h.x * sc, hy = oy + h.y * sc;
        ctx.save();
        ctx.strokeStyle = colors.hi; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, hy + .5); ctx.lineTo(hx, hy + .5); ctx.moveTo(hx + .5, hy); ctx.lineTo(hx + .5, yb); ctx.stroke();
        ctx.setLineDash([]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(hx, hy, Math.max(4, cellPx * .6), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      if (animating || Math.abs(mouse.target - mouse.k) > 0.01) kick();
    }
    function kick() { if (!raf) raf = requestAnimationFrame(draw); }

    var tip = $('plot-tip');
    function locate(ev) {
      var rect = canvas.getBoundingClientRect();
      var mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
      var ix = (mx - ox) / sc, iy = (my - oy) / sc;
      var c = Math.floor(ix / P.cell), r = Math.floor(iy / P.cell);
      var best = -1, bd = Infinity;
      for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) {
        var k = grid[(r + dr) + ',' + (c + dc)];
        if (k == null) continue;
        var q = pts[k], dd = (q.x - ix) * (q.x - ix) + (q.y - iy) * (q.y - iy);
        if (dd < bd) { bd = dd; best = k; }
      }
      return { mx: mx, my: my, idx: best };
    }
    canvas.addEventListener('pointermove', function (ev) {
      var L = locate(ev);
      mouse.fine = ev.pointerType === 'mouse';
      if (mouse.fine && !reduce) { mouse.x = L.mx; mouse.y = L.my; mouse.target = 1; }
      hoverIdx = L.idx;
      if (L.idx >= 0) {
        var q = pts[L.idx];
        tip.innerHTML = 'x ' + Math.round(q.x) + ' · y ' + Math.round(q.y) + '<br>' + CLASS_NAMES[q.cls] + ' · size ' + q.lvl + '/9';
        tip.style.left = L.mx + 'px'; tip.style.top = L.my + 'px';
        tip.hidden = false;
      } else tip.hidden = true;
      kick();
    });
    canvas.addEventListener('pointerleave', function () { mouse.target = 0; hoverIdx = -1; tip.hidden = true; kick(); });

    readColors();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas); else addEventListener('resize', resize);
    resize();
    var recolor = function () { readColors(); kick(); };
    new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor); } catch (e) {}
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { kick(); });
  })();

  /* ---------------- live preview from editor.html ---------------- */
  if (/[?&]preview\b/.test(location.search)) {
    window.addEventListener('message', function (ev) {
      if (ev.data && ev.data.type === 'site-draft') render(ev.data.site);
    });
    if (window.parent !== window) window.parent.postMessage({ type: 'site-ready' }, '*');
  }

  /* ---------------- theme, header, copy ---------------- */
  var root = document.documentElement;
  try { var saved = localStorage.getItem('ps-theme'); if (saved) root.setAttribute('data-theme', saved); } catch (e) {}
  $('theme-btn').addEventListener('click', function (ev) {
    var current = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = current === 'dark' ? 'light' : 'dark';
    var apply = function () { root.setAttribute('data-theme', next); };
    try { localStorage.setItem('ps-theme', next); } catch (e) {}
    /* circular "ink" reveal from the button where the browser supports it */
    if (!document.startViewTransition || !root.classList.contains('js-motion')) { apply(); return; }
    var b = ev.currentTarget.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
    var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(function () {
      root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 650, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () {});
  });
  var header = document.querySelector('.site-header');
  var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  $('copy-btn').addEventListener('click', function () {
    var el = $('email'), status = $('copy-status');
    var selectIt = function () {
      var r = document.createRange(); r.selectNodeContents(el);
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
      status.textContent = 'Selected. Press Ctrl+C or ⌘C to copy.';
    };
    try { navigator.clipboard.writeText(el.textContent.trim()).then(function () { status.textContent = 'Copied to clipboard.'; }, selectIt); }
    catch (e) { selectIt(); }
  });
})();
