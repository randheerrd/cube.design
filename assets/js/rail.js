/* ============================================================
   rail.js — behaviour for the sideways pages
   Loaded only on slugs listed in build.py's RAIL set, after site.js.

   The page scrolls vertically, natively, down a spacer as tall as the
   track is wide; the track is then translated sideways by that amount.
   Native inertia, one GPU transform per frame — that mapping is the page.

   Everything here is an enhancement. With JS off the panels still
   render, the index links are ordinary anchors, and the accordions
   are open. Nothing is hidden behind a script.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  if (root.dataset.mode !== 'rail') return;

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* Below 1024px the track stacks and the page is an ordinary one. */
  function narrow() { return window.innerWidth <= 1024; }

  /* ---------------------------------------------------------- */
  /* The scroll.
     Hijacking the wheel and lerping window.scrollTo was smooth in
     theory and juddery in practice: every frame repainted the whole
     document plus five fixed layers, and trackpad momentum was thrown
     away and re-simulated badly.

     So the document scrolls VERTICALLY, natively, down a spacer as tall
     as the track is wide — full inertia, real scrollbar physics, keyboard
     and touch for free — and the only thing we do is translate the track
     sideways by that amount. One GPU transform on one layer per frame.   */

  var track = document.querySelector('main > .track');
  var spacer = null;
  var vw = 0, len = 0, x = 0;
  var panels = [];            /* cached geometry: no layout reads while scrolling */
  var painters = [];          /* things that want the new x */

  function measure() {
    if (!track) return;
    vw = window.innerWidth;
    len = Math.max(0, track.scrollWidth - vw);
    if (spacer) spacer.style.height = (len + window.innerHeight) + 'px';

    panels = [];
    var all = track.children;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (!el.classList || !el.classList.contains('panel')) continue;
      panels.push({ el: el, left: el.offsetLeft, width: el.offsetWidth,
                    dark: el.classList.contains('panel--dark') });
    }
    paint();
  }

  function paint() {
    x = clamp(window.scrollY, 0, len);
    if (track) track.style.transform = 'translate3d(' + (-x) + 'px,0,0)';
    for (var i = 0; i < painters.length; i++) painters[i](x, len, x + vw / 2);
  }

  function scrollToX(to) {
    window.scrollTo({ top: clamp(to, 0, len), behavior: reduced ? 'auto' : 'smooth' });
  }

  function initScroll() {
    if (!track) return;
    /* Only now does the fixed-track layout switch on. With JS off the
       base rules leave a plain horizontal scrollbar, which still works. */
    root.setAttribute('data-rail', 'on');

    spacer = document.createElement('div');
    spacer.className = 'railspacer';
    spacer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(spacer);

    measure();
    window.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', measure);
    /* Fonts land after first paint and change the track width. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    window.addEventListener('load', measure);
  }

  /* ---------------------------------------------------------- */
  /* Progress: the bar along the foot and the chip in the pill,
     both reading the same axis. site.js stands down on rail pages. */
  function initProgress() {
    var bar = document.getElementById('railbar');
    var chip = document.getElementById('progress');
    if (!bar && !chip) return;
    var last = -1;
    painters.push(function (px, plen) {
      var p = plen > 0 ? px / plen : 0;
      if (bar) bar.style.transform = 'scaleX(' + p + ')';
      var pct = Math.round(p * 100);
      if (chip && pct !== last) { chip.textContent = pct + ' %'; last = pct; }
    });
  }

  /* ---------------------------------------------------------- */
  /* The fixed index rail. The links are real anchors in the HTML;
     here they only gain easing and a current-panel mark.         */
  function initIndex() {
    var links = document.querySelectorAll('.vindex a[href^="#"]');
    if (!links.length) return;

    var pairs = [];
    for (var i = 0; i < links.length; i++) {
      var el = document.getElementById(links[i].getAttribute('href').slice(1));
      if (el) pairs.push({ link: links[i], panel: el });
    }
    if (!pairs.length) return;

    pairs.forEach(function (p) {
      p.link.addEventListener('click', function (e) {
        if (narrow()) return;                    /* native anchor jump is right there */
        e.preventDefault();
        scrollToX(p.panel.offsetLeft);
      });
    });

    var last = null;
    painters.push(function (px, plen, cx) {
      var best = null;
      for (var i = 0; i < panels.length; i++) {
        if (cx >= panels[i].left && cx < panels[i].left + panels[i].width) {
          best = panels[i].el; break;
        }
      }
      if (best === last) return;
      if (last) last.removeAttribute('data-on');
      if (best) best.setAttribute('data-on', 'true');
      last = best;
      pairs.forEach(function (p) {
        p.link.setAttribute('data-on', p.panel === best ? 'true' : 'false');
      });
    });
  }

  /* ---------------------------------------------------------- */
  /* Chrome inversion. Which panel holds the middle of the viewport
     decides whether the wordmark and the progress bar go white.   */
  function initChrome() {
    var on = false;
    painters.push(function (px, plen, cx) {
      var hit = false;
      for (var i = 0; i < panels.length; i++) {
        if (panels[i].dark && cx >= panels[i].left && cx < panels[i].left + panels[i].width) {
          hit = true; break;
        }
      }
      if (hit === on) return;
      on = hit;
      if (hit) root.setAttribute('data-chrome', 'dark');
      else root.removeAttribute('data-chrome');
    });
  }

  /* ---------------------------------------------------------- */
  /* Reveals, on the x-axis. The observer needs horizontal insets —
     the vertical ones site.js uses would fire everything at once
     on a page where nothing ever leaves the vertical viewport.    */
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
    }, { rootMargin: '0px -12% 0px -12%' });

    for (var i = 0; i < items.length; i++) {
      var d = parseInt(items[i].getAttribute('data-delay') || '0', 10);
      items[i].style.transitionDelay = d + 'ms';
      io.observe(items[i]);
    }
  }

  /* ---------------------------------------------------------- */
  /* The rotating word. One slot, words masked through it. The
     outgoing word leaves upward while the next rises into place. */
  function initRotor() {
    var rotors = document.querySelectorAll('.rotor');
    if (!rotors.length) return;

    for (var i = 0; i < rotors.length; i++) (function (r) {
      var words = r.querySelectorAll('span');
      if (words.length < 2) { if (words[0]) words[0].setAttribute('data-on', 'in'); return; }
      var n = 0;
      words[0].setAttribute('data-on', 'in');
      if (reduced) return;
      setInterval(function () {
        words[n].setAttribute('data-on', 'out');
        n = (n + 1) % words.length;
        var next = words[n];
        next.removeAttribute('data-on');
        /* one frame at the start position, then let it rise */
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { next.setAttribute('data-on', 'in'); });
        });
      }, 2400);
    })(rotors[i]);
  }

  /* ---------------------------------------------------------- */
  /* Accordion. One open at a time; the first is open in the HTML so
     the page reads correctly with JS off.                        */
  function initAccordion() {
    var groups = document.querySelectorAll('.acc');
    for (var g = 0; g < groups.length; g++) (function (group) {
      var rows = group.querySelectorAll('.acc__row');
      for (var i = 0; i < rows.length; i++) (function (row) {
        var btn = row.querySelector('.acc__q');
        if (!btn) return;
        btn.addEventListener('click', function () {
          var open = row.classList.contains('is-open');
          for (var k = 0; k < rows.length; k++) {
            rows[k].classList.remove('is-open');
            var b = rows[k].querySelector('.acc__q');
            if (b) b.setAttribute('aria-expanded', 'false');
          }
          if (!open) {
            row.classList.add('is-open');
            btn.setAttribute('aria-expanded', 'true');
          }
        });
      })(rows[i]);
    })(groups[g]);
  }

  /* ---------------------------------------------------------- */
  /* Counters run once, when their panel arrives. */
  function initCount() {
    var nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;

    function run(el) {
      var to = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduced) { el.textContent = to + suffix; return; }
      var t0 = performance.now(), dur = 1200;
      (function step(t) {
        var p = clamp((t - t0) / dur, 0, 1);
        var e = 1 - Math.pow(1 - p, 3);          /* ease-out cubic */
        el.textContent = Math.round(to * e) + suffix;
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }

    if (!('IntersectionObserver' in window)) {
      for (var j = 0; j < nums.length; j++) run(nums[j]);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px -10% 0px -10%' });
    for (var i = 0; i < nums.length; i++) io.observe(nums[i]);
  }

  /* ---------------------------------------------------------- */
  /* Pointer disc. A dot that swells into a labelled disc over
     anything carrying data-cursor. Pointer devices only.         */
  function initCursor() {
    var c = document.getElementById('rcursor');
    if (!c || reduced) return;
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

    var label = c.querySelector('.rcursor__label');
    var x = window.innerWidth / 2, y = window.innerHeight / 2, px = x, py = y;
    var live = false;

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      x = e.clientX; y = e.clientY;
      if (!live) { px = x; py = y; live = true; requestAnimationFrame(loop); }
      var hit = e.target && e.target.closest ? e.target.closest('[data-cursor]') : null;
      if (hit) {
        c.setAttribute('data-state', 'on');
        if (label) label.textContent = hit.getAttribute('data-cursor');
      } else {
        c.removeAttribute('data-state');
      }
    }, { passive: true });

    function loop() {
      px += (x - px) * 0.22;
      py += (y - py) * 0.22;
      c.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    }
  }

  /* ---------------------------------------------------------- */
  /* The rings spin on their own; scroll adds an offset on top so
     they read as geared to the page rather than merely decorative. */
  function initRings() {
    var rings = document.querySelectorAll('.ringwrap');
    if (!rings.length || reduced) return;
    painters.push(function (px, plen) {
      var p = plen > 0 ? px / plen : 0;
      for (var i = 0; i < rings.length; i++) {
        rings[i].style.rotate = (p * 220) + 'deg';
      }
    });
  }

  /* ---------------------------------------------------------- */
  /* Depth. Elements drift sideways at a rate set by data-drift as their
     panel crosses the viewport, so a panel is layers at different speeds
     rather than one flat card sliding past. Written to the independent
     `translate` property, which leaves `transform` and `rotate` free for
     whatever else an element is already doing.                          */
  function initDrift() {
    var els = document.querySelectorAll('[data-drift]');
    if (!els.length || reduced) return;

    var items = [];
    for (var i = 0; i < els.length; i++) {
      var host = els[i].closest ? els[i].closest('.panel') : null;
      if (!host) continue;
      items.push({ el: els[i], host: host, amt: parseFloat(els[i].getAttribute('data-drift')) || 0 });
    }
    if (!items.length) return;

    painters.push(function (px, plen, cx) {
      for (var i = 0; i < items.length; i++) {
        var it = items[i], geo = null;
        for (var k = 0; k < panels.length; k++) {
          if (panels[k].el === it.host) { geo = panels[k]; break; }
        }
        if (!geo) continue;
        var d = clamp(((geo.left + geo.width / 2) - cx) / (vw || 1), -1.4, 1.4);
        it.el.style.translate = (d * it.amt) + 'px';
      }
    });
  }

  /* ---------------------------------------------------------- */
  /* Magnetic hover. The element leans a little toward the pointer and
     springs back on exit. Small numbers only — 12px is plenty.       */
  function initMagnetic() {
    var els = document.querySelectorAll('[data-magnet]');
    if (!els.length || reduced) return;
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

    for (var i = 0; i < els.length; i++) (function (el) {
      var pull = parseFloat(el.getAttribute('data-magnet')) || 12;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.transform = 'translate3d(' + (clamp(nx, -1, 1) * pull) + 'px,' +
                             (clamp(ny, -1, 1) * pull) + 'px,0)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transform = '';
      });
    })(els[i]);
  }

  /* ---------------------------------------------------------- */
  function boot() {
    initProgress();
    initIndex();
    initChrome();
    initRings();
    initDrift();
    initScroll();          /* registers painters first, then measures once */
    initReveal();
    initRotor();
    initAccordion();
    initCount();
    initCursor();
    initMagnetic();
  }

  boot();
})();
