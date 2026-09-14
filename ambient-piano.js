/* ISS Earth Observatory — iOS-safe ambient piano generator
   No external audio file or copyrighted recording is used.
   Web Audio synthesizes a slow, cinematic piano-like ambient bed locally.
*/
(function(){
  let ctx=null, master=null, timer=null, playing=false, ui=null;
  let starting=false;
  const notes=[48,55,60,64,67,72,76,79,72,67,64,60,55,52];
  const freq=n=>440*Math.pow(2,(n-69)/12);

  function getAudioContext(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC) return null;
      ctx=new AC();
      master=ctx.createGain();
      master.gain.value=.0001;
      master.connect(ctx.destination);
    }
    return ctx;
  }

  async function resumeContext(){
    const c=getAudioContext();
    if(!c) return false;
    try{
      if(c.state==='suspended' || c.state==='interrupted') await c.resume();
      return c.state==='running';
    }catch(e){
      console.warn('Background music could not start:',e);
      return false;
    }
  }

  function piano(note,when,duration,velocity){
    const c=getAudioContext();
    if(!c || !master) return;
    const f=freq(note),osc=c.createOscillator(),body=c.createBiquadFilter(),g=c.createGain();
    osc.type='triangle';
    osc.frequency.setValueAtTime(f,when);
    body.type='lowpass';
    body.frequency.setValueAtTime(2400,when);
    body.Q.value=.35;
    g.gain.setValueAtTime(.0001,when);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,velocity),when+.018);
    g.gain.exponentialRampToValueAtTime(.0001,when+duration);
    osc.connect(body);body.connect(g);g.connect(master);
    osc.start(when);osc.stop(when+duration+.08);
  }

  function pad(root,when){
    const c=getAudioContext();
    if(!c || !master) return;
    [root,root+12,root+19].forEach((n,i)=>{
      const o=c.createOscillator(),g=c.createGain();
      o.type='sine';o.frequency.value=freq(n);
      g.gain.setValueAtTime(.0001,when);
      g.gain.linearRampToValueAtTime(.012,when+1.4);
      g.gain.linearRampToValueAtTime(.0001,when+5.8+i*.2);
      o.connect(g);g.connect(master);
      o.start(when);o.stop(when+6.2);
    });
  }

  function schedule(){
    if(!playing || !ctx || ctx.state!=='running') return;
    const now=ctx.currentTime+.05;
    for(let i=0;i<notes.length;i++){
      const t=now+i*1.25;
      piano(notes[i],t,3.4,.025);
      if(i%4===0) pad(notes[i]-12,t);
    }
    clearTimeout(timer);
    timer=setTimeout(schedule,notes.length*1250-100);
  }

  async function toggle(){
    if(starting) return playing;
    starting=true;
    try{
      const c=getAudioContext();
      if(!c) return playing;

      if(!playing){
        const ready=await resumeContext();
        if(!ready) return playing;
        playing=true;
        master.gain.cancelScheduledValues(c.currentTime);
        master.gain.setTargetAtTime(.32,c.currentTime,.8);
        schedule();
      }else{
        playing=false;
        master.gain.cancelScheduledValues(c.currentTime);
        master.gain.setTargetAtTime(.0001,c.currentTime,.7);
        clearTimeout(timer);
      }
      updateUI();
      return playing;
    }finally{
      starting=false;
    }
  }

  function updateUI(){
    if(!ui) return;
    ui.textContent=playing?'♫ MUSIC ON':'♫ MUSIC OFF';
    ui.classList.toggle('on',playing);
    ui.setAttribute('aria-pressed',playing?'true':'false');
  }

  function makeUI(){
    const existing=document.getElementById('music');
    if(existing){
      ui=existing;
      ui.onclick=toggle;
      updateUI();
      return;
    }
    const b=document.createElement('button');
    b.id='music';
    b.textContent='♫ MUSIC OFF';
    b.setAttribute('aria-label','Toggle background music');
    b.setAttribute('aria-pressed','false');
    b.style.cssText='position:fixed;z-index:30;right:20px;bottom:20px;padding:9px 12px;border:1px solid rgba(130,220,255,.15);border-radius:10px;background:rgba(4,10,17,.92);color:#7f9aae;font:800 10px Inter,system-ui,sans-serif;letter-spacing:.08em;backdrop-filter:blur(18px);cursor:pointer;box-shadow:0 15px 50px #0009;touch-action:manipulation;-webkit-tap-highlight-color:transparent';
    b.addEventListener('click',toggle);
    b.addEventListener('touchend',function(e){
      e.preventDefault();
      toggle();
    },{passive:false});
    document.body.appendChild(b);
    ui=b;
  }

  window.ISSBackgroundMusic={
    toggle,
    isPlaying:()=>playing,
    resume:resumeContext
  };

  window.addEventListener('spaceMusicToggle',()=>toggle());
  document.addEventListener('visibilitychange',async()=>{
    if(document.visibilityState==='visible' && playing){
      await resumeContext();
      schedule();
    }
  });
  window.addEventListener('pageshow',async()=>{
    if(playing){await resumeContext();schedule();}
  });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',makeUI);
  else makeUI();
})();
