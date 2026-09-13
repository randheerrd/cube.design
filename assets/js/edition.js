/* ============================================================
   edition.js — the little that the editorial pages need
   Loaded after site.js on slugs in build.py's EDITION set.

   site.js already owns the reveal observer, the scroll-progress chip,
   the menu, the theme and the dot field on a vertical page, so there is
   nothing to re-implement here. This file is two things: counters that
   run when their band arrives, and anchors that ease instead of jump.
   ============================================================ */
(function () {
  'use strict';

  if (document.documentElement.dataset.mode !== 'edition') return;

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------- */
  /* Counters. The suffix stays pinned while the figure climbs, so
     "+" and "%" never look like part of the number.              */
  function initCount() {
    var nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;

    function run(el) {
      var to = parseFloat(el.getAttribute('data-count'));
      if (isNaN(to)) return;
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduced) { el.textContent = to + suffix; return; }

      var t0 = 0, dur = 1100;
      requestAnimationFrame(function step(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        var e = 1 - Math.pow(1 - p, 3);          /* ease-out cubic */
        el.textContent = Math.round(to * e) + suffix;
        if (p < 1) requestAnimationFrame(step);
      });
    }

    if (!('IntersectionObserver' in window)) {
      for (var j = 0; j < nums.length; j++) run(nums[j]);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -15% 0px' });
    for (var i = 0; i < nums.length; i++) io.observe(nums[i]);
  }

  /* ---------------------------------------------------------- */
  /* The contents run under the hero and the menu drop-down. Real anchors,
     so both work with JS off; this only adds easing and a focus handoff. */
  function initAnchors() {
    var links = document.querySelectorAll(
      '.ed-hero__toc a[href^="#"], .menu a[href^="#"]');
    for (var i = 0; i < links.length; i++) (function (a) {
      a.addEventListener('click', function (e) {
        var el = document.getElementById(a.getAttribute('href').slice(1));
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        /* Keyboard users should land in the band, not back at the top. */
        el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
      });
    })(links[i]);
  }

  initCount();
  initAnchors();
})();
