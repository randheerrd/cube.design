/* Cube Toggle-switch.
   Markup: <label class="tgl" data-size="l|m|s" [data-on] [data-disabled]>
             <span class="tgl__lbl">Prefix</span>
             <button type="button" class="tgl__track" role="switch" aria-checked="false"><span class="tgl__knob"></span></button>
           </label>
   Clicking the switch or its label flips it. A "cube:toggle" event (detail.on) bubbles from the .tgl. */
(function(){
  function set(t, on){
    var btn = t.querySelector('.tgl__track');
    t.toggleAttribute('data-on', on);
    if(btn) btn.setAttribute('aria-checked', String(on));
    t.dispatchEvent(new CustomEvent('cube:toggle', {bubbles:true, detail:{on:on}}));
  }
  document.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('.tgl__track[role="switch"]');
    if(!btn || btn.disabled) return;
    var t = btn.closest('.tgl');
    if(t) set(t, !t.hasAttribute('data-on'));
  });
  window.CubeToggle = {set:set};
})();
