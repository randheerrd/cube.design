/* Docs header search.
   Searches window.CUBE_SEARCH (built by build.py from every docs page and
   section) and shows the matches in a panel under the search box.
   Keyboard: / or Ctrl/Cmd+K focuses, arrows move, Enter opens, Esc closes. */
(function () {
  var input = document.querySelector('.docs-header__search input');
  var DATA = window.CUBE_SEARCH || [];
  if (!input || !DATA.length) return;

  var box = input.closest('.docs-header__search');
  var panel = document.createElement('div');
  panel.className = 'docs-search';
  panel.id = 'docs-search-results';
  panel.setAttribute('role', 'listbox');
  panel.hidden = true;
  document.body.appendChild(panel);
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-controls', panel.id);
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('autocomplete', 'off');

  var results = [], active = -1;

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function mark(s, toks) {
    var out = esc(s);
    toks.forEach(function (t) {
      out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
    });
    return out;
  }
  function snippet(text, tok) {
    var i = text.toLowerCase().indexOf(tok);
    if (i < 0) return '';
    var a = Math.max(0, i - 40), b = Math.min(text.length, i + tok.length + 70);
    return (a ? '…' : '') + text.slice(a, b).trim() + (b < text.length ? '…' : '');
  }

  function score(e, toks) {
    var p = e.p.toLowerCase(), s = e.s.toLowerCase(), h = e.h.toLowerCase(), t = e.t.toLowerCase(), total = 0;
    for (var i = 0; i < toks.length; i++) {
      var q = toks[i], best = 0;
      if (p === q) best = 120; else if (p.indexOf(q) === 0) best = 90; else if (p.indexOf(q) > -1) best = 60;
      if (s.indexOf(q) === 0) best = Math.max(best, 50); else if (s.indexOf(q) > -1) best = Math.max(best, 35);
      if (h.indexOf(q) > -1) best = Math.max(best, 18);
      if (!best && t.indexOf(q) > -1) best = 6;
      if (!best) return 0;   // every word has to match somewhere
      total += best;
    }
    if (!e.s) total += 8;                      // the page itself ranks above its sections
    if (e.k === 'Guidelines') total += 2;      // then guidelines above specs
    return total;
  }

  function search(q) {
    var toks = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!toks.length) return [];
    return DATA.map(function (e) { return { e: e, sc: score(e, toks) }; })
      .filter(function (r) { return r.sc > 0; })
      .sort(function (a, b) { return b.sc - a.sc; })
      .slice(0, 10)
      .map(function (r) { r.toks = toks; return r; });
  }

  function place() {
    var r = box.getBoundingClientRect();
    var w = Math.min(Math.max(r.width, 420), window.innerWidth - 32);
    panel.style.top = (r.bottom + 6) + 'px';
    panel.style.left = Math.max(16, Math.min(r.left, window.innerWidth - w - 16)) + 'px';
    panel.style.width = w + 'px';
  }

  function render() {
    var q = input.value.trim();
    if (!q) { close(); return; }
    results = search(q);
    active = results.length ? 0 : -1;
    if (!results.length) {
      panel.innerHTML = '<p class="docs-search__empty">No results for “' + esc(q) + '”</p>';
    } else {
      panel.innerHTML = results.map(function (r, i) {
        var e = r.e, title = e.s || e.p;
        var meta = e.s ? e.p + ' · ' + e.k : e.k;
        var hit = r.toks.filter(function (t) { return (e.p + ' ' + e.s + ' ' + e.h).toLowerCase().indexOf(t) < 0; })[0];
        var sub = hit ? snippet(e.t, hit) : (e.s ? e.h : e.t);
        return '<a class="docs-search__item" role="option" id="ds-' + i + '" href="' + e.u + '"' + (i === active ? ' aria-selected="true"' : '') + '>' +
          '<span class="docs-search__title">' + mark(title, r.toks) + '</span>' +
          '<span class="docs-search__meta">' + esc(meta) + '</span>' +
          (sub ? '<span class="docs-search__sub">' + mark(sub.length > 140 ? sub.slice(0, 140) + '…' : sub, r.toks) + '</span>' : '') +
          '</a>';
      }).join('');
    }
    place();
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    sync();
  }

  function sync() {
    [].forEach.call(panel.querySelectorAll('.docs-search__item'), function (a, i) {
      if (i === active) { a.setAttribute('aria-selected', 'true'); a.scrollIntoView({ block: 'nearest' }); }
      else a.removeAttribute('aria-selected');
    });
    if (active > -1) input.setAttribute('aria-activedescendant', 'ds-' + active);
    else input.removeAttribute('aria-activedescendant');
  }

  function close() {
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function go(i) {
    var r = results[i];
    if (!r) return;
    close();
    input.blur();
    window.location.href = r.e.u;
  }

  input.addEventListener('input', render);
  input.addEventListener('focus', function () { if (input.value.trim()) render(); });
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      if (panel.hidden) { render(); return; }
      ev.preventDefault();
      var n = results.length;
      if (!n) return;
      active = (active + (ev.key === 'ArrowDown' ? 1 : -1) + n) % n;
      sync();
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      go(active < 0 ? 0 : active);
    } else if (ev.key === 'Escape') {
      if (!panel.hidden) close(); else { input.value = ''; input.blur(); }
    }
  });
  panel.addEventListener('mousemove', function (ev) {
    var a = ev.target.closest('.docs-search__item');
    if (!a) return;
    var i = +a.id.slice(3);
    if (i !== active) { active = i; sync(); }
  });
  panel.addEventListener('mousedown', function (ev) { ev.preventDefault(); });   // keep focus in the input
  panel.addEventListener('click', function (ev) {
    var a = ev.target.closest('.docs-search__item');
    if (a) { ev.preventDefault(); go(+a.id.slice(3)); }
  });
  input.addEventListener('blur', function () { setTimeout(close, 120); });
  window.addEventListener('resize', function () { if (!panel.hidden) place(); });

  document.addEventListener('keydown', function (ev) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    var typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (document.activeElement && document.activeElement.isContentEditable);
    if ((ev.key === '/' && !typing) || ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k')) {
      ev.preventDefault();
      input.focus();
      input.select();
    }
  });
  input.placeholder = 'Search components, tokens, guidelines';
})();
