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
  /* The menu is a contents list for one page. Real anchors, so it works
     with JS off; this only adds easing and a focus handoff. */
  function initAnchors() {
    var links = document.querySelectorAll('.menu a[href^="#"]');
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

  initAnchors();
})();
