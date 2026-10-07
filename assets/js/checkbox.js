/* Cube Checkbox.
   Markup: <label class="cbx cbx--inline|--chip|--bare cbx--m|--l"><input type="checkbox"><span class="cbx__box"></span>…</label>
   Native checkboxes do the work. This script only:
   - sets the Intermediate (indeterminate) look on inputs with [data-indeterminate] — HTML can't express it;
   - links a "select all" parent to its children: inside [data-cbx-group], the input with [data-cbx-all] checks /
     unchecks every enabled [data-cbx-item], and goes indeterminate when only some are checked.
   A "cube:checkbox" event (detail.checked, detail.count) bubbles from the group on every change. */
(function(){
  function items(g){ return Array.prototype.slice.call(g.querySelectorAll('input[data-cbx-item]')); }
  function sync(g){
    var all = g.querySelector('input[data-cbx-all]'), its = items(g), on = its.filter(function(i){ return i.checked; }).length;
    if(all){
      all.checked = on > 0 && on === its.length;
      all.indeterminate = on > 0 && on < its.length;
    }
    g.dispatchEvent(new CustomEvent('cube:checkbox', {bubbles:true, detail:{checked:on, count:its.length}}));
  }
  document.addEventListener('change', function(e){
    var i = e.target, g = i.closest && i.closest('[data-cbx-group]');
    if(!g) return;
    if(i.hasAttribute('data-cbx-all')){
      items(g).forEach(function(x){ if(!x.disabled) x.checked = i.checked; });
    }
    sync(g);
  });
  function init(){
    Array.prototype.forEach.call(document.querySelectorAll('input[data-indeterminate]'), function(i){ i.indeterminate = true; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-cbx-group]'), sync);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.CubeCheckbox = {sync:sync};
})();
