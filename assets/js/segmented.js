/* Cube Segmented control.
   Markup: <div class="segc segc--pri|--sec|--acc segc--s|--m|--l [segc--round] [segc--fill]" role="radiogroup" aria-label="…">
             <button type="button" class="segc__o" role="radio" aria-checked="true">Daily</button> …
           </div>
   Exactly one segment is selected. Click selects; ← → (↑ ↓) move and select, Home / End jump; disabled segments
   are skipped. A "cube:segment" event (detail.index, detail.value) bubbles from the .segc on every change. */
(function(){
  function opts(g){ return Array.prototype.slice.call(g.querySelectorAll('.segc__o')); }
  function sync(g){
    var os = opts(g), cur = os.filter(function(o){ return o.getAttribute('aria-checked') === 'true'; })[0];
    os.forEach(function(o){ o.tabIndex = o === cur ? 0 : -1; });
  }
  function select(o, focus){
    var g = o.closest('.segc');
    if(!g || o.disabled || g.hasAttribute('data-static')) return;
    var os = opts(g);
    if(o.getAttribute('aria-checked') !== 'true'){
      os.forEach(function(x){ x.setAttribute('aria-checked', String(x === o)); });
      g.dispatchEvent(new CustomEvent('cube:segment', {bubbles:true, detail:{index:os.indexOf(o), value:o.getAttribute('data-value') || o.textContent.trim()}}));
    }
    sync(g);
    if(focus) o.focus();
  }
  document.addEventListener('click', function(e){
    var o = e.target.closest && e.target.closest('.segc__o');
    if(o) select(o, false);
  });
  document.addEventListener('keydown', function(e){
    var o = e.target.closest && e.target.closest('.segc__o');
    if(!o) return;
    var g = o.closest('.segc'), os = opts(g).filter(function(x){ return !x.disabled; }), i = os.indexOf(o), n;
    if(e.key === 'ArrowRight' || e.key === 'ArrowDown') n = os[(i + 1) % os.length];
    else if(e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = os[(i - 1 + os.length) % os.length];
    else if(e.key === 'Home') n = os[0];
    else if(e.key === 'End') n = os[os.length - 1];
    else return;
    e.preventDefault();
    select(n, true);
  });
  function init(){ Array.prototype.forEach.call(document.querySelectorAll('.segc'), sync); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.CubeSegmented = {select:select};
})();
