/* GPM Core Observatory mode: real orbital propagation + NASA GIBS IMERG precipitation overlay. */
(() => {
  const Cesium = window.Cesium;
  const viewer = window.CesiumEarthViewer;
  const satellite = window.satellite;
  if (!Cesium || !viewer || !satellite) return;

  const TLE_FILE = 'data/gpm.tle';
  const GPM_ID = '39574';
  const PRECIP_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
  const WORLD = Cesium.Rectangle.fromDegrees(-180, -90, 180, 90);
  let satrec = null;
  let precipitationLayer = null;
  let active = false;
  let previous = null;
  let lastPath = 0;
  let passPhase = 0;

  const css = document.createElement('style');
  css.textContent = `
    .gpm-panel{position:fixed;right:18px;bottom:122px;z-index:29;width:282px;border:1px solid rgba(255,78,197,.28);border-radius:8px;background:linear-gradient(145deg,rgba(18,5,17,.91),rgba(5,8,15,.84));backdrop-filter:blur(16px);box-shadow:0 18px 55px #000a;color:#e8d9e5;font:8px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}.gpm-head{height:40px;padding:0 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.1);font-weight:900;letter-spacing:.16em}.gpm-head b{color:#ff4fc6;font-size:7px}.gpm-body{padding:10px 12px}.gpm-title{font:900 15px Inter,system-ui,sans-serif;letter-spacing:-.02em;color:#fff;margin-bottom:4px}.gpm-copy{color:#a995a4;font-size:7px;line-height:1.5}.gpm-stats{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.gpm-stat{padding:7px 8px;border:1px solid rgba(255,255,255,.08);border-radius:4px;background:#ffffff04}.gpm-stat span{display:block;color:#8b7887;font-size:6px;margin-bottom:4px}.gpm-stat b{font-size:10px;color:#f0dce9}.gpm-btn{width:100%;margin-top:9px;appearance:none;border:1px solid rgba(255,79,198,.45);background:rgba(255,79,198,.07);color:#ff77d5;border-radius:4px;padding:8px 9px;text-align:center;font:900 8px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.11em;cursor:pointer}.gpm-btn:hover,.gpm-btn.on{background:rgba(255,79,198,.13);box-shadow:0 0 22px rgba(255,79,198,.12)}.gpm-meta{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.08);color:#837181;font-size:6px;line-height:1.55}.gpm-meta b{color:#d8c7d3}.gpm-legend{display:flex;gap:3px;height:5px;margin-top:7px}.gpm-legend i{flex:1;border-radius:2px}.gpm-status{position:fixed;left:18px;bottom:132px;z-index:30;padding:7px 9px;border:1px solid rgba(255,79,198,.28);border-radius:4px;background:rgba(14,5,15,.84);color:#bd9fb5;font:7px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;display:none;backdrop-filter:blur(12px)}
    @media(max-width:900px){.gpm-panel{right:10px;bottom:104px;width:230px}.gpm-title{font-size:13px}.gpm-status{left:10px;bottom:116px}}@media(max-width:620px){.gpm-panel{right:10px;bottom:94px;width:190px}.gpm-stats{gap:5px}.gpm-stat{padding:6px}.gpm-copy{font-size:6px}.gpm-meta{display:none}.gpm-status{bottom:105px}}
  `;
  document.head.appendChild(css);

  const panel = document.createElement('section');
  panel.className = 'gpm-panel';
  panel.innerHTML = `
    <div class="gpm-head"><span>GPM PRECIPITATION OBSERVATORY</span><b id="gpmState">STANDBY</b></div>
    <div class="gpm-body">
      <div class="gpm-title">GPM CORE · 39574</div>
      <div class="gpm-copy">NASA/JAXA Global Precipitation Measurement Core Observatory. Follow the spacecraft through the latest NASA IMERG precipitation field.</div>
      <div class="gpm-stats">
        <div class="gpm-stat"><span>ALTITUDE</span><b id="gpmAlt">—</b></div>
        <div class="gpm-stat"><span>SPEED</span><b id="gpmVel">—</b></div>
        <div class="gpm-stat"><span>LATITUDE</span><b id="gpmLat">—</b></div>
        <div class="gpm-stat"><span>LONGITUDE</span><b id="gpmLon">—</b></div>
      </div>
      <div class="gpm-legend" aria-hidden="true">
        <i style="background:#3327f0"></i><i style="background:#00b6ff"></i><i style="background:#31df90"></i><i style="background:#ffe04a"></i><i style="background:#ff8c36"></i><i style="background:#ff3f75"></i>
      </div>
      <button class="gpm-btn" id="gpmFocus">FOCUS GPM + PRECIPITATION</button>
      <div class="gpm-meta">DATA <b>NASA GIBS · IMERG PRECIPITATION RATE</b><br>REFRESH <b id="gpmUpdated">—</b> · COVERAGE <b>GLOBAL</b></div>
    </div>`;
  document.body.appendChild(panel);

  const status = document.createElement('div');
  status.className = 'gpm-status';
  document.body.appendChild(status);
  const setStatus = text => { status.textContent = text; status.style.display = text ? 'block' : 'none'; };

  const entity = viewer.entities.add({
    id: 'GPM-39574',
    name: 'GPM Core Observatory · 39574',
    position: Cesium.Cartesian3.fromDegrees(0, 0, 440000),
    point: { pixelSize: 10, color: Cesium.Color.MAGENTA, outlineColor: Cesium.Color.WHITE, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    label: { text: 'GPM', font: '900 10px monospace', fillColor: Cesium.Color.fromCssColorString('#ff6fd3'), outlineColor: Cesium.Color.BLACK, outlineWidth: 3, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -14), disableDepthTestDistance: Number.POSITIVE_INFINITY, showBackground: true, backgroundColor: new Cesium.Color(.08,.02,.08,.82), backgroundPadding: new Cesium.Cartesian2(5,3) }
  });

  const orbit = viewer.entities.add({ id: 'GPM-ORBIT', name: 'GPM ±45 minute orbit', polyline: { positions: [], width: 2, material: new Cesium.PolylineGlowMaterialProperty({ glowPower: .19, taperPower: .45, color: Cesium.Color.MAGENTA.withAlpha(.6) }), arcType: Cesium.ArcType.NONE } });
  const ground = viewer.entities.add({ id: 'GPM-GROUND-TRACK', name: 'GPM ground track', polyline: { positions: [], width: 2.2, material: new Cesium.PolylineGlowMaterialProperty({ glowPower: .15, taperPower: .5, color: Cesium.Color.fromCssColorString('#ff8ccf').withAlpha(.38) }), clampToGround: true, arcType: Cesium.ArcType.GEODESIC } });
  const swath = viewer.entities.add({ id: 'GPM-SWATH', name: 'GPM precipitation observation corridor', polygon: { hierarchy: new Cesium.CallbackProperty(() => new Cesium.PolygonHierarchy(buildSwath()), false), material: new Cesium.ColorMaterialProperty(new Cesium.Color(1,.15,.72,.10)), outline: true, outlineColor: Cesium.Color.MAGENTA.withAlpha(.34), heightReference: Cesium.HeightReference.CLAMP_TO_GROUND } });

  function parseTLE(text){
    const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    for(let i=0;i<lines.length-1;i++){
      if(/^0\s*GPM/i.test(lines[i]) && /^1\s+39574\s/.test(lines[i+1]) && /^2\s+39574\s/.test(lines[i+2]||'')) return [lines[i+1],lines[i+2]];
      if(/^1\s+39574\s/.test(lines[i]) && /^2\s+39574\s/.test(lines[i+1])) return [lines[i],lines[i+1]];
    }
    throw new Error('GPM TLE not found');
  }
  function propagateAt(date){
    if(!satrec) return null;
    const pv=satellite.propagate(satrec,date);
    if(!pv?.position) return null;
    const geo=satellite.eciToGeodetic(pv.position,satellite.gstime(date));
    return { lat:satellite.degreesLat(geo.latitude), lon:satellite.degreesLong(geo.longitude), alt:Math.max(geo.height,0), velocity:pv.velocity?Math.hypot(pv.velocity.x,pv.velocity.y,pv.velocity.z)*3600:0 };
  }
  function buildSwath(){
    const now=new Date(), pts=[];
    for(let m=-18;m<=18;m+=1){
      const a=propagateAt(new Date(now.getTime()+m*60000)); if(!a) continue;
      const width=4.0;
      pts.push(Cesium.Cartesian3.fromDegrees(a.lon-width,a.lat,0));
    }
    for(let m=18;m>=-18;m-=1){
      const a=propagateAt(new Date(now.getTime()+m*60000)); if(!a) continue;
      const width=4.0;
      pts.push(Cesium.Cartesian3.fromDegrees(a.lon+width,a.lat,0));
    }
    return pts;
  }
  function updateOrbit(date){
    if(!satrec) return;
    const op=[],gp=[];
    for(let m=-45;m<=45;m++){
      const a=propagateAt(new Date(date.getTime()+m*60000)); if(!a) continue;
      op.push(Cesium.Cartesian3.fromDegrees(a.lon,a.lat,a.alt*1000+18000));
      gp.push(Cesium.Cartesian3.fromDegrees(a.lon,a.lat,0));
    }
    orbit.polyline.positions=op; ground.polyline.positions=gp;
  }
  async function loadTLE(){
    try{
      const r=await fetch(TLE_FILE,{cache:'no-store'}); if(!r.ok) throw Error('HTTP '+r.status);
      const [l1,l2]=parseTLE(await r.text()); satrec=satellite.twoline2satrec(l1,l2);
      panel.querySelector('#gpmState').textContent='READY'; setStatus('GPM CORE · ORBITAL TRACK READY');
      tick(); updateOrbit(new Date());
    }catch(e){panel.querySelector('#gpmState').textContent='TLE OFFLINE'; console.warn('GPM TLE unavailable',e);}
  }
  function tick(){
    const a=propagateAt(new Date()); if(!a) return;
    const p=Cesium.Cartesian3.fromDegrees(a.lon,a.lat,a.alt*1000); entity.position=p;
    panel.querySelector('#gpmAlt').textContent=a.alt.toFixed(1)+' KM';
    panel.querySelector('#gpmVel').textContent=Math.round(a.velocity).toLocaleString()+' KM/H';
    panel.querySelector('#gpmLat').textContent=a.lat.toFixed(2)+'°';
    panel.querySelector('#gpmLon').textContent=a.lon.toFixed(2)+'°';
    panel.querySelector('#gpmUpdated').textContent=new Date().toISOString().slice(11,19)+' UTC';
    if(Date.now()-lastPath>30000){lastPath=Date.now();updateOrbit(new Date());}
    if(active) setCamera(a);
  }
  function setCamera(a){
    const target=Cesium.Cartesian3.fromDegrees(a.lon,a.lat,0);
    const heading=Cesium.Math.toRadians(18)+passPhase*.01;
    const pitch=Cesium.Math.toRadians(-38+Math.sin(passPhase*.45)*7);
    const range=2600000+Math.sin(passPhase*.27)*500000;
    viewer.camera.lookAt(target,new Cesium.HeadingPitchRange(heading,pitch,range));
  }
  async function createPrecipitation(){
    const date=new Date();
    date.setUTCMinutes(Math.floor(date.getUTCMinutes()/30)*30,0,0);
    const d=date.toISOString().slice(0,16).replace('T','T');
    const params=new URLSearchParams({service:'WMS',version:'1.1.1',request:'GetMap',layers:'IMERG_Precipitation_Rate',styles:'',srs:'EPSG:4326',bbox:'-180,-90,180,90',width:'2048',height:'1024',format:'image/png',transparent:'true',time:d});
    const provider=await Cesium.SingleTileImageryProvider.fromUrl(`${PRECIP_WMS}?${params.toString()}`,{rectangle:WORLD,credit:'NASA GIBS · IMERG'});
    return new Cesium.ImageryLayer(provider,{alpha:.72,show:true});
  }
  async function focus(){
    if(active) return;
    previous={destination:viewer.camera.positionWC.clone(),direction:viewer.camera.directionWC.clone(),up:viewer.camera.upWC.clone()};
    active=true; passPhase=0; const btn=panel.querySelector('#gpmFocus');btn.classList.add('on');btn.textContent='GPM MODE ACTIVE';
    try{
      if(!precipitationLayer) precipitationLayer=await createPrecipitation();
      viewer.imageryLayers.add(precipitationLayer,0);
      setStatus('GPM CORE · IMERG PRECIPITATION · LIVE ORBIT MODE');
      if(satrec) setCamera(propagateAt(new Date()));
    }catch(e){console.warn('GPM precipitation layer unavailable',e);setStatus('GPM CORE · PRECIPITATION LAYER UNAVAILABLE');}
  }
  function exit(){
    active=false; passPhase=0; const btn=panel.querySelector('#gpmFocus');btn.classList.remove('on');btn.textContent='FOCUS GPM + PRECIPITATION';
    if(precipitationLayer){viewer.imageryLayers.remove(precipitationLayer,false);}
    if(previous){viewer.camera.setView({destination:previous.destination,orientation:{direction:previous.direction,up:previous.up}});}
    setStatus('');
  }
  panel.querySelector('#gpmFocus').addEventListener('click',()=>active?exit():focus());
  loadTLE();
  setInterval(loadTLE,30*60*1000); setInterval(()=>{if(active) passPhase+=.012; tick();},1000);
  window.GPMMode={focus,exit,get active(){return active}};
})();
