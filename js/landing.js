document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.nav-links a').forEach(function(a){
    a.addEventListener('click', function(e){
      if(this.hash){
        e.preventDefault();
        document.querySelector(this.hash)?.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });

  const observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.style.opacity='1';
        entry.target.style.transform='translateY(0)';
      }
    });
  },{threshold:0.1});

  document.querySelectorAll('.card,.price-card,.step').forEach(function(el){
    el.style.opacity='0';
    el.style.transform='translateY(20px)';
    el.style.transition='opacity .5s ease, transform .5s ease';
    observer.observe(el);
  });

  (function exitIntent(){
    const modal = document.getElementById('exit-modal');
    const close = document.getElementById('exit-close');
    if(!modal||sessionStorage.getItem('ip_exit_shown')) return;
    function show(){
      modal.hidden=false;
      sessionStorage.setItem('ip_exit_shown','1');
    }
    document.addEventListener('mouseout', function(e){
      if(!e.relatedTarget && e.clientY<10) show();
    });
    close.onclick = ()=>modal.hidden=true;
    modal.onclick = function(e){ if(e.target===modal) modal.hidden=true; };
  })();
});
