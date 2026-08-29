const TLE_URLS=[
  'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE',
  'https://celestrak.org/NORAD/elements/stations.txt'
];
let issSat=null,tleEpoch=null,tleLoadedAt=null,period=92.9,lastGeo=0,lastPath=0;
const el=id=>document.getElementById(id);

function setFeed(text,ok=true){if(el('feed')){el('feed').textContent=text;el('feed').className='badge '+(ok?'ok':'bad')}}
function parseTLE(text){
  const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  for(let i=0;i<lines.length-2;i++){
    if(lines[i].includes('1 25544')&&lines[i+1].includes('2 25544')) return [lines[i],lines[i+1]];
    if(lines[i].toUpperCase().includes('ISS')&&lines[i+1]?.startsWith('1 ')&&lines[i+2]?.startsWith('2 ')) return [lines[i+1],lines[i+2]];
  }
  throw Error('ISS TLE not found');
}
async function fetchText(url){
  const r=await fetch(url,{cache:'no-store',mode:'cors'});
  if(!r.ok)throw Error('HTTP '+r.status);
  return r.text();
}
async function loadISS(){
  for(const url of TLE_URLS){
    try{
      const text=await fetchText(url), [l1,l2]=parseTLE(text);
      issSat=satellite.twoline2satrec(l1,l2);
      tleEpoch=satellite.jdayToDate(issSat.epochyr,issSat.epochdays);
      tleLoadedAt=new Date();
      period=2*Math.PI/issSat.no*60;
      el('period').textContent=period.toFixed(2)+' MIN';
      setFeed('LIVE TLE',true);
      if(el('source'))el('source').textContent='CELESTRAK GP · SGP4';
      return true;
    }catch(e){console.warn('TLE source failed',url,e)}
  }
  setFeed('TLE OFFLINE',false);
  return false;
}
function sunSubpoint(d){
  const jd=d.getTime()/86400000+2440587.5,n=jd-2451545;
  const L=(280.46+.9856474*n)*Math.PI/180,g=(357.53+.9856*n)*Math.PI/180;
  const lam=L+(1.915*Math.sin(g)+.02*Math.sin(2*g))*Math.PI/180;
  const eps=(23.439-.0000004*n)*Math.PI/180;
  const ra=Math.atan2(Math.cos(eps)*Math.sin(lam),Math.cos(lam));
  const dec=Math.asin(Math.sin(eps)*Math.sin(lam));
  const gm=(280.46061837+360.98564736629*(jd-2451545))*Math.PI/180;
  let lo=(ra-gm)*180/Math.PI; lo=((lo+540)%360)-180;
  return [dec*180/Math.PI,lo];
}
function sunVector(lat,lon){
  const a=lat*Math.PI/180,b=lon*Math.PI/180;
  return new THREE.Vector3(Math.cos(a)*Math.cos(b),Math.sin(a),-Math.cos(a)*Math.sin(b));
}
function tickISS(){
  if(!issSat)return;
  try{
    const now=new Date(),p=satellite.propagate(issSat,now);
    if(!p.position||!p.velocity)return;
    const gmst=satellite.gstime(now),g=satellite.eciToGeodetic(p.position,gmst);
    const lat=satellite.degreesLat(g.latitude),lon=satellite.degreesLong(g.longitude),alt=g.height;
    const v=Math.hypot(p.velocity.x,p.velocity.y,p.velocity.z);
    el('lat').textContent=lat.toFixed(2)+'°'; el('lon').textContent=lon.toFixed(2)+'°';
    el('alt').textContent=alt.toFixed(1)+' KM'; el('vel').textContent=Math.round(v*3.6).toLocaleString()+' KM/H';
    el('age').textContent=tleEpoch?((now-tleEpoch)/86400000).toFixed(2)+' D':'—';
    el('orbit').textContent=tleEpoch?Math.floor((now-tleEpoch)/(period*60000))+1:'—';
    const sun=sunSubpoint(now), dlat=(lat-sun[0])*Math.PI/180,dlon=(lon-sun[1])*Math.PI/180;
    const sunlit=Math.cos(dlat)*Math.cos(dlon)>0;
    el('light').textContent=sunlit?'SUNLIT':'ECLIPSED'; el('light').className='val '+(sunlit?'g':'a');
    el('utc').textContent='UTC '+now.toISOString().replace('T',' ').slice(0,19);
    if(el('where'))el('where').textContent=countryApprox(lat,lon);
    window.updateISS3D?.(lat,lon,alt);
    window.updateSun?.(sun[0],sun[1]);
    if(Date.now()-lastPath>30000){lastPath=Date.now();window.updateOrbitPath?.(issSat,now)}
  }catch(e){console.warn('ISS propagation error',e);setFeed('PROPAGATION ERROR',false)}
}
function countryApprox(lat,lon){
  if(lat>8&&lat<37&&lon>68&&lon<98)return 'OVER INDIA / ASIA';
  if(lat>-35&&lat<5&&lon>15&&lon<50)return 'OVER AFRICA';
  if(lat>25&&lat<72&&lon>-25&&lon<45)return 'OVER EUROPE';
  if(lat>-55&&lat<15&&lon>-85&&lon<-30)return 'OVER SOUTH AMERICA';
  if(lat>15&&lat<70&&lon>-170&&lon<-50)return 'OVER NORTH AMERICA';
  if(lat<-55)return 'OVER ANTARCTICA';
  return 'OVER OCEAN';
}
window.issTracker={loadISS,tickISS,getSat:()=>issSat};
loadISS();
setInterval(loadISS,30*60*1000);
setInterval(tickISS,1000);
