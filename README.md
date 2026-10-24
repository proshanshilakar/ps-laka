# proshanshilakar.com.np

Portfolio of Proshan Shilakar, data analyst. A static site with no build step.

- `content.js`: all text, jobs, case studies, skills, toolkit and pictures
- `editor.html`: form editor with live preview that saves a new content.js
- `index.html`, `assets/`: page structure, styles and scripts
- `assets/js/portrait-points.js`: the hero self-portrait as data points
- `assets/js/motion.js`: animations (plain JavaScript, no libraries)
- `assets/js/portrait3d.js`: the 3D self-portrait, built with three.js (bundled; source in `assets/js/src/portrait3d.src.js`).
  To rebuild after editing the source: `npx esbuild assets/js/src/portrait3d.src.js --bundle --minify --format=iife --outfile=assets/js/portrait3d.js`
  (needs `npm install three@0.160.0 esbuild` once). If 3D isn't available, or a visitor prefers reduced motion, the 2D portrait is shown instead.

See **HOW-TO-EDIT.md** for step-by-step instructions.
