// sound.js — inicialização e toggle de música do menu
(function(){
  function initAutoplay(){
    const a = document.getElementById("musicaFundoMenu");
    if(!a) return;
    a.volume = 0.5;
    a.muted = false;
    a.play().catch(()=>{
      const unlock = () => {
        a.play().catch(()=>{});
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
      };
      window.addEventListener("pointerdown", unlock, { once:true });
      window.addEventListener("keydown", unlock, { once:true });
    });
  }
  
  function initToggle(){
    const a = document.getElementById("musicaFundoMenu");
    const btn = document.getElementById("toggleSound");
    if(!a || !btn) return;
    const update = () => {
      btn.textContent = a.muted ? "🔇 Som" : "🔊 Som";
      btn.setAttribute("aria-pressed", String(!a.muted));
    };
    update();
    btn.addEventListener("click", (ev)=>{
      ev.preventDefault();
      a.muted = !a.muted;
      if(!a.muted){ a.play().catch(()=>{}); }
      update();
    });
  }
  document.addEventListener("DOMContentLoaded", ()=>{
    initAutoplay();
    initToggle();
  });
})();