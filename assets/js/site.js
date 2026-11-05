/* ============================================================
   Cube.Design by GobbleCube — site behaviour
   Everything here is progressive enhancement: the built HTML
   reads fine with JS disabled. Only the cube, rulers and the
   scroll chip need scripting.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------
     0. Cube tile imagery
     Placeholder photography (Lorem Picsum -> Unsplash). Swap for
     your own paths or CMS URLs. The cube reads best with
     high-contrast, high-saturation images; muted photography
     turns to grey mush at 140px.
     ---------------------------------------------------------- */
  function tile(i, s) {
    return 'https://picsum.photos/seed/gcd' + i + '/' + (s || 400) + '/' + (s || 400);
  }

  /* ----------------------------------------------------------
     1. Ruler ticks — every 50px, rebuilt on resize
     ---------------------------------------------------------- */
  function buildRulers() {
    var step = 50, h = window.innerHeight + step;
    var rails = document.querySelectorAll('[data-rail]');
    for (var r = 0; r < rails.length; r++) {
      var html = '';
      for (var y = 0; y <= h; y += step) {
        html += '<div class="tick" style="top:' + y + 'px">' +
                '<span class="tick__line"></span>' +
                '<span class="tick__num">' + y + '</span>' +
                '</div>';
      }
      rails[r].innerHTML = html;
    }
  }

  /* ----------------------------------------------------------
     2. Cube — 6 faces x 3x3 photo grid
     ---------------------------------------------------------- */
  function buildCube(cube) {
    var faces = ['f', 'b', 'r', 'l', 'u', 'd'];
    var n = 0, html = '';
    for (var f = 0; f < faces.length; f++) {
      html += '<div class="face face--' + faces[f] + '">';
      for (var i = 0; i < 9; i++) {
        n++;
        html += '<img src="' + tile(n) + '" alt="" draggable="false" loading="' +
                (n > 18 ? 'lazy' : 'eager') + '">';
      }
      html += '</div>';
    }

    // the frosted glass cube suspended inside
    html += '<div class="inner" aria-hidden="true">';
    for (var g = 0; g < faces.length; g++) {
      html += '<div class="inner__f inner__f--' + faces[g] + '"></div>';
    }
    html += '</div>';

    cube.innerHTML = html;
  }

  /* ----------------------------------------------------------
     3. Motion — "catch me if you can"
     The cube rotates TOWARD the cursor while the rig translates
     AWAY from it. Rotation must live on the preserve-3d element
     and translation on a separate wrapper, or the 3D context
     collapses. ease 0.055 is the feel — do not tune casually.
     ---------------------------------------------------------- */
  var MOTION = { rotRange: 48, fleeRange: 80, idleSpin: 0.045, ease: 0.055 };

  function initCube() {
    var cube = document.getElementById('cube');
    var rig = document.getElementById('rig');
    var stage = document.getElementById('stage');
    if (!cube || !rig) return;

    buildCube(cube);

    /* Orientation is split in two so both behaviours can coexist:
         base   — accumulated free rotation. Unbounded, so the cube turns
                  through a full 360 and keeps going, on both axes.
         follow — the cursor's pull, a bounded offset added on top.
       Dragging moves `base`; the "catch me if you can" pull moves
       `follow`. Neither clobbers the other. */
    var base = { rx: -14, ry: 24 };
    var follow = { rx: 0, ry: 0 };
    var vel = { rx: 0, ry: 0 };                 // momentum after release
    var target = { tx: 0, ty: 0 };
    var cur = { rx: -14, ry: 24, tx: 0, ty: 0 };
    var inspecting = false;
    var dragging = false;
    var px = 0, py = 0;

    var DRAG = 0.45;     // deg of rotation per px dragged
    var FRICTION = 0.94; // momentum decay per frame
    var FOLLOW = reduced ? 0 : 20;   // deg of cursor pull (was the full rotRange)
    var SPIN = reduced ? 0 : MOTION.idleSpin;

    /* The cube drifts and flees, so a tile is hard to hold still long
       enough to look at. Pause the idle spin and shorten the flee while
       the pointer is actually on the cube. */
    cube.addEventListener('pointerenter', function () { inspecting = true; });
    cube.addEventListener('pointerleave', function () { inspecting = false; });

    /* ---- drag to orbit ---- */
    function down(e) {
      dragging = true;
      px = e.clientX; py = e.clientY;
      vel.rx = 0; vel.ry = 0;
      if (stage && stage.setPointerCapture) {
        try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      }
      document.body.classList.add('is-grabbing');
    }
    function move(e) {
      if (!dragging) return;
      var dx = e.clientX - px, dy = e.clientY - py;
      px = e.clientX; py = e.clientY;
      base.ry += dx * DRAG;      // unbounded — full 360 and beyond
      base.rx -= dy * DRAG;
      vel.ry = dx * DRAG;
      vel.rx = -dy * DRAG;
    }
    function up() {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('is-grabbing');
    }

    if (stage) stage.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    /* ---- cursor pull (only when not dragging) ---- */
    function onPointer(x, y) {
      if (dragging) return;
      var nx = (x / window.innerWidth - 0.5) * 2;   // -1 .. 1
      var ny = (y / window.innerHeight - 0.5) * 2;
      follow.ry = nx * FOLLOW;                      // toward
      follow.rx = -ny * FOLLOW;
      var flee = inspecting ? MOTION.fleeRange * 0.25 : MOTION.fleeRange;
      if (reduced) flee = 0;
      target.tx = -nx * flee;                       // away
      target.ty = -ny * flee * 0.55;
    }

    window.addEventListener('pointermove', function (e) {
      onPointer(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener('pointerleave', function () {
      target.tx = 0; target.ty = 0;
    });

    window.addEventListener('touchmove', function (e) {
      if (!dragging && e.touches[0]) onPointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    function lerp(a, b, t) { return a + (b - a) * t; }

    (function frame() {
      if (!dragging) {
        base.ry += vel.ry;                 // coast
        base.rx += vel.rx;
        vel.ry *= FRICTION;
        vel.rx *= FRICTION;
        if (Math.abs(vel.ry) < 0.02) vel.ry = 0;
        if (Math.abs(vel.rx) < 0.02) vel.rx = 0;
        if (!inspecting && !vel.ry && !vel.rx) base.ry += SPIN;
      }

      var ease = dragging ? 0.4 : MOTION.ease;   // direct while held
      cur.rx = lerp(cur.rx, base.rx + follow.rx, ease);
      cur.ry = lerp(cur.ry, base.ry + follow.ry, ease);
      cur.tx = lerp(cur.tx, target.tx, MOTION.ease);
      cur.ty = lerp(cur.ty, target.ty, MOTION.ease);

      cube.style.transform = 'rotateX(' + cur.rx + 'deg) rotateY(' + cur.ry + 'deg)';
      rig.style.transform = 'translate3d(' + cur.tx + 'px,' + cur.ty + 'px,0) scale(var(--cube-scale))';

      requestAnimationFrame(frame);
    })();
  }

  /* ----------------------------------------------------------
     4. Scroll progress -> the % chip  (note the space before %)
     ---------------------------------------------------------- */
  function initProgress() {
    var el = document.getElementById('progress');
    if (!el) return;
    function onScroll() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
      el.textContent = pct + ' %';
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ----------------------------------------------------------
     5. Menu + theme (persisted, unlike the demo)
     ---------------------------------------------------------- */
  function initMenu() {
    var burger = document.getElementById('burger');
    var menu = document.getElementById('menu');
    var navpill = document.getElementById('navpill');
    if (!burger || !menu || !navpill) return;

    function setOpen(open) {
      menu.dataset.open = String(open);
      navpill.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    burger.addEventListener('click', function () {
      if (menu.dataset.open === 'true') { setOpen(false); return; }
      gateGuard(function () { setOpen(true); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.dataset.open === 'true') { setOpen(false); burger.focus(); }
    });

    document.addEventListener('click', function (e) {
      if (menu.dataset.open !== 'true') return;
      if (!menu.contains(e.target) && !navpill.contains(e.target)) setOpen(false);
    });

    /* The menu is a contents list for one page now, so picking a row has to
       shut it — otherwise it sits over the band you just jumped to. */
    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setOpen(false);
    });
  }

  function initTheme() {
    // The handbook pill (#theme) and the docs header button
    // ([data-theme-toggle]) share one setting.
    var btns = [].slice.call(document.querySelectorAll('#theme, [data-theme-toggle]'));
    if (!btns.length) return;
    var root = document.documentElement;
    function label() {
      var dark = root.dataset.theme === 'dark';
      btns.forEach(function (b) { b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme'); });
    }
    label();
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
        root.dataset.theme = next;
        try { localStorage.setItem('gcd-theme', next); } catch (e) {}
        refreshDots();                     // canvas dots follow the theme
        label();
      });
    });
  }

  /* ----------------------------------------------------------
     6. Reveal on scroll — staggered, capped, fire-once
     ---------------------------------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      for (var j = 0; j < items.length; j++) items[j].classList.add('is-in');
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });

    for (var i = 0; i < items.length; i++) {
      items[i].style.transitionDelay = (Math.min(i, 6) * 60) + 'ms';
      io.observe(items[i]);
    }
  }


  /* ----------------------------------------------------------
     9. Gates. Two independent locks — the handbook passphrase
     and the internal code — sharing one implementation. A page
     declares which one guards it via data-lockid, set in the
     head before paint.
     ---------------------------------------------------------- */
  var gateGuard = function (next) { next(); };   // default: nothing to ask

  /* One passphrase gate, reused twice. `key` keeps the two unlocks
     independent — knowing the handbook passphrase must not open the
     internal shelf, and vice versa. */
  function makeGate(el, key) {
    var pw = el && el.dataset.pw;
    if (!el || !pw) return null;

    var form = el.querySelector('form');
    var input = el.querySelector('.lockgate__input');
    var err = el.querySelector('.lockgate__err');
    var close = el.querySelector('.lockgate__close');
    var pending = null;

    function isUnlocked() {
      try { return sessionStorage.getItem(key) === pw; } catch (e) { return false; }
    }
    function open(after) {
      pending = after || null;
      input.value = '';
      err.hidden = true;
      el.classList.add('is-open');
      input.focus();
    }
    function dismiss() {
      el.classList.remove('is-open');
      pending = null;
    }
    function reject() {
      err.hidden = false;
      el.classList.add('is-wrong');
      input.value = '';
      input.focus();
      setTimeout(function () { el.classList.remove('is-wrong'); }, 450);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (input.value !== pw) { reject(); return; }
      try { sessionStorage.setItem(key, pw); } catch (e2) {}
      el.classList.remove('is-open');
      var run = pending; pending = null;
      if (run) run();
    });

    if (close) close.addEventListener('click', dismiss);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.classList.contains('is-open')) dismiss();
    });

    return { open: open, isUnlocked: isUnlocked, input: input, el: el };
  }

  var GATES = {};

  function initGates(onUnlock) {
    var root = document.documentElement;
    GATES.site = makeGate(document.getElementById('lockgate'), 'gcd-unlocked');
    GATES.internal = makeGate(document.getElementById('intgate'), 'gcd-internal');

    var locked = root.getAttribute('data-locked') === 'true';
    var which = root.getAttribute('data-lockid') === 'intgate' ? 'internal' : 'site';
    var gate = GATES[which];

    if (locked && gate) {
      gate.open(function () {
        root.removeAttribute('data-locked');
        root.removeAttribute('data-lockid');
        gateGuard = function (n) { n(); };
        onUnlock();
      });
      gate.el.classList.remove('is-open');   // shown by [data-locked] instead
      gate.input.focus();
      return;
    }

    var siteEl = document.getElementById('lockgate');
    if (siteEl && siteEl.dataset.mode === 'menu' &&
        GATES.site && !GATES.site.isUnlocked()) {
      gateGuard = function (next) {
        GATES.site.open(function () {
          gateGuard = function (n) { n(); };   // asked once per session
          next();
        });
      };
    }
    onUnlock();
  }

  /* ----------------------------------------------------------
     10. Internal login — the footer button. Separate code from
     the handbook; leads to the internal page.
     ---------------------------------------------------------- */
  function initInternal() {
    var el = document.getElementById('intgate');
    var btn = document.getElementById('internal-login');
    if (!btn || !el) return;

    var go = el.dataset.go;
    function enter() { if (go) window.location.href = go; }

    btn.addEventListener('click', function () {
      var gate = GATES.internal;               // null when the lock is off
      if (!gate || gate.isUnlocked()) { enter(); return; }
      gate.open(enter);
    });
  }

  /* ----------------------------------------------------------
     11. Internal page — folders open a side drawer.
     Every folder's rows are in the HTML, so with JS off the page
     reads as a plain list of all 40 items.
     ---------------------------------------------------------- */
  function initFinder() {
    var grid = document.getElementById('fx-grid');
    var drawer = document.getElementById('fx-drawer');
    if (!grid || !drawer) return;

    var title = document.getElementById('fx-drawer-title');
    var count = document.getElementById('fx-drawer-count');
    var list = document.getElementById('fx-list');
    var groups = list.querySelectorAll('.fx-group');
    var closer = drawer.querySelector('.fx-drawer__close');
    var lastFocus = null;

    function open(key, tile) {
      var label = '', total = 0, downloads = 0;
      for (var i = 0; i < groups.length; i++) {
        var on = groups[i].dataset.folder === key;
        groups[i].hidden = !on;
        if (!on) continue;
        label = groups[i].dataset.label;
        var rows = groups[i].querySelectorAll('.fx-row');
        total = rows.length;
        for (var r = 0; r < rows.length; r++) {
          if (rows[r].dataset.kind === 'download') downloads++;
        }
      }
      if (title) title.textContent = label;
      if (count) {
        count.textContent = total + (total === 1 ? ' item' : ' items') +
          (downloads ? ' · ' + downloads + ' download' + (downloads === 1 ? '' : 's') : '');
      }
      lastFocus = tile || null;
      list.scrollTop = 0;
      drawer.hidden = false;
      // one frame between display and transform, or the slide-in never runs
      requestAnimationFrame(function () { drawer.classList.add('is-open'); });
      document.body.style.overflow = 'hidden';
      if (closer) closer.focus();
    }

    function close() {
      drawer.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { drawer.hidden = true; }, 500);
      if (lastFocus) lastFocus.focus();
    }

    grid.addEventListener('click', function (e) {
      var tile = e.target.closest('.fx-tile');
      if (tile) open(tile.dataset.folder, tile);
    });

    drawer.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.hidden) close();
    });
  }

  /* ----------------------------------------------------------
     12. Dot field — the canvas dots bend toward the cursor.
     Replaces the CSS background dots with a canvas so each dot
     can move independently. Skipped on touch and under reduced
     motion, where the static CSS dots stay.
     ---------------------------------------------------------- */
  var refreshDots = function () {};

  function initDots() {
    if (reduced) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'dots';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);
    document.documentElement.classList.add('has-dots');

    var ctx = canvas.getContext('2d');
    var STEP = 24;     // must match --canvas-dot
    var R = 190;       // radius of the well, px
    var PULL = 24;     // how far the nearest dots travel, px
    var w = 0, h = 0, cols = 0, rows = 0;
    var tx = -9999, ty = -9999, mx = -9999, my = -9999;
    var strength = 0, want = 0;
    var rgb = '0,0,0';
    var running = false;

    refreshDots = function () {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--dot-rgb');
      v = (v || '').trim();
      if (!v) {   // token missing — fall back to the current theme
        v = document.documentElement.getAttribute('data-theme') === 'dark'
          ? '255,255,255' : '0,0,0';
      }
      rgb = v;
      draw();
    };

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / STEP) + 1;
      rows = Math.ceil(h / STEP) + 1;
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      var base = 'rgba(' + rgb + ',0.09)';
      ctx.fillStyle = base;

      var live = strength > 0.002;
      for (var i = 0; i < cols; i++) {
        var x = i * STEP;
        // whole columns outside the well need no per-dot work
        var colFar = live && Math.abs(mx - x) > R;
        for (var j = 0; j < rows; j++) {
          var y = j * STEP;
          if (!live || colFar) { ctx.fillRect(x, y, 1, 1); continue; }

          var dx = mx - x, dy = my - y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d >= R || d < 0.01) { ctx.fillRect(x, y, 1, 1); continue; }

          var f = 1 - d / R;
          f = f * f * strength;                    // quadratic falloff
          var pull = f * PULL;
          var size = 1 + f * 2.8;
          ctx.fillStyle = 'rgba(' + rgb + ',' + (0.09 + f * 0.36) + ')';
          ctx.fillRect(x + (dx / d) * pull, y + (dy / d) * pull, size, size);
          ctx.fillStyle = base;
        }
      }
    }

    function frame() {
      mx += (tx - mx) * 0.16;
      my += (ty - my) * 0.16;
      strength += (want - strength) * 0.09;

      draw();

      var moving = Math.abs(tx - mx) > 0.2 || Math.abs(ty - my) > 0.2;
      var easing = Math.abs(want - strength) > 0.003;
      if (moving || easing) {
        requestAnimationFrame(frame);
      } else {
        running = false;                            // settled: stop burning frames
        if (want === 0) { strength = 0; draw(); }
      }
    }

    function kick() {
      if (!running) { running = true; requestAnimationFrame(frame); }
    }

    window.addEventListener('pointermove', function (e) {
      if (strength < 0.01) { mx = e.clientX; my = e.clientY; }   // no fly-in from 0,0
      tx = e.clientX; ty = e.clientY;
      want = 1;
      kick();
    }, { passive: true });

    document.addEventListener('pointerleave', function () { want = 0; kick(); });
    window.addEventListener('blur', function () { want = 0; kick(); });
    window.addEventListener('resize', resize);

    refreshDots();
    resize();
  }

  /* ---- closing reel ----
     One button drives the video both ways. The class on the figure carries the
     state, so CSS decides what the button looks like and nothing here touches
     styles. Events come from the video itself, not from the click, so the UI
     stays correct if playback stalls or the user uses native controls.      */
  function initReel() {
    var fig = document.getElementById('reel');
    var vid = document.getElementById('reelv');
    var btn = document.getElementById('reelplay');
    if (!fig || !vid || !btn) return;

    function sync() {
      var playing = !vid.paused && !vid.ended;
      fig.classList.toggle('is-playing', playing);
      btn.setAttribute('aria-label', playing ? 'Pause the reel' : 'Play the reel');
    }

    btn.addEventListener('click', function () {
      if (vid.paused || vid.ended) {
        var p = vid.play();
        if (p && p.catch) p.catch(function () { sync(); });
      } else {
        vid.pause();
      }
    });

    vid.addEventListener('play', sync);
    vid.addEventListener('pause', sync);
    vid.addEventListener('ended', sync);
    sync();
  }

  /* ---------------------------------------------------------- */
  function boot() {
    buildRulers();
    initCube();
    initProgress();
    initMenu();
    initTheme();
    initReveal();
    initInternal();
    initFinder();
    initDots();
    initReel();
    window.addEventListener('resize', buildRulers);
  }

  initGates(boot);
})();
