/* ISS Earth Observatory — resilient orbital data layer
   Primary: CelesTrak GP endpoint. Secondary: ISS TLE endpoint.
   Keeps the last valid element set when a network request fails.
*/
(function(){
  const SOURCES=[
    'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle',
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle'
  ];
  let tle=null, sat=null, fetchedAt=0, source='NONE', failCount=0;
  function parse(text){
    const lines=text.trim().split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    for(let i=0;i<lines.length;i++){
      if(lines[i].startsWith('1 25544 ') && lines[i+1] && lines[i+1].startsWith('2 25544 ')) return [lines[i],lines[i+1]];
      if(/^ISS|ZARYA/i.test(lines[i]) && lines[i+1]?.startsWith('1 ') && lines[i+2]?.startsWith('2 ')) return [lines[i+1],lines[i+2]];
    }
    for(let i=0;i<lines.length-1;i++) if(lines[i].startsWith('1 25544 ')&&lines[i+1].startsWith('2 25544 ')) return [lines[i],lines[i+1]];
    return null;
  }
  async function load(){
    for(const url of SOURCES){
      try{
        const r=await fetch(url,{cache:'no-store',mode:'cors'}); if(!r.ok) throw Error('HTTP '+r.status);
        const pair=parse(await r.text()); if(!pair) throw Error('Invalid ISS TLE');
        const s=satellite.twoline2satrec(pair[0],pair[1]);
        const pv=satellite.propagate(s,new Date());
        if(!pv.position || !pv.velocity) throw Error('Propagation validation failed');
        tle=pair;sat=s;fetchedAt=Date.now();source=url.includes('GROUP=stations')?'CELESTRAK-STATIONS':'CELESTRAK-25544';failCount=0;
        return true;
      }catch(e){ failCount++; }
    }
    return !!sat;
  }
  function propagate(date){
    if(!sat) return null;
    try{
      const pv=satellite.propagate(sat,date); if(!pv.position||!pv.velocity) return null;
      const gmst=satellite.gstime(date), geo=satellite.eciToGeodetic(pv.position,gmst);
      const lat=satellite.degreesLat(geo.latitude), lon=satellite.degreesLong(geo.longitude);
      const alt=geo.height;
      const v=Math.sqrt(pv.velocity.x**2+pv.velocity.y**2+pv.velocity.z**2);
      const sun=satellite.eciToEcf(satellite.sunPositionECI(date),gmst);
      const sunlit=(()=>{const er=6378.137, p=pv.position, sp=satellite.sunPositionECI(date); const pm=Math.sqrt(p.x**2+p.y**2+p.z**2), sm=Math.sqrt(sp.x**2+sp.y**2+sp.z**2), dot=p.x*sp.x+p.y*sp.y+p.z*sp.z; return dot>0 || Math.sqrt(pm*pm-(dot/sm)**2)>er;})();
      return {lat,lon,alt,velocity:v,position:pv.position,sunlit,gmst};
    }catch(e){return null;}
  }
  window.ISSTracker={load,propagate,get sat(){return sat},get tle(){return tle},get fetchedAt(){return fetchedAt},get source(){return source},get failCount(){return failCount}};
})();
