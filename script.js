(function nav(){
  const navEl = document.querySelector('.nav');
  const toggle = document.getElementById('navToggle');
  if(!navEl || !toggle) return;

  toggle.addEventListener('click', () => {
    const open = navEl.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.querySelectorAll('.nav-mobile a').forEach(a=>{
    a.addEventListener('click', () => {
      navEl.classList.remove('is-open');
      toggle.setAttribute('aria-expanded','false');
    });
  });
})();
