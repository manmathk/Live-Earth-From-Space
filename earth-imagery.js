/* NOAA GOES + NASA EPIC Earth imagery layer. */
const EarthImagery=(()=>{
  const EPIC='https://epic.gsfc.nasa.gov/api/natural';
  const GOES_IMG='https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/1200x1200.jpg';
  const img=()=>document.getElementById('earthImage');
  const status=()=>document.getElementById('imageryStatus');
  function setStatus(t){if(status())status().textContent=t}
  function show(src,label){
    const node=img(); if(!node) return Promise.resolve(false);
    return new Promise(resolve=>{
      node.onload=()=>{node.classList.add('show');node.classList.remove('visible');setStatus(label);resolve(true)};
      node.onerror=()=>{node.classList.remove('show');resolve(false)};
      node.src=src+'?v='+Date.now();
    });
  }
  async function epic(){
    try{
      const r=await fetch(EPIC,{cache:'no-store'}); if(!r.ok)throw Error('EPIC '+r.status);
      const a=await r.json(); if(!Array.isArray(a)||!a.length)throw Error('No EPIC imagery');
      const x=a[0],d=x.date.slice(0,10).split('-');
      const url=`https://epic.gsfc.nasa.gov/archive/natural/${d[0]}/${d[1]}/${d[2]}/jpg/${x.image}.jpg`;
      const ok=await show(url,'NASA EPIC · '+x.date.replace('T',' ').slice(0,19)+' UTC');
      if(!ok) throw Error('EPIC image failed');
      window.EarthImagery.mode='EPIC'; return true;
    }catch(e){
      setStatus('EPIC UNAVAILABLE · NOAA GOES');
      return goes(true);
    }
  }
  async function goes(silent=false){
    const ok=await show(GOES_IMG,'NOAA GOES-19 · GEOCOLOR · NEAR-REAL-TIME');
    if(ok) window.EarthImagery.mode='GOES';
    else if(!silent) setStatus('NOAA GOES IMAGE UNAVAILABLE');
    return ok;
  }
  return {epic,goes,GOES_IMG,mode:'EPIC'};
})();
window.EarthImagery=EarthImagery;
EarthImagery.epic();
setInterval(()=>{ if(EarthImagery.mode==='GOES') EarthImagery.goes(true); else EarthImagery.epic(); },10*60*1000);
