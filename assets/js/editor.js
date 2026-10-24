/* Form editor for content.js. Builds the form from SCHEMA, keeps a draft in this browser,
   sends it to the live preview, and exports a new content.js. */
(function () {
  'use strict';

  var STORAGE_KEY = 'ps-site-draft-v7';
  var KNOWN_IMAGES = [
    'assets/img/splash-portrait.webp', 'assets/img/portrait-bw.webp',
    'assets/img/ps-furniture-chair.webp', 'assets/img/workshop.webp', 'assets/img/moon-portrait.webp'
  ];

  var SCHEMA = [
    { key: 'profile', title: 'Profile', type: 'object', help: 'Your name and the first thing visitors read.', fields: [
      { key: 'name', label: 'Full name' },
      { key: 'role', label: 'Job title', placeholder: 'Data Analyst' },
      { key: 'location', label: 'Location', placeholder: 'Bhaktapur, Nepal' },
      { key: 'headline', label: 'Intro sentence', type: 'textarea', help: 'Wrap words in *stars* to colour them.' },
      { key: 'email', label: 'Email', inputType: 'email' },
      { key: 'resume', label: 'CV file (PDF)', placeholder: 'assets/Proshan-Shilakar-CV.pdf', help: 'Put your CV PDF in the assets folder and type its path here. A "Download CV" button then appears in the top section and in Contact. A Google Drive link also works.' },
      { key: 'showRanjanaName', label: 'Show my name in Ranjana script', type: 'bool' }
    ] },
    { key: 'experience', title: 'Experience', type: 'list', addLabel: 'Add job', itemTitle: 'role',
      help: 'Jobs and roles, newest first. Dates draw the career timeline chart. Use a year (2023), month and year (Mar 2023) or 2023-03. Leave End empty if you still work there.', item: [
      { key: 'role', label: 'Job title', placeholder: 'Data Analyst' },
      { key: 'company', label: 'Company', placeholder: 'Company name' },
      { key: 'area', label: 'Field (colours the timeline)', placeholder: 'Data, Insurance, Sales…' },
      { key: 'place', label: 'Place (optional)', placeholder: 'Kathmandu' },
      { key: 'start', label: 'Start', placeholder: 'Mar 2023' },
      { key: 'end', label: 'End', placeholder: 'Present' },
      { key: 'text', label: 'What you did (optional)', type: 'textarea', placeholder: 'Built weekly sales dashboards for 12 branches…' }
    ] },
    { key: 'caseStudies', title: 'Case studies (data projects)', type: 'list', addLabel: 'Add case study', itemTitle: 'title',
      help: 'Your best data work. One clear number (the result) makes each one stronger. Don’t share confidential company data; round or describe it instead.', item: [
      { key: 'title', label: 'Project name', placeholder: 'Claims turnaround analysis' },
      { key: 'area', label: 'Field', placeholder: 'Insurance' },
      { key: 'metricValue', label: 'Headline number', placeholder: '−23%' },
      { key: 'metricLabel', label: 'What the number means', placeholder: 'faster claim settlement' },
      { key: 'question', label: 'Question', type: 'textarea', placeholder: 'What were you trying to find out?' },
      { key: 'approach', label: 'Approach', type: 'textarea', placeholder: 'Data you used and how you analysed it.' },
      { key: 'result', label: 'Result', type: 'textarea', placeholder: 'What changed because of it?' },
      { key: 'tools', label: 'Tools', type: 'tags', help: 'Separate with commas, e.g. SQL, Excel, Power BI, Python' },
      { key: 'image', label: 'Screenshot (optional)', type: 'image' },
      { key: 'link', label: 'Link (optional)', inputType: 'url', placeholder: 'https://' },
      { key: 'linkLabel', label: 'Link text', placeholder: 'View dashboard' }
    ] },
    { key: 'skills', title: 'Toolkit (years per tool)', type: 'list', addLabel: 'Add tool group', itemTitle: 'group',
      help: 'Bars show years of use. Use 0.5 for six months, 0.25 for three months. Tip: add a "Data" group first.', item: [
      { key: 'group', label: 'Group name', placeholder: 'Data' },
      { key: 'items', label: 'Skills', type: 'list', addLabel: 'Add skill', itemTitle: 'name', item: [
        { key: 'name', label: 'Skill', placeholder: 'Excel' },
        { key: 'years', label: 'Years used', type: 'number', step: 0.25 }
      ] }
    ] },
    { key: 'expertise', title: 'Skills', type: 'object', help: 'Short skill lists shown as tags. Remove every group to hide this section.', fields: [
      { key: 'heading', label: 'Heading', placeholder: 'Skills' },
      { key: 'groups', label: 'Skill groups', type: 'list', addLabel: 'Add skill group', itemTitle: 'group', item: [
        { key: 'group', label: 'Group name', placeholder: 'Data analytics' },
        { key: 'items', label: 'Skill', type: 'list', of: 'text', addLabel: 'Add skill' }
      ] }
    ] },
    { key: 'about', title: 'About', type: 'object', fields: [
      { key: 'heading', label: 'Heading', placeholder: 'About me' },
      { key: 'intro', label: 'Big intro line' },
      { key: 'paragraphs', label: 'Paragraphs', type: 'list', of: 'textarea', addLabel: 'Add paragraph' },
      { key: 'photo', label: 'Photo', type: 'image' },
      { key: 'facts', label: 'Quick facts', type: 'list', addLabel: 'Add fact', itemTitle: 'label', item: [
        { key: 'label', label: 'Label', placeholder: 'Based in' },
        { key: 'value', label: 'Value', placeholder: 'Bhaktapur, Nepal' }
      ] },
      { key: 'interests', label: 'Interests', type: 'list', addLabel: 'Add interest', itemTitle: 'title', item: [
        { key: 'title', label: 'Title', placeholder: 'Design' },
        { key: 'text', label: 'Text', type: 'textarea' }
      ] }
    ] },
    { key: 'services', title: 'What I do (fields table)', type: 'list', addLabel: 'Add field', itemTitle: 'title',
      help: 'Each row of the table. The description is optional.', item: [
      { key: 'title', label: 'Field', placeholder: 'Data analytics' },
      { key: 'text', label: 'Focus (optional)', type: 'textarea', placeholder: 'Reporting, dashboards, forecasting' }
    ] },
    { key: 'sideProjects', title: 'Beyond data (story cards)', type: 'list', addLabel: 'Add story', itemTitle: 'title',
      help: 'Each one becomes a swipeable card. Write the full story below and the card gets a "Read story" button that opens it like a blog post.', item: [
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category', placeholder: 'Woodwork' },
      { key: 'date', label: 'Date (optional)', placeholder: 'Oct 2026' },
      { key: 'text', label: 'Short summary (shown on the card)', type: 'textarea' },
      { key: 'body', label: 'Story paragraphs (the blog post)', type: 'list', of: 'textarea', addLabel: 'Add paragraph' },
      { key: 'images', label: 'Pictures (the first one is the card cover)', type: 'list', of: 'image', addLabel: 'Add picture', max: 6 },
      { key: 'tags', label: 'Tags', type: 'tags', help: 'Separate with commas' },
      { key: 'link', label: 'Link (optional)', inputType: 'url', placeholder: 'https://' }
    ] },
    { key: 'socials', title: 'Social links', type: 'list', addLabel: 'Add link', itemTitle: 'label', item: [
      { key: 'label', label: 'Name', placeholder: 'GitHub' },
      { key: 'url', label: 'Web address', inputType: 'url', placeholder: 'https://' }
    ] },
    { key: 'footer', title: 'Footer (Nyatapola drawing)', type: 'object', fields: [
      { key: 'showTemple', label: 'Show the Nyatapola drawing', type: 'bool' },
      { key: 'heading', label: 'Heading', placeholder: 'Made in Bhaktapur' },
      { key: 'text', label: 'Short text', type: 'textarea' }
    ] },
    { key: 'contact', title: 'Contact', type: 'object', fields: [
      { key: 'heading', label: 'Heading', placeholder: "Let's talk data" },
      { key: 'text', label: 'Short message (optional)', type: 'textarea' }
    ] }
  ];

  var HEADER = "/*\n  ============================================================\n  ALL THE WORDS, LINKS AND PICTURES ON YOUR SITE LIVE HERE.\n  ============================================================\n\n  Easiest way to edit: open editor.html in your browser, fill in\n  the forms, then click \"Download content.js\" and replace this file.\n\n  Editing by hand also works. Rules:\n  - Keep text inside \"double quotes\". To use a quote mark inside the\n    text, type \\\" instead.\n  - Put a comma between items.\n  - A list [ ] that is empty hides that section on the website.\n  - Pictures go in the folder assets/img/ - then type the path here,\n    for example \"assets/img/my-dashboard.png\".\n  - In the \"headline\", wrap words in *stars* to colour them.\n*/\n";

  /* ---------- state ---------- */
  var clone = function (o) { return JSON.parse(JSON.stringify(o == null ? {} : o)); };
  var original = clone(window.SITE || {});
  var draft = clone(original);
  var openPaths = { 'profile': true, 'experience': true, 'caseStudies': true };
  var $ = function (id) { return document.getElementById(id); };

  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      var parsed = JSON.parse(saved);
      if (JSON.stringify(parsed) !== JSON.stringify(original)) { draft = parsed; $('draft-banner').hidden = false; }
    }
  } catch (e) {}

  function getAt(path) { return path.reduce(function (o, k) { return o == null ? undefined : o[k]; }, draft); }
  function setAt(path, val) {
    var o = draft;
    for (var i = 0; i < path.length - 1; i++) {
      var k = path[i];
      if (o[k] == null || typeof o[k] !== 'object') o[k] = typeof path[i + 1] === 'number' ? [] : {};
      o = o[k];
    }
    o[path[path.length - 1]] = val;
  }
  function blankFor(field) {
    if (field.of) return '';
    var o = {};
    (field.item || []).forEach(function (f) {
      o[f.key] = f.type === 'list' || f.type === 'tags' ? [] : f.type === 'number' ? 0 : f.type === 'bool' ? false : '';
    });
    return o;
  }

  /* ---------- change handling ---------- */
  var saveTimer, previewTimer;
  function changed() {
    $('status').textContent = 'Unsaved changes · kept in this browser';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch (e) {} }, 250);
    clearTimeout(previewTimer);
    previewTimer = setTimeout(sendPreview, 120);
  }
  function sendPreview() {
    var f = $('preview');
    try { f.contentWindow.postMessage({ type: 'site-draft', site: draft }, '*'); } catch (e) {}
  }
  window.addEventListener('message', function (ev) { if (ev.data && ev.data.type === 'site-ready') sendPreview(); });
  $('preview').addEventListener('load', function () { setTimeout(sendPreview, 50); });

  /* ---------- form builders ---------- */
  var uid = 0;
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function inputField(field, path, opts) {
    opts = opts || {};
    var id = 'f' + (++uid);
    var val = getAt(path);
    var type = field.type || 'text';
    var wrap = el('div', { class: 'field' });

    if (type === 'bool') {
      var cb = el('input', { type: 'checkbox', id: id });
      cb.checked = val !== false;
      cb.addEventListener('change', function () { setAt(path, cb.checked); changed(); });
      wrap.appendChild(el('label', { class: 'check', for: id }, [cb, field.label]));
      return wrap;
    }

    if (!opts.noLabel) wrap.appendChild(el('label', { for: id, text: field.label }));
    var input;
    if (type === 'textarea') {
      input = el('textarea', { id: id, placeholder: field.placeholder || '', rows: 3 });
      input.value = val == null ? '' : val;
      input.addEventListener('input', function () { setAt(path, input.value); changed(); if (opts.onTitle) opts.onTitle(input.value); });
    } else if (type === 'number') {
      input = el('input', { type: 'number', id: id, step: field.step || 'any', min: 0, inputmode: 'decimal' });
      input.value = val == null ? '' : val;
      input.addEventListener('input', function () { var n = parseFloat(input.value); setAt(path, isNaN(n) ? 0 : n); changed(); });
    } else if (type === 'tags') {
      input = el('input', { type: 'text', id: id, placeholder: field.placeholder || '' });
      input.value = Array.isArray(val) ? val.join(', ') : '';
      input.addEventListener('input', function () {
        setAt(path, input.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean)); changed();
      });
    } else if (type === 'image') {
      input = el('input', { type: 'text', id: id, list: 'known-images', placeholder: 'assets/img/your-picture.jpg' });
      input.value = val == null ? '' : val;
      var thumb = el('span', { class: 'thumb', 'aria-hidden': 'true' });
      var setThumb = function () { thumb.style.backgroundImage = input.value ? 'url("' + input.value.replace(/"/g, '') + '")' : 'none'; };
      setThumb();
      input.addEventListener('input', function () { setAt(path, input.value.trim()); setThumb(); changed(); });
      wrap.appendChild(el('div', { class: 'image-row' }, [thumb, input]));
      if (field.help) wrap.appendChild(el('span', { class: 'help', text: field.help }));
      return wrap;
    } else {
      input = el('input', { type: field.inputType || 'text', id: id, placeholder: field.placeholder || '' });
      input.value = val == null ? '' : val;
      input.addEventListener('input', function () { setAt(path, input.value); changed(); if (opts.onTitle) opts.onTitle(input.value); });
    }
    if (opts.noLabel) input.setAttribute('aria-label', field.label || 'Value');
    wrap.appendChild(input);
    if (field.help) wrap.appendChild(el('span', { class: 'help', text: field.help }));
    return wrap;
  }

  function listField(field, path, isTop) {
    var box = el('div', { class: 'list' });
    if (!isTop) box.appendChild(el('span', { class: 'list-label', text: field.label }));
    var holder = el('div', { class: 'list' });
    box.appendChild(holder);

    function rebuild() {
      holder.innerHTML = '';
      var arr = getAt(path);
      if (!Array.isArray(arr)) { arr = []; setAt(path, arr); }
      if (!arr.length) holder.appendChild(el('p', { class: 'empty-note', text: 'Nothing here yet.' }));

      arr.forEach(function (_, i) {
        var ipath = path.concat(i);
        var move = function (d) {
          var a = getAt(path), j = i + d;
          if (j < 0 || j >= a.length) return;
          var t = a[i]; a[i] = a[j]; a[j] = t;
          var k1 = ipath.join('.'), k2 = path.concat(j).join('.');
          var o1 = openPaths[k1]; openPaths[k1] = openPaths[k2]; openPaths[k2] = o1;
          changed(); rebuild();
        };
        var del = function () { getAt(path).splice(i, 1); changed(); rebuild(); };
        var tools = [
          el('button', { type: 'button', class: 'icon-btn', title: 'Move up', 'aria-label': 'Move up', disabled: i === 0, onclick: function () { move(-1); }, text: '↑' }),
          el('button', { type: 'button', class: 'icon-btn', title: 'Move down', 'aria-label': 'Move down', disabled: i === arr.length - 1, onclick: function () { move(1); }, text: '↓' }),
          el('button', { type: 'button', class: 'icon-btn del', title: 'Remove', 'aria-label': 'Remove', onclick: del, text: '✕' })
        ];

        if (field.of) {
          var sub = { type: field.of, label: field.label + ' ' + (i + 1) };
          holder.appendChild(el('div', { class: 'item simple' }, [inputField(sub, ipath, { noLabel: true }), el('div', { class: 'tools' }, tools)]));
          return;
        }

        var key = ipath.join('.');
        var item = el('div', { class: 'item' });
        var titleText = function (v) {
          v = (v || '').trim();
          title.textContent = v || 'Untitled';
          title.classList.toggle('empty', !v);
        };
        var title = el('span', { class: 'item-title', role: 'button', tabindex: 0 });
        var body = el('div', { class: 'item-body' });
        var toggle = function () { openPaths[key] = !openPaths[key]; body.hidden = !openPaths[key]; };
        title.addEventListener('click', toggle);
        title.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
        titleText((getAt(ipath) || {})[field.itemTitle]);
        item.appendChild(el('div', { class: 'item-head' }, [title].concat(tools)));
        field.item.forEach(function (f) {
          var fp = ipath.concat(f.key);
          body.appendChild(f.type === 'list' ? listField(f, fp) :
            inputField(f, fp, f.key === field.itemTitle ? { onTitle: titleText } : null));
        });
        body.hidden = !openPaths[key];
        item.appendChild(body);
        holder.appendChild(item);
      });

      if (!field.max || arr.length < field.max) {
        holder.appendChild(el('button', { type: 'button', class: 'add-btn', text: '+ ' + (field.addLabel || 'Add'), onclick: function () {
          var a = getAt(path); a.push(blankFor(field));
          openPaths[path.concat(a.length - 1).join('.')] = true;
          changed(); rebuild();
          var inputs = holder.querySelectorAll('input, textarea');
          var last = holder.lastElementChild && holder.lastElementChild.previousElementSibling;
          var focusTarget = last && last.querySelector('input, textarea');
          if (focusTarget) focusTarget.focus(); else if (inputs.length) inputs[inputs.length - 1].focus();
        } }));
      }
      if (typeof updateCounts === 'function') updateCounts();
    }
    rebuild();
    return box;
  }

  var countEls = {};
  function updateCounts() {
    Object.keys(countEls).forEach(function (k) {
      var a = draft[k];
      countEls[k].textContent = Array.isArray(a) ? (a.length ? a.length + (a.length === 1 ? ' item' : ' items') : 'empty · hidden') : '';
    });
  }

  function buildForm() {
    var root = $('form-root');
    root.innerHTML = '';
    countEls = {};
    var dl = el('datalist', { id: 'known-images' });
    KNOWN_IMAGES.forEach(function (src) { dl.appendChild(el('option', { value: src })); });
    root.appendChild(dl);

    SCHEMA.forEach(function (sec) {
      var d = el('details', { class: 'section' });
      if (openPaths[sec.key]) d.open = true;
      d.addEventListener('toggle', function () { openPaths[sec.key] = d.open; });
      var count = el('span', { class: 'count' });
      if (sec.type === 'list') countEls[sec.key] = count;
      d.appendChild(el('summary', {}, [sec.title, count]));
      var body = el('div', { class: 'section-body' });
      if (sec.help) body.appendChild(el('p', { class: 'section-help', text: sec.help }));
      if (sec.type === 'object') {
        if (!draft[sec.key] || typeof draft[sec.key] !== 'object') draft[sec.key] = {};
        sec.fields.forEach(function (f) {
          var fp = [sec.key, f.key];
          body.appendChild(f.type === 'list' ? listField(f, fp) : inputField(f, fp));
        });
      } else {
        body.appendChild(listField(sec, [sec.key], true));
      }
      d.appendChild(body);
      root.appendChild(d);
    });
    updateCounts();
  }

  /* ---------- export ---------- */
  function fileText() { return HEADER + 'window.SITE = ' + JSON.stringify(draft, null, 2) + ';\n'; }
  function toast(msg) {
    var t = el('div', { class: 'toast', role: 'status', text: msg });
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }

  $('download-btn').addEventListener('click', function () {
    try {
      var blob = new Blob([fileText()], { type: 'text/javascript' });
      var a = el('a', { href: URL.createObjectURL(blob), download: 'content.js' });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      $('status').textContent = 'Downloaded · replace content.js in your site folder';
      toast('content.js downloaded. Replace the old file in your site folder.');
    } catch (e) { openCode(); }
  });

  function openCode() {
    $('code-text').value = fileText();
    $('copy-status').textContent = '';
    $('code-modal').hidden = false;
    $('code-text').focus(); $('code-text').select();
  }
  $('code-btn').addEventListener('click', openCode);
  $('code-close').addEventListener('click', function () { $('code-modal').hidden = true; });
  $('code-copy').addEventListener('click', function () {
    var ta = $('code-text');
    var fallback = function () { ta.focus(); ta.select(); $('copy-status').textContent = 'Selected. Press Ctrl+C or ⌘C.'; };
    try { navigator.clipboard.writeText(ta.value).then(function () { $('copy-status').textContent = 'Copied.'; }, fallback); }
    catch (e) { fallback(); }
  });

  $('reset-btn').addEventListener('click', function () { $('confirm-modal').hidden = false; $('confirm-no').focus(); });
  $('confirm-no').addEventListener('click', function () { $('confirm-modal').hidden = true; });
  $('confirm-yes').addEventListener('click', function () {
    draft = clone(original);
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    $('confirm-modal').hidden = true; $('draft-banner').hidden = true;
    $('status').textContent = 'Back to content.js';
    buildForm(); sendPreview();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { $('code-modal').hidden = true; $('confirm-modal').hidden = true; }
  });

  /* ---------- preview width ---------- */
  function setWidth(phone) {
    $('frame-wrap').classList.toggle('phone', phone);
    $('pv-phone').setAttribute('aria-pressed', phone);
    $('pv-desktop').setAttribute('aria-pressed', !phone);
  }
  $('pv-phone').addEventListener('click', function () { setWidth(true); });
  $('pv-desktop').addEventListener('click', function () { setWidth(false); });

  buildForm();
  if (!$('draft-banner').hidden) $('status').textContent = 'Unsaved changes · kept in this browser';
})();
