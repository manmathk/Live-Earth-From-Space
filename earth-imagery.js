/* NOAA GOES + NASA EPIC Earth imagery layer. */
const EarthImagery=(()=>{
  const GOES='https://www.goes.noaa.gov/';
  const EPIC='https://epic.gsfc.nasa.gov/api/natural';
  const img=()=>document.getElementById('earthImage');
  const status=()=>document.getElementById('imageryStatus');
  function setStatus(t){if(status())status().textContent=t}
  async function epic(){
    try{
      const r=await fetch(EPIC,{cache:'no-store'}); if(!r.ok)throw Error('EPIC '+r.status);
      const a=await r.json(); if(!a?.length)throw Error('No EPIC imagery');
      const x=a[0],d=x.date.slice(0,10).split('-');
      const url=`https://epic.gsfc.nasa.gov/archive/natural/${d[0]}/${d[1]}/${d[2]}/jpg/${x.image}.jpg`;
      if(img()){img().src=url;img().classList.add('visible');}
      setStatus('NASA EPIC · '+x.date.replace('T',' ').slice(0,19)+' UTC');
      return true;
    }catch(e){setStatus('EPIC UNAVAILABLE · NOAA FALLBACK');return false}
  }
  function goes(){
    if(img()){img().src='https://www.goes.noaa.gov/';img().classList.remove('visible');}
    setStatus('NOAA GOES · NEAR-REAL-TIME');
  }
  return {epic,goes,GOES};
})();
window.EarthImagery=EarthImagery;
EarthImagery.epic();
setInterval(()=>EarthImagery.epic(),10*60*1000);
