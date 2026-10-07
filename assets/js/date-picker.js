/* Cube Date Selector — renders the Date-Selection-modal, Calendar and
   Date-cell from a JSON config on any [data-dsm] element, and makes it
   interactive when the config says "live": true.

   Config keys (all optional):
     kind      "modal" (default) | "calendar"
     mode      "range" (default) | "single"
     open      true → calendar visible under the preset bar
     month     "2026-04" first month shown
     min       "2026-04" earliest month (back nav disabled there)
     start,end "2026-04-03" selected dates
     hover     "2026-04-16" hovered date (range preview while picking)
     preset    "MTD" … selected preset chip
     cursor    true → show a pointer over the hovered cell (docs only)
     disabledAfter "2026-05-21" dates after this are Disabled
     live      true → clickable
*/
(function () {
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var WK = ["M", "T", "W", "T", "F", "S", "S"];
  var PRESETS = { range: ["MTD", "1M", "3M", "6M", "1Y"], single: ["SDLW", "SDLM"] };
  var ICON = {
    dl: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M208.49 199.51a12 12 0 0 1-17 17l-80-80a12 12 0 0 1 0-17l80-80a12 12 0 0 1 17 17L137 128ZM57 128l71.52-71.51a12 12 0 0 0-17-17l-80 80a12 12 0 0 0 0 17l80 80a12 12 0 0 0 17-17Z"/></svg>',
    l: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M168.49 199.51a12 12 0 0 1-17 17l-80-80a12 12 0 0 1 0-17l80-80a12 12 0 0 1 17 17L97 128Z"/></svg>',
    r: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="m184.49 136.49-80 80a12 12 0 0 1-17-17L159 128 87.51 56.49a12 12 0 1 1 17-17l80 80a12 12 0 0 1-.02 17Z"/></svg>',
    dr: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="m144.49 136.49-80 80a12 12 0 0 1-17-17L119 128 47.51 56.49a12 12 0 0 1 17-17l80 80a12 12 0 0 1-.02 17Zm80-17-80-80a12 12 0 1 0-17 17L199 128l-71.52 71.51a12 12 0 0 0 17 17l80-80a12 12 0 0 0 .01-17Z"/></svg>',
    down: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="m216.49 104.49-80 80a12 12 0 0 1-17 0l-80-80a12 12 0 0 1 17-17L128 159l71.51-71.52a12 12 0 0 1 17 17Z"/></svg>',
    up: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M216.49 168.49a12 12 0 0 1-17 0L128 97l-71.51 71.49a12 12 0 0 1-17-17l80-80a12 12 0 0 1 17 0l80 80a12 12 0 0 1 0 17Z"/></svg>'
  };
  var CURSOR = '<svg class="dc__cursor" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V10m0-.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0v4.5a7 7 0 0 1-7 7h-1.2a6 6 0 0 1-4.6-2.2L3.6 15a1.6 1.6 0 0 1 2.4-2.1L9 15.5" fill="#fff" stroke="#101214" stroke-width="1.4" stroke-linejoin="round"/></svg>';

  function parse(s) { if (!s) return null; var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +(p[2] || 1)); }
  function key(d) { return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); }
  function fmt(d) { return d.getDate() + " " + MON[d.getMonth()] + "’" + String(d.getFullYear()).slice(2); }
  function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function monthHTML(st, m, side, total) {
    var y = m.getFullYear(), mo = m.getMonth();
    var first = new Date(y, mo, 1), lead = (first.getDay() + 6) % 7, days = new Date(y, mo + 1, 0).getDate();
    var s = st.start, e = st.end, hv = st.hover;
    var lo = s, hi = e || (st.mode === "range" && s && hv ? hv : null);
    if (lo && hi && key(hi) < key(lo)) { var t = lo; lo = hi; hi = t; }
    var dis = st.disabledAfter, minM = st.min;
    var html = '<div class="cal__month"><div class="cal__head">';
    var atMin = minM && key(m) <= key(minM);
    if (side === 0) {
      html += '<div class="cal__nav"><button type="button" data-nav="-12" aria-label="Previous year"' + (atMin ? " disabled" : "") + ">" + ICON.dl +
        '</button><button type="button" data-nav="-1" aria-label="Previous month"' + (atMin ? " disabled" : "") + ">" + ICON.l + "</button></div>";
    } else html += '<div class="cal__nav"></div>';
    html += '<span class="cal__label" aria-live="polite">' + MON[mo] + " " + y + "</span>";
    if (side === total - 1) {
      html += '<div class="cal__nav cal__nav--end"><button type="button" data-nav="1" aria-label="Next month">' + ICON.r +
        '</button><button type="button" data-nav="12" aria-label="Next year">' + ICON.dr + "</button></div>";
    } else html += '<div class="cal__nav cal__nav--end"></div>';
    html += '</div><div class="cal__wk" aria-hidden="true">' + WK.map(function (w) { return "<span>" + w + "</span>"; }).join("") + '</div><div class="cal__grid" role="grid">';
    // Leading cells: the start month shows the previous month's tail, later months leave them empty (as in Figma)
    var prevDays = new Date(y, mo, 0).getDate();
    for (var i = 0; i < lead; i++) {
      html += side === 0 ? '<span class="dc dc--other">' + (prevDays - lead + 1 + i) + "</span>" : '<span class="dc dc--empty"></span>';
    }
    for (var d = 1; d <= days; d++) {
      var dt = new Date(y, mo, d), k = key(dt), cls = ["dc"];
      var preview = st.mode === "range" && s && !e && hv;
      if (dis && k > key(dis)) cls.push("dc--disabled");
      else if (st.mode === "single") { if (s && k === key(s)) cls.push("dc--sel", "dc--start", "dc--end"); }
      else {
        if ((s && k === key(s)) || (e && k === key(e))) cls.push("dc--sel");
        if (lo && hi && k >= key(lo) && k <= key(hi)) {
          if (k === key(lo)) cls.push("dc--start");
          if (k === key(hi)) cls.push("dc--end");
          // Committed range = Primary/100 band; hover preview = Steel Blue/50 strip
          if (cls.indexOf("dc--sel") < 0) cls.push(preview ? "dc--hov" : "dc--range");
        } else if (s && k === key(s)) cls.push("dc--start", "dc--end");
      }
      var label = dt.toDateString();
      var hoverCursor = st.cursor && hv && k === key(hv) ? CURSOR : "";
      html += '<button type="button" class="' + cls.join(" ") + '" data-d="' + y + "-" + (mo + 1) + "-" + d + '" aria-label="' + label + '"' +
        (cls.indexOf("dc--disabled") > -1 ? " disabled" : "") + (cls.indexOf("dc--sel") > -1 ? ' aria-selected="true"' : "") +
        (st.live ? "" : ' tabindex="-1"') + "><span>" + d + "</span>" + hoverCursor + "</button>";
    }
    // Trailing: the end month shows the next month's head, others stay empty
    var cells = lead + days, trail = (7 - cells % 7) % 7;
    for (var j = 1; j <= trail; j++) html += side === total - 1 && total > 1 ? '<span class="dc dc--other">' + j + "</span>" : '<span class="dc dc--empty"></span>';
    return html + "</div></div>";
  }

  function calendarHTML(st) {
    var n = st.mode === "range" ? 2 : 1, out = '<div class="cal">';
    for (var i = 0; i < n; i++) {
      if (i) out += '<span class="cal__sep" aria-hidden="true"></span>';
      out += monthHTML(st, addMonths(st.month, i), i, n);
    }
    return out + "</div>";
  }

  function triggerHTML(st) {
    var open = st.open, txt, val = false;
    if (st.mode === "range") {
      if (st.start && st.end) { txt = esc(fmt(st.start) + " - " + fmt(st.end)); val = true; }
      else if (st.start && open) txt = "<b>" + esc(fmt(st.start)) + "</b> - End Date";
      else txt = open ? "Start Date - End Date" : "Custom";
    } else {
      if (st.start) { txt = esc(fmt(st.start)); val = true; }
      else txt = open ? "Select Date" : "Custom";
    }
    if (st.preset && !open) { txt = "Custom"; val = false; }
    return '<button type="button" class="crt" aria-haspopup="dialog" aria-expanded="' + !!open + '"' + (val ? " data-value" : "") + "><span>" + txt + "</span>" + (open ? ICON.up : ICON.down) + "</button>";
  }

  function modalHTML(st) {
    var h = '<div class="dseg" role="group" aria-label="Selection type"><button type="button" data-mode="range" aria-pressed="' + (st.mode === "range") +
      '">Date Range</button><button type="button" data-mode="single" aria-pressed="' + (st.mode === "single") + '">Single Date</button></div>';
    h += '<div class="dsel" role="group" aria-label="Presets">' + PRESETS[st.mode].map(function (p) {
      return '<button type="button" class="dsel__chip" data-preset="' + p + '" aria-pressed="' + (st.preset === p && !st.open) + '">' + p + "</button>";
    }).join("") + '<span class="dsel__div" aria-hidden="true"></span>' + triggerHTML(st) + "</div>";
    if (st.open) h += calendarHTML(st);
    return h;
  }

  function render(el) {
    var st = el._dsm;
    if (st.kind === "calendar") el.innerHTML = calendarHTML(st);
    else { el.className = "dsm" + (st.open ? " dsm--open" : ""); el.innerHTML = modalHTML(st); }
  }

  function init(el) {
    var c = {};
    try { c = JSON.parse(el.getAttribute("data-dsm") || "{}"); } catch (e) {}
    var st = el._dsm = {
      kind: c.kind || "modal", mode: c.mode || "range", open: !!c.open || c.kind === "calendar",
      month: parse(c.month || "2026-04"), min: c.min ? parse(c.min) : parse(c.month || "2026-04"),
      start: parse(c.start), end: parse(c.end), hover: parse(c.hover), preset: c.preset || null,
      disabledAfter: parse(c.disabledAfter), cursor: !!c.cursor, live: !!c.live
    };
    render(el);
    // Docs only: [selector, marker number, extra attributes] → anatomy redlines
    (c.ana || []).forEach(function (a) {
      var t = a[0] === ":self" ? el : el.querySelectorAll(a[0])[a[3] || 0]; if (!t) return;
      t.setAttribute("data-anatomy", a[1]);
      (a[2] || "").split(" ").forEach(function (kv) { if (!kv) return; var p = kv.split("="); t.setAttribute(p[0], p[1] || ""); });
    });
    if (!st.live) { el.setAttribute("inert", ""); return; }
    el.addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b || !el.contains(b) || b.disabled) return;
      if (b.dataset.mode) { st.mode = b.dataset.mode; st.start = st.end = st.hover = null; st.preset = PRESETS[st.mode][0]; st.open = false; }
      else if (b.dataset.preset) { st.preset = b.dataset.preset; st.open = false; st.start = st.end = null; }
      else if (b.classList.contains("crt")) { st.open = !st.open; if (st.open) st.preset = null; else if (!st.start) st.preset = PRESETS[st.mode][0]; }
      else if (b.dataset.nav) { st.month = addMonths(st.month, +b.dataset.nav); if (st.min && key(st.month) < key(st.min)) st.month = new Date(st.min); }
      else if (b.dataset.d) {
        var d = parse(b.dataset.d);
        if (st.mode === "single") { st.start = d; st.end = null; }
        else if (!st.start || st.end) { st.start = d; st.end = null; }
        else { if (key(d) < key(st.start)) { st.end = st.start; st.start = d; } else st.end = d; }
        st.hover = null;
      } else return;
      var focusSel = b.dataset.d ? '[data-d="' + b.dataset.d + '"]' : b.dataset.nav ? '[data-nav="' + b.dataset.nav + '"]' : null;
      render(el);
      var f = focusSel && el.querySelector(focusSel); if (f && !f.disabled) f.focus(); else if (b.classList.contains("crt")) el.querySelector(".crt").focus();
    });
    el.addEventListener("mouseover", function (ev) {
      var b = ev.target.closest(".dc[data-d]");
      if (!b || st.mode !== "range" || !st.start || st.end) return;
      var d = parse(b.dataset.d); if (st.hover && key(d) === key(st.hover)) return;
      st.hover = d; render(el);
    });
    el.addEventListener("mouseleave", function () { if (st.hover) { st.hover = null; render(el); } });
    el.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && st.open) { st.open = false; render(el); el.querySelector(".crt").focus(); }
    });
  }

  function boot() { document.querySelectorAll("[data-dsm]").forEach(init); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.CubeDate = { init: init };
})();
