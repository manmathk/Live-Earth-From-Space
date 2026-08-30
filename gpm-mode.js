/* GPM Core Observatory mode: real orbital propagation + NASA GIBS IMERG precipitation overlay. */
(() => {
  const Cesium = window.Cesium;
  const viewer = window.CesiumEarthViewer;
  const satellite = window.satellite;
  if (!Cesium || !viewer || !satellite) return;

  const FILE='data/missions.tle';
  const PRECIP_WMS='https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
  const WORLD=Cesium.Rectangle.fromDegrees(-180,-90,180,90);
  let satrec=null, precipLayer=null, focusActive=false, lastPrecipDate='';

  const status=document.createElement('div');
  status.style.cssText='position:fixed;left:50%;bottom:118px;transform:translateX(-50%);z-index:40;padding:7px 11px;border:1px solid rgba(255,79,216,.30);border-radius:4px;background:rgba(14,5,15,.88);color:#ff9ce9;font:700 7px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em;display:none;backdrop-filter:blur(10px);pointer-events:none;';
  document.body.appendChild(status);
  const setStatus=text=>{status.textContent=text;status.style.display=text?'block':'none';};

  const gpm=viewer.entities.add({id:'GPM-39574',name:'GPM Core Observatory · 39574',position:Cesium.Cartesian3.fromDegrees(0,0,440000),point:{pixelSize:11,color:Cesium.Color.fromCssColorString('#ff4fd8'),outlineColor:Cesium.Color.WHITE,outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY},label:{text:'GPM · 39574',font:'900 10px monospace',fillColor:Cesium.Color.fromCssColorString('#ff8fe4'),outlineColor:Cesium.Color.BLACK,outlineWidth:3,verticalOrigin:Cesium.VerticalOrigin.BOTTOM,pixelOffset:new Cesium.Cartesian2(0,-15),disableDepthTestDistance:Number.POSITIVE_INFINITY,showBackground:true,backgroundColor:new Cesium.Color(.07,.01,.07,.86),backgroundPadding:new Cesium.Cartesian2(5,3)}});
  const orbit=viewer.entities.add({id:'GPM-ORBIT-CINEMATIC',polyline:{positions:[],width:2.3,material:new Cesium.PolylineGlowMaterialProperty({glowPower:.2,taperPower:.45,color:Cesium.Color.fromCssColorString('#ff4fd8').withAlpha(.68)}),arcType:Cesium.ArcType.NONE}});
  const ground=viewer.entities.add({id:'GPM-GROUND-TRACK-CINEMATIC',polyline:{positions:[],width:1.7,material:new Cesium.PolylineGlowMaterialProperty({glowPower:.16,taperPower:.5,color:Cesium.Color.fromCssColorString('#ff9ae9').withAlpha(.42)}),clampToGround:true,arcType:Cesium.ArcType.GEODESIC}});
  const swath=viewer.entities.add({id:'GPM-OBSERVATION-SWATH',corridor:{positions:[],width:360000,material:new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString('#ff4fd8').withAlpha(.095)),outline:true,outlineColor:Cesium.Color.fromCssColorString('#ff4fd8').withAlpha(.46),height:100}});

  function parseTLE(text){const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);for(let i=0;i<lines.length-2;i++){if(/GPM/i.test(lines[i])&&/^1\s+39574\s/.test(lines[i+1])&&/^2\s+39574\s/.test(lines[i+2]))return[lines[i+1],lines[i+2]];if(/^1\s+39574\s/.test(lines[i])&&/^2\s+39574\s/.test(lines[i+1]))return[lines[i],lines[i+1]]}throw Error('GPM TLE not found')}
  function prop(date){if(!satrec)return null;const pv=satellite.propagate(satrec,date);if(!pv?.position)return null;const geo=satellite.eciToGeodetic(pv.position,satellite.gstime(date));return{lat:satellite.degreesLat(geo.latitude),lon:satellite.degreesLong(geo.longitude),alt:Math.max(geo.height,0),speed:pv.velocity?Math.hypot(pv.velocity.x,pv.velocity.y,pv.velocity.z)*3600:0}}
  function refreshPaths(date){const pts=[],gps=[];for(let m=-48;m<=48;m++){const a=prop(new Date(date.getTime()+m*60000));if(!a)continue;pts.push(Cesium.Cartesian3.fromDegrees(a.lon,a.lat,a.alt*1000+16000));gps.push(Cesium.Cartesian3.fromDegrees(a.lon,a.lat,0))}orbit.polyline.positions=pts;ground.polyline.positions=gps;swath.corridor.positions=gps}
  async function load(){try{const r=await fetch(FILE,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const [l1,l2]=parseTLE(await r.text());satrec=satellite.twoline2satrec(l1,l2);refreshPaths(new Date());tick()}catch(e){console.warn('GPM orbital cache unavailable',e);setStatus('GPM · ORBIT DATA UNAVAILABLE')}}
  async function precipitation(){const d=new Date();d.setUTCMinutes(Math.floor(d.getUTCMinutes()/30)*30,0,0);const date=d.toISOString().slice(0,16);if(date===lastPrecipDate&&precipLayer)return;const params=new URLSearchParams({service:'WMS',version:'1.1.1',request:'GetMap',layers:'IMERG_Precipitation_Rate',styles:'',srs:'EPSG:4326',bbox:'-180,-90,180,90',width:'2048',height:'1024',format:'image/png',transparent:'true',time:date});const provider=await Cesium.SingleTileImageryProvider.fromUrl(`${PRECIP_WMS}?${params.toString()}`,{rectangle:WORLD,credit:'NASA GIBS · IMERG'});const layer=new Cesium.ImageryLayer(provider,{alpha:.72,show:true});if(precipLayer)viewer.imageryLayers.remove(precipLayer,true);precipLayer=viewer.imageryLayers.add(layer,0);lastPrecipDate=date}
  function tick(){const a=prop(new Date());if(!a)return;gpm.position=Cesium.Cartesian3.fromDegrees(a.lon,a.lat,a.alt*1000);window.GPMTelemetry={altitudeKm:a.alt,speedKmh:a.speed,latitude:a.lat,longitude:a.lon};const label=document.querySelector('[data-key="GPM"] .mission-state');if(label)label.textContent='GPM TRACKING';if(focusActive)viewer.camera.lookAt(Cesium.Cartesian3.fromDegrees(a.lon,a.lat,0),new Cesium.HeadingPitchRange(Cesium.Math.toRadians(18),Cesium.Math.toRadians(-46),2600000))}
  async function focus(){focusActive=!focusActive;const btn=document.getElementById('gpmFocus');if(focusActive){setStatus('GPM CORE · IMERG PRECIPITATION · ORBITAL CAMERA');try{await precipitation()}catch(e){console.warn('GPM precipitation unavailable',e);setStatus('GPM CORE · ORBIT LIVE · PRECIPITATION UNAVAILABLE')}const a=prop(new Date());if(a)viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(a.lon,a.lat,a.alt*1000+2600000),orientation:{heading:Cesium.Math.toRadians(18),pitch:Cesium.Math.toRadians(-46),roll:0},duration:2.5});if(btn){btn.classList.add('on');btn.textContent='EXIT GPM MODE'}}else{if(precipLayer){viewer.imageryLayers.remove(precipLayer,true);precipLayer=null;lastPrecipDate=''}setStatus('');if(btn){btn.classList.remove('on');btn.textContent='FOCUS GPM + PRECIPITATION'}}}
  window.GPMMode={focus,load,tick,get active(){return focusActive}};
  window.addEventListener('gpm-focus',()=>{if(!focusActive)focus()});
  load();setInterval(tick,1000);setInterval(()=>{if(focusActive)precipitation().catch(()=>{})},5*60*1000);
})();
