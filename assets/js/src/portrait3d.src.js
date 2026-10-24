/* 3D self-portrait (three.js). Source file: the site loads the bundled assets/js/portrait3d.js.
   Rebuild after editing:  npx esbuild assets/js/src/portrait3d.src.js --bundle --minify --format=iife --outfile=assets/js/portrait3d.js
   The 7,863 data points from portrait-points.js become a 3D point cloud: they fly in and assemble,
   the moon sits at the back and the face bulges forward, the figure tilts toward the mouse,
   points move aside under the cursor, and hovering still inspects a single point. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, Points, ShaderMaterial,
  LineSegments, LineBasicMaterial, Group, Vector3, Color, AdditiveBlending, NormalBlending
} from 'three';

(function () {
  'use strict';
  var P = window.PORTRAIT_POINTS;
  var wrap = document.getElementById('plot-canvas');
  var flat = document.getElementById('portrait-canvas');
  var tip = document.getElementById('plot-tip');
  if (!P || !wrap || !flat) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;     // keep the 2D plot

  var renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    if (!renderer.getContext()) return;
  } catch (e) { return; }

  /* ---------- data ---------- */
  var AL = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ';
  var NAMES = ['moon', 'hair & lines', 'skin'];
  var pts = [], grid = {};
  P.rows.forEach(function (row, r) {
    for (var c = 0; c < row.length; c++) {
      var ch = row.charAt(c);
      if (ch === '.') continue;
      var i = AL.indexOf(ch);
      grid[r + ',' + c] = pts.length;
      pts.push({ x: c * P.cell + P.cell / 2, y: r * P.cell + P.cell / 2, cls: Math.floor(i / 9), lvl: i % 9 + 1, r: r, c: c });
    }
  });
  var N = pts.length, HALF = P.h / 2;
  // face centre = centroid of skin points, used for the 3D relief
  var fx = 0, fy = 0, fn = 0;
  pts.forEach(function (p) { if (p.cls === 2) { fx += p.x; fy += p.y; fn++; } });
  fx = (fx / fn - P.w / 2) / HALF; fy = -(fy / fn - P.h / 2) / HALF;

  var pos = new Float32Array(N * 3), start = new Float32Array(N * 3), size = new Float32Array(N), cls = new Float32Array(N), delay = new Float32Array(N);
  var MULT = [0.55, 1.0, 0.82];
  function rnd(seed) { var x = Math.sin(seed * 127.1) * 43758.5453; return x - Math.floor(x); }
  for (var k = 0; k < N; k++) {
    var p = pts[k];
    var x = (p.x - P.w / 2) / HALF, y = -(p.y - P.h / 2) / HALF, z;
    if (p.cls === 0) {
      z = -0.32 - 0.12 * (x * x + y * y);                        // moon: a curved backdrop
    } else {
      var d2 = ((x - fx) * (x - fx)) / 0.30 + ((y - fy) * (y - fy)) / 0.42;
      var bulge = Math.sqrt(Math.max(0, 1 - d2));                // head/face rounded forward
      z = (p.cls === 2 ? 0.10 : 0.04) + 0.30 * bulge;
    }
    z += (rnd(k + 1) - 0.5) * 0.02;
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
    // start: scattered in a wide shell around the figure
    var th = rnd(k + 7) * Math.PI * 2, ph = Math.acos(2 * rnd(k + 13) - 1), rr = 1.6 + rnd(k + 29) * 1.6;
    start[k * 3] = rr * Math.sin(ph) * Math.cos(th);
    start[k * 3 + 1] = rr * Math.sin(ph) * Math.sin(th) * 0.8;
    start[k * 3 + 2] = rr * Math.cos(ph) * 0.9;
    size[k] = (p.lvl / 9) * MULT[p.cls];
    cls[k] = p.cls;
    delay[k] = (p.x / P.w) * 0.5 + (1 - p.y / P.h) * 0.18 + rnd(k + 41) * 0.28;
  }
  var geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aStart', new BufferAttribute(start, 3));
  geo.setAttribute('aSize', new BufferAttribute(size, 1));
  geo.setAttribute('aCls', new BufferAttribute(cls, 1));
  geo.setAttribute('aDelay', new BufferAttribute(delay, 1));

  /* ---------- colours from the site theme ---------- */
  function cssColor(name) {
    var probe = document.createElement('span');
    probe.style.color = 'var(' + name + ')';
    document.body.appendChild(probe);
    var v = getComputedStyle(probe).color;
    probe.remove();
    var m = v.match(/[\d.]+/g) || [0, 0, 0, 1];
    return { c: new Color(+m[0] / 255, +m[1] / 255, +m[2] / 255), a: m.length > 3 ? +m[3] : 1 };
  }

  var uniforms = {
    uT: { value: 0 }, uTime: { value: 0 }, uDpr: { value: 1 }, uSize: { value: 30 },
    uMouse: { value: new Vector3(9, 9, 0) }, uMouseK: { value: 0 }, uScatter: { value: 0 },
    uC0: { value: new Color() }, uC1: { value: new Color() }, uC2: { value: new Color() }, uA0: { value: 0.5 }
  };
  var mat = new ShaderMaterial({
    uniforms: uniforms, transparent: true, depthWrite: false, blending: NormalBlending,
    vertexShader: [
      'uniform float uT, uTime, uDpr, uSize, uMouseK, uScatter;',
      'uniform vec3 uMouse;',
      'attribute vec3 aStart; attribute float aSize, aCls, aDelay;',
      'varying float vCls, vA;',
      'void main() {',
      '  float t = clamp((uT - aDelay) / 0.9, 0.0, 1.0);',
      '  t = 1.0 - pow(1.0 - t, 3.0);',
      '  vec3 p = mix(aStart, position, t);',
      '  p.z += sin(uTime * 1.1 + position.x * 5.0 + position.y * 3.0) * 0.012 * t;',
      '  p += vec3(position.xy * 0.35, position.z * 1.6 + 0.25) * uScatter * (0.6 + aDelay);',
      '  vec2 d = p.xy - uMouse.xy; float dist = length(d);',
      '  float f = smoothstep(0.24, 0.0, dist) * uMouseK * t;',
      '  p += vec3(normalize(d + 1e-5) * f * 0.07, f * 0.22);',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  gl_Position = projectionMatrix * mv;',
      '  gl_PointSize = max(1.0, uSize * aSize * uDpr * (1.0 / -mv.z) * mix(0.5, 1.0, t) * (1.0 + f * 0.8));',
      '  vCls = aCls; vA = t;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uC0, uC1, uC2; uniform float uA0;',
      'varying float vCls, vA;',
      'void main() {',
      '  vec2 c = gl_PointCoord - 0.5; float r = length(c);',
      '  if (r > 0.5) discard;',
      '  vec3 col = vCls < 0.5 ? uC0 : (vCls < 1.5 ? uC1 : uC2);',
      '  float a = (vCls < 0.5 ? uA0 : 1.0) * smoothstep(0.5, 0.38, r) * vA;',
      '  gl_FragColor = vec4(col, a);',
      '}'
    ].join('\n')
  });
  var cloud = new Points(geo, mat);

  /* ---------- axes (an L-shaped frame with ticks, like the 2D chart) ---------- */
  var AX = -0.42, xMin = -P.w / 2 / HALF - 0.06, yMin = -1.06;
  var ax = [xMin, yMin, AX, xMin, 1.02, AX, xMin, yMin, AX, P.w / 2 / HALF + 0.02, yMin, AX];
  for (var v = 0; v <= P.h; v += 250) { var ty = -(v - P.h / 2) / HALF; ax.push(xMin - 0.03, ty, AX, xMin, ty, AX); }
  for (var u = 0; u <= P.w; u += 250) { var tx = (u - P.w / 2) / HALF; ax.push(tx, yMin, AX, tx, yMin - 0.03, AX); }
  var axGeo = new BufferGeometry(); axGeo.setAttribute('position', new BufferAttribute(new Float32Array(ax), 3));
  var axMat = new LineBasicMaterial({ transparent: true, opacity: 0.7 });
  var axes = new LineSegments(axGeo, axMat);

  /* hover marker: crosshair to the axes + ring */
  var hairGeo = new BufferGeometry(); hairGeo.setAttribute('position', new BufferAttribute(new Float32Array(12), 3));
  var hairMat = new LineBasicMaterial({ transparent: true, opacity: 0.9 });
  var hair = new LineSegments(hairGeo, hairMat); hair.visible = false;
  var ringGeo = new BufferGeometry(); ringGeo.setAttribute('position', new BufferAttribute(new Float32Array(3), 3));
  var ringMat = new ShaderMaterial({
    uniforms: { uC: { value: new Color() }, uDpr: uniforms.uDpr }, transparent: true, depthTest: false,
    vertexShader: 'uniform float uDpr; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 22.0 * uDpr; }',
    fragmentShader: 'uniform vec3 uC; void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5,0.44,r) * smoothstep(0.34,0.40,r); if (a < 0.01) discard; gl_FragColor = vec4(uC, a); }'
  });
  var ring = new Points(ringGeo, ringMat); ring.visible = false;

  var fig = new Group();
  fig.add(axes, cloud, hair, ring);
  var scene = new Scene(); scene.add(fig);
  var camera = new PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 4.6);

  function readColors() {
    var m = cssColor('--moon'), h = cssColor('--hair'), s = cssColor('--s2'), f = cssColor('--faint'), b = cssColor('--blue');
    uniforms.uC0.value.copy(m.c); uniforms.uA0.value = m.a;
    uniforms.uC1.value.copy(h.c); uniforms.uC2.value.copy(s.c);
    axMat.color.copy(f.c); hairMat.color.copy(b.c); ringMat.uniforms.uC.value.copy(b.c);
  }

  /* ---------- mount ---------- */
  var cv = renderer.domElement;
  cv.className = 'portrait-3d';
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', flat.getAttribute('aria-label') + ', shown in 3D');
  var hero = document.querySelector('.hero') || wrap.parentNode;
  hero.insertBefore(cv, hero.firstChild);            // full-width stage behind the hero content
  flat.style.visibility = 'hidden';
  var plotFig = document.getElementById('plot');
  if (plotFig) { plotFig.dataset.three = '1'; plotFig.classList.add('is-3d'); }
  flat.setAttribute('aria-hidden', 'true');
  readColors();

  var W = 1, H = 1, box = { l: 0, t: 0, w: 1, h: 1 };
  function resize() {
    var hr = hero.getBoundingClientRect(), r = wrap.getBoundingClientRect();
    if (!r.width || !hr.width) return;
    W = hr.width; H = hr.height;
    box = { l: r.left - hr.left, t: r.top - hr.top, w: r.width, h: r.height };
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    uniforms.uDpr.value = dpr;
    uniforms.uSize.value = 0.008 * box.h * 4.6;       // dot size follows the portrait area
    camera.aspect = box.w / box.h;
    camera.position.z = box.w / box.h < 0.95 ? 4.6 / (box.w / box.h) * 0.95 : 4.6;
    // the card area shows the framed portrait; the rest of the hero is the same 3D space, extended
    camera.setViewOffset(box.w, box.h, -box.l, -box.t, W, H);
    camera.updateProjectionMatrix();
    kick();
  }

  /* ---------- interaction ---------- */
  var rot = { x: 0, y: 0 }, rotT = { x: 0, y: 0 }, mouseOn = false, kT = 0, hoverIdx = -1;
  var tmp = new Vector3(), org = new Vector3(), dir = new Vector3();
  function localHit(cx, cy) {
    var r = cv.getBoundingClientRect();
    tmp.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1, 0.5).unproject(camera);
    org.copy(camera.position); dir.copy(tmp).sub(org).normalize();
    fig.updateMatrixWorld();
    var o = fig.worldToLocal(org.clone()), e = fig.worldToLocal(org.clone().add(dir));
    var dl = e.sub(o);
    if (Math.abs(dl.z) < 1e-6) return null;
    var t = (0.15 - o.z) / dl.z;                       // plane through the middle of the figure
    return o.add(dl.multiplyScalar(t));
  }
  function nearest(h) {
    var dx = h.x * HALF + P.w / 2, dy = -h.y * HALF + P.h / 2;
    var c = Math.floor(dx / P.cell), r = Math.floor(dy / P.cell), best = -1, bd = Infinity;
    for (var a = -2; a <= 2; a++) for (var b = -2; b <= 2; b++) {
      var k = grid[(r + a) + ',' + (c + b)];
      if (k == null) continue;
      var q = pts[k], dd = (q.x - dx) * (q.x - dx) + (q.y - dy) * (q.y - dy);
      if (dd < bd) { bd = dd; best = k; }
    }
    return bd < (P.cell * 2.2) * (P.cell * 2.2) ? best : -1;
  }
  function inBox(ev) {
    var r = wrap.getBoundingClientRect();
    return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
  }
  hero.addEventListener('pointermove', function (ev) {
    var hr = hero.getBoundingClientRect();
    var overPlot = inBox(ev);
    if (!overPlot) { rotT.y = ((ev.clientX - hr.left) / hr.width - 0.5) * 0.7; rotT.x = ((ev.clientY - hr.top) / hr.height - 0.5) * 0.35; }
    else { rotT.y *= 0.4; rotT.x *= 0.4; }
    mouseOn = true; kick();
  });
  hero.addEventListener('pointerleave', function () { mouseOn = false; rotT.x = rotT.y = 0; kick(); });
  function clearHover() { kT = 0; hoverIdx = -1; if (tip) tip.hidden = true; hair.visible = ring.visible = false; kick(); }
  hero.addEventListener('pointermove', function (ev) {
    if (!inBox(ev)) { if (hoverIdx >= 0 || kT) clearHover(); return; }
    var h = localHit(ev.clientX, ev.clientY);
    if (!h) return;
    uniforms.uMouse.value.set(h.x, h.y, 0);
    kT = ev.pointerType === 'mouse' ? 1 : 0;
    var k = nearest(h);
    hoverIdx = k;
    if (k >= 0 && tip) {
      var q = pts[k];
      tip.innerHTML = 'x ' + Math.round(q.x) + ' · y ' + Math.round(q.y) + '<br>' + NAMES[q.cls] + ' · size ' + q.lvl + '/9';
      var r = wrap.getBoundingClientRect();
      tip.style.left = (ev.clientX - r.left) + 'px'; tip.style.top = (ev.clientY - r.top) + 'px';
      tip.hidden = false;
      var px = pos[k * 3], py = pos[k * 3 + 1], pz = pos[k * 3 + 2];
      var hp = hairGeo.attributes.position.array;
      hp.set([xMin, py, pz, px, py, pz, px, yMin, pz, px, py, pz]);
      hairGeo.attributes.position.needsUpdate = true;
      ringGeo.attributes.position.array.set([px, py, pz]); ringGeo.attributes.position.needsUpdate = true;
      hair.visible = ring.visible = true;
    } else { if (tip) tip.hidden = true; hair.visible = ring.visible = false; }
    kick();
  });
  hero.addEventListener('pointerleave', clearHover);

  /* ---------- loop (only runs while the portrait is on screen) ---------- */
  var t0 = performance.now() + ((window.MOTION && window.MOTION.plotDelay) || 0);
  var raf = 0, visible = true, last = performance.now();
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var el = (now - t0) / 1000;
    uniforms.uT.value = Math.max(0, el / 1.35);
    uniforms.uTime.value = now / 1000;
    var idle = mouseOn ? 0 : 1;
    var sway = Math.sin(now / 2600) * 0.16 * idle, nod = Math.sin(now / 3700) * 0.05 * idle;
    rot.y += (rotT.y + sway - rot.y) * Math.min(1, dt * 4);
    rot.x += (rotT.x + nod - rot.x) * Math.min(1, dt * 4);
    fig.rotation.set(rot.x, rot.y, 0);
    uniforms.uMouseK.value += (kT - uniforms.uMouseK.value) * Math.min(1, dt * 8);
    var hh = hero.offsetHeight || 1;
    uniforms.uScatter.value = Math.min(1, Math.max(0, window.scrollY / hh)) * 0.55;
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(function (en) { visible = en[0].isIntersecting; kick(); }).observe(hero);
  document.addEventListener('visibilitychange', kick);
  if (window.ResizeObserver) { var ro = new ResizeObserver(resize); ro.observe(wrap); ro.observe(hero); } else addEventListener('resize', resize);
  new MutationObserver(function () { readColors(); kick(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { readColors(); kick(); }); } catch (e) {}
  resize();
  kick();
})();
