/* Cube Right overlay — live demo behaviour.
   <div class="rov-stage" data-rov-stage> … rows [data-rov-open] … <div class="rov-stage__scrim"></div> <div class="rov" role="dialog" aria-modal="true"> … </div></div>
   Opens from a row, closes with ×, Esc, the scrim or a footer button marked [data-rov-close]. Tabs switch [data-rov-panel]s. */
(function(){
  function open(stage, row){
    var o = stage.querySelector('.rov');
    stage.querySelectorAll('[data-rov-open][aria-current]').forEach(function(r){ r.removeAttribute('aria-current'); });
    if(row){
      row.setAttribute('aria-current','true');
      var d = row.dataset;
      o.querySelectorAll('[data-rov-bind]').forEach(function(el){ var k = el.getAttribute('data-rov-bind'); if(d[k] != null) el.textContent = d[k]; });
    }
    stage.setAttribute('data-open','');
    stage._return = row || document.activeElement;
    var c = o.querySelector('.rov__close'); if(c) setTimeout(function(){ c.focus({preventScroll:true}); }, 30);
    stage.dispatchEvent(new CustomEvent('cube:overlay', {bubbles:true, detail:{open:true, row:row}}));
  }
  function close(stage){
    if(!stage.hasAttribute('data-open')) return;
    stage.removeAttribute('data-open');
    stage.querySelectorAll('[data-rov-open][aria-current]').forEach(function(r){ r.removeAttribute('aria-current'); });
    if(stage._return && stage._return.focus) stage._return.focus({preventScroll:true});
  }
  document.addEventListener('click', function(e){
    var t = e.target, stage = t.closest && t.closest('[data-rov-stage]');
    if(!stage) return;
    var row = t.closest('[data-rov-open]');
    if(row){ open(stage, row); return; }
    if(t.closest('.rov__close') || t.closest('.rov-stage__scrim') || t.closest('[data-rov-close]')){ close(stage); return; }
    var tab = t.closest('.rov__tab');
    if(tab){
      var tabs = tab.parentNode.querySelectorAll('.rov__tab');
      tabs.forEach(function(x){ x.setAttribute('aria-selected', String(x === tab)); x.tabIndex = x === tab ? 0 : -1; });
      var o = tab.closest('.rov'), id = tab.getAttribute('aria-controls');
      o.querySelectorAll('[data-rov-panel]').forEach(function(p){ p.hidden = p.id !== id; });
      o.dispatchEvent(new CustomEvent('cube:tab', {bubbles:true, detail:{id:id}}));
    }
  });
  document.addEventListener('keydown', function(e){
    var row = e.target.closest && e.target.closest('[data-rov-open]');
    if(row && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); open(row.closest('[data-rov-stage]'), row); return; }
    if(e.key === 'Escape'){ document.querySelectorAll('[data-rov-stage][data-open]').forEach(close); return; }
    var tab = e.target.closest && e.target.closest('.rov__tab');
    if(tab && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')){
      var all = [].slice.call(tab.parentNode.querySelectorAll('.rov__tab')), i = all.indexOf(tab);
      var n = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length]; n.focus(); n.click();
    }
    if(e.key === 'Tab'){ // keep focus inside an open overlay
      var stage = document.querySelector('[data-rov-stage][data-open]'); if(!stage) return;
      var f = [].slice.call(stage.querySelector('.rov').querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')).filter(function(x){ return x.offsetParent !== null; });
      if(!f.length) return;
      if(e.shiftKey && document.activeElement === f[0]){ e.preventDefault(); f[f.length-1].focus(); }
      else if(!e.shiftKey && document.activeElement === f[f.length-1]){ e.preventDefault(); f[0].focus(); }
    }
  });
  window.CubeOverlay = {open:open, close:close};
})();
