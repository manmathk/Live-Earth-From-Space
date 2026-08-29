/* Live ISS telemetry bridge.
   Uses Where The ISS At? for current position/velocity/visibility,
   and its TLE endpoint to drive the local SGP4 orbit path when available.
*/
(()=>{
  const POS='https://api.wheretheiss.at/v1/satellites/25544';
  const TLE='https://api.wheretheiss.at/v1/satellites/25544/tles';
  const $=id=>document.getElementById(id);
  let last=null,tleTime=null,satrec=null;
  const text=(id,v)=>{const e=$(id);if(e)e.textContent=v};
  const n=(v,d=1)=>Number(v).toFixed(d);
  const lat=v=>`${Math.abs(v).toFixed(2)}° ${v>=0?'N':'S'}`;
  const lon=v=>`${Math.abs(v).toFixed(2)}° ${v>=0?'E':'W'}`;
  async function json(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),6500);try{const r=await fetch(url,{cache:'no-store',signal:c.signal});if(!r.ok)throw Error(r.status);return await r.json()}finally{clearTimeout(timer)}}
  async function loadTle(){
    try{
      const d=await json(TLE); if(!d?.line1||!d?.line2)throw Error('bad tle');
      tleTime=Number(d.tle_timestamp||Date.now()/1000)*1000;
      if(window.satellite) satrec=satellite.twoline2satrec(d.line1,d.line2);
      if(satrec&&window.updateOrbitPath)window.updateOrbitPath(satrec,new Date());
      text('age',age());
    }catch(e){}
  }
  function age(){if(!tleTime)return '—';const s=Math.max(0,Math.floor((Date.now()-tleTime)/1000));return s<60?s+' s':s<3600?Math.floor(s/60)+' min':Math.floor(s/3600)+' h'}
  async function poll(){
    try{
      const d=await json(POS); last=d;
      const a=Number(d.altitude),v=Number(d.velocity),la=Number(d.latitude),lo=Number(d.longitude);
      text('alt',`${n(a,1)} km`);text('vel',`${Math.round(v).toLocaleString()} km/h`);text('lat',lat(la));text('lon',lon(lo));
      text('light',(d.visibility||'unknown').toUpperCase());
      text('period','~92.7 min');text('orbit','TRACKING');text('trackState','LIVE');text('age',age());
      text('where',`${lat(la)} · ${lon(lo)} · INTERNATIONAL SPACE STATION`);
      const feed=$('feed');if(feed){feed.textContent='LIVE';feed.classList.remove('bad')}
      const dot=$('dot');if(dot){dot.style.left=`${Math.max(1,Math.min(99,(lo+180)/360*100))}%`;dot.style.top=`${Math.max(2,Math.min(98,(90-la)/180*100))}%`}
      if(window.updateISS3D)window.updateISS3D(la,lo,a);
      if(window.updateSun)window.updateSun(Number(d.solar_lat||0),Number(d.solar_lon||0));
    }catch(e){
      const feed=$('feed');if(feed){feed.textContent=last?'DEGRADED':'RETRYING';feed.classList.toggle('bad',!last)}
      if(!last){text('alt','RETRYING');text('vel','RETRYING');text('lat','RETRYING');text('lon','RETRYING')}
    }
  }
  poll();loadTle();setInterval(poll,5000);setInterval(loadTle,10*60*1000);setInterval(()=>text('age',age()),1000);
})();
