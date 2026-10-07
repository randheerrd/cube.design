/* Cube Stepper — live wizard behaviour.
   <div data-stp-live> … <ol class="stp" data-stp> <li class="stp-el" data-stage=…> … </ol> … [data-stp-panel] … [data-stp-back] [data-stp-next] </div>
   Next completes the current step and selects the next one; Back and clicking a completed step go back.
   Completed steps stay completed when you go back. */
(function(){
  var ICON = {
    completed:'<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M232.49 80.49l-128 128a12 12 0 0 1-17 0l-56-56a12 12 0 1 1 17-17L96 183 215.51 63.51a12 12 0 0 1 17 17Z"/></svg>'
  };
  function render(root){
    var list = root.querySelector('[data-stp]'), els = [].slice.call(list.querySelectorAll('.stp-el')), cur = +root.getAttribute('data-cur') || 0;
    var done = (root.getAttribute('data-done') || '').split(',').filter(Boolean).map(Number), fin0 = root.hasAttribute('data-finished');
    els.forEach(function(el, i){
      var stage = (i === cur && !fin0) ? 'selected' : (done.indexOf(i) > -1 ? 'completed' : 'upcoming');
      el.setAttribute('data-stage', stage);
      var ind = el.querySelector('.stp-ind'); ind.setAttribute('data-stage', stage);
      ind.innerHTML = stage === 'completed' ? ICON.completed : String(i + 1);
      var hit = el.querySelector('.stp-el__hit'), sr = el.querySelector('.sr-only');
      if(sr) sr.textContent = stage === 'completed' ? ' (completed)' : stage === 'selected' ? ' (current step)' : '';
      if(hit){ hit.disabled = stage === 'upcoming'; }
      if(stage === 'selected') el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    });
    var fin = root.hasAttribute('data-finished');
    root.querySelectorAll('[data-stp-panel]').forEach(function(p, i){ p.hidden = fin || i !== cur; });
    var dm = root.querySelector('[data-stp-done-msg]'); if(dm) dm.hidden = !fin;
    var back = root.querySelector('[data-stp-back]'), next = root.querySelector('[data-stp-next]'), n = els.length;
    if(back) back.disabled = cur === 0;
    if(next) next.disabled = fin;
    if(next) next.textContent = cur === n - 1 ? (next.getAttribute('data-finish') || 'Finish') : 'Next';
    var c = root.querySelector('[data-stp-count]'); if(c) c.textContent = 'Step ' + (cur + 1) + ' of ' + n;
  }
  function go(root, i){ root.setAttribute('data-cur', i); render(root); }
  document.addEventListener('click', function(e){
    var root = e.target.closest && e.target.closest('[data-stp-live]'); if(!root) return;
    var n = root.querySelectorAll('[data-stp] .stp-el').length, cur = +root.getAttribute('data-cur') || 0;
    var done = (root.getAttribute('data-done') || '').split(',').filter(Boolean).map(Number);
    if(e.target.closest('[data-stp-next]')){
      if(done.indexOf(cur) < 0) done.push(cur);
      root.setAttribute('data-done', done.join(','));
      if(cur < n - 1) go(root, cur + 1);
      else { root.setAttribute('data-finished', ''); render(root); var f = root.querySelector('[data-stp-done-msg]'); if(f) f.hidden = false; }
      return;
    }
    if(e.target.closest('[data-stp-back]')){ if(cur > 0) go(root, cur - 1); return; }
    if(e.target.closest('[data-stp-reset]')){ root.setAttribute('data-done',''); root.removeAttribute('data-finished'); var m = root.querySelector('[data-stp-done-msg]'); if(m) m.hidden = true; go(root, 0); return; }
    var hit = e.target.closest('.stp-el__hit');
    if(hit && !hit.disabled){ root.removeAttribute('data-finished'); var els = [].slice.call(root.querySelectorAll('[data-stp] .stp-el')); go(root, els.indexOf(hit.closest('.stp-el'))); }
  });
  function init(){ document.querySelectorAll('[data-stp-live]').forEach(render); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.CubeStepper = {render:render, go:go};
})();
