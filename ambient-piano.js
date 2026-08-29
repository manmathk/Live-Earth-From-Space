/* ISS Earth Observatory — original ambient piano generator
   No external audio file or copyrighted recording is used.
   Web Audio synthesizes a slow, cinematic piano-like ambient bed locally.
*/
(function(){
  let ctx=null, master=null, timer=null, playing=false;
  const notes=[48,55,60,64,67,72,76,79,72,67,64,60,55,52];
  const freq=n=>440*Math.pow(2,(n-69)/12);
  function setup(){
    if(ctx)return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain(); master.gain.value=.0001; master.connect(ctx.destination);
  }
  function piano(note,when,duration,velocity){
    const f=freq(note), osc=ctx.createOscillator(), body=ctx.createBiquadFilter(), g=ctx.createGain();
    osc.type='triangle'; osc.frequency.setValueAtTime(f,when);
    body.type='lowpass'; body.frequency.setValueAtTime(2400,when); body.Q.value=.35;
    g.gain.setValueAtTime(.0001,when);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,velocity),when+.018);
    g.gain.exponentialRampToValueAtTime(.0001,when+duration);
    osc.connect(body); body.connect(g); g.connect(master); osc.start(when); osc.stop(when+duration+.08);
  }
  function pad(root,when){
    [root,root+12,root+19].forEach((n,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine';o.frequency.value=freq(n);
      g.gain.setValueAtTime(.0001,when);g.gain.linearRampToValueAtTime(.012,when+1.4);g.gain.linearRampToValueAtTime(.0001,when+5.8+i*.2);
      o.connect(g);g.connect(master);o.start(when);o.stop(when+6.2);
    });
  }
  function schedule(){
    if(!playing)return;
    const now=ctx.currentTime+.05;
    for(let i=0;i<notes.length;i++){
      const t=now+i*1.25;
      piano(notes[i],t,3.4,.025);
      if(i%4===0)pad(notes[i]-12,t);
    }
    timer=setTimeout(schedule,notes.length*1250-100);
  }
  window.ISSBackgroundMusic={
    toggle:function(){
      setup();
      if(ctx.state==='suspended')ctx.resume();
      playing=!playing;
      if(playing){master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(.32,ctx.currentTime,.8);schedule();}
      else{master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(.0001,ctx.currentTime,.7);clearTimeout(timer);}
      return playing;
    },
    isPlaying:function(){return playing;}
  };
})();
