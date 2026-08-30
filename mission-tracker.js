/* Multi-satellite Earth-observation visualization for the cinematic globe. */
(() => {
  const Cesium = window.Cesium;
  const viewer = window.CesiumEarthViewer;
  const satellite = window.satellite;
  if (!Cesium || !viewer || !satellite) return;

  const FILE = 'data/missions.tle';
  const defs = [
    { key:'TERRA', label:'TERRA', color:Cesium.Color.ORANGE },
    { key:'AQUA', label:'AQUA', color:Cesium.Color.fromCssColorString('#7BE7FF') },
    { key:'LANDSAT 9', label:'LANDSAT 9', color:Cesium.Color.LIME },
    { key:'NOAA-21', label:'NOAA-21', color:Cesium.Color.YELLOW }
  ];
  const assets = new Map();
  let sats = [];
  let loadedAt = null;

  const css = document.createElement('style');
  css.textContent = `.mission-panel{position:fixed;right:18px;bottom:122px;z-index:27;width:255px;border:1px solid rgba(255,255,255,.11);border-radius:7px;background:rgba(3,10,16,.84);backdrop-filter:blur(14px);box-shadow:0 16px 45px #0008;font:8px ui-monospace,SFMono-Regular,Menlo,monospace;color:#dce7eb;letter-spacing:.08em}.mission-head{padding:9px 11px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;font-weight:900}.mission-head span:last-child{color:#5ef0a6;font-size:7px}.mission-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.06)}.mission-dot{width:7px;height:7px;border-radius:50%;box-shadow:0 0 9px currentColor}.mission-name{flex:1}.mission-state{font-size:7px;color:#8796a0}.mission-row b{font-size:8px}.mission-foot{padding:7px 10px;color:#82919a;font-size:7px}@media(max-width:900px){.mission-panel{right:10px;bottom:110px;width:215px}}@media(max-width:620px){.mission-panel{right:10px;bottom:95px;width:185px}.mission-row{padding:6px 8px}.mission-foot{display:none}}`;
  document.head.appendChild(css);
  const panel = document.createElement('section');
  panel.className = 'mission-panel';
  panel.innerHTML = '<div class="mission-head"><span>EARTH-OBSERVING FLEET</span><span id="fleetState">SYNCING</span></div><div id="fleetRows"></div><div class="mission-foot">ISS 25544 + NASA EARTH MISSIONS · SGP4</div>';
  document.body.appendChild(panel);

  const rows = panel.querySelector('#fleetRows');
  for (const d of defs) {
    const row = document.createElement('div'); row.className='mission-row'; row.dataset.key=d.key;
    row.innerHTML = `<span class="mission-dot" style="color:${d.color.toCssColorString()};background:${d.color.toCssColorString()}"></span><span class="mission-name">${d.label}</span><span class="mission-state">WAITING</span>`;
    rows.appendChild(row);
  }

  function parse(text) {
    const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean), out=[];
    for(let i=0;i<lines.length;){
      if(lines[i].startsWith('1 ') && lines[i+1]?.startsWith('2 ')){out.push({name:'UNKNOWN',l1:lines[i],l2:lines[i+1]});i+=2;continue;}
      if(lines[i+1]?.startsWith('1 ') && lines[i+2]?.startsWith('2 ')){out.push({name:lines[i],l1:lines[i+1],l2:lines[i+2]});i+=3;continue;}
      i++;
    }
    return out;
  }
  function matchDef(name, satrec) {
    const n=(name||'').toUpperCase();
    for(const d of defs) if(n.includes(d.key)) return d;
    const id=String(satrec.satnum||'');
    if(id==='25994') return defs[0];
    if(id==='27424') return defs[1];
    if(id==='49260') return defs[2];
    if(id==='54234') return defs[3];
    return null;
  }
  async function load() {
    try {
      const r=await fetch(FILE,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status);
      const text=await r.text(); sats=parse(text).map(item=>{try{const rec=satellite.twoline2satrec(item.l1,item.l2);const def=matchDef(item.name,rec);return def?{...item,rec,def}:null}catch{return null}}).filter(Boolean);
      loadedAt=new Date(); panel.querySelector('#fleetState').textContent=`${sats.length} ACTIVE`;
      for(const d of defs){const row=rows.querySelector(`[data-key="${d.key}"] .mission-state`);if(row)row.textContent=sats.some(s=>s.def.key===d.key)?'TRACKING':'NO TLE'}
      for(const s of sats){if(!assets.has(s.def.key)){const entity=viewer.entities.add({id:'SAT-'+s.def.key,name:s.def.label,position:Cesium.Cartesian3.fromDegrees(0,0,700000),point:{pixelSize:7,color:s.def.color,outlineColor:Cesium.Color.BLACK,outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY},label:{text:s.def.label,font:'700 9px monospace',fillColor:s.def.color,outlineColor:Cesium.Color.BLACK,outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,verticalOrigin:Cesium.VerticalOrigin.BOTTOM,pixelOffset:new Cesium.Cartesian2(0,-10),disableDepthTestDistance:Number.POSITIVE_INFINITY,showBackground:true,backgroundColor:new Cesium.Color(.02,.06,.09,.65),backgroundPadding:new Cesium.Cartesian2(4,3)}});const path=viewer.entities.add({id:'PATH-'+s.def.key,polyline:{positions:[],width:1.1,material:new Cesium.PolylineGlowMaterialProperty({glowPower:.13,color:s.def.color.withAlpha(.32)}),arcType:Cesium.ArcType.NONE}});assets.set(s.def.key,{entity,path})}}
    }catch(e){panel.querySelector('#fleetState').textContent='OFFLINE';console.warn('Mission TLE cache unavailable',e)}
  }
  function tick(){const now=new Date();for(const s of sats){try{const pv=satellite.propagate(s.rec,now);if(!pv.position)continue;const g=satellite.eciToGeodetic(pv.position,satellite.gstime(now));const lat=satellite.degreesLat(g.latitude),lon=satellite.degreesLong(g.longitude),alt=Math.max(g.height,0)*1000;const a=assets.get(s.def.key);if(!a)continue;a.entity.position=Cesium.Cartesian3.fromDegrees(lon,lat,alt);const pts=[];for(let m=-20;m<=20;m+=2){const t=new Date(now.getTime()+m*60000),pp=satellite.propagate(s.rec,t);if(!pp.position)continue;const gg=satellite.eciToGeodetic(pp.position,satellite.gstime(t));pts.push(Cesium.Cartesian3.fromDegrees(satellite.degreesLong(gg.longitude),satellite.degreesLat(gg.latitude),Math.max(gg.height,0)*1000+12000))}a.path.polyline.positions=pts}catch{}}
  }
  window.EarthMissionFleet={load,tick,getCount:()=>sats.length};
  load();
  setInterval(load,30*60*1000);
  setInterval(tick,5000);
})();
