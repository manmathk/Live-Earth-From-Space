/* Cesium cinematic broadcast layer + optional Gaussian Splat Multiple-LOD showcase. */
(() => {
  const Cesium = window.Cesium;
  const viewer = window.CesiumEarthViewer;
  if (!Cesium || !viewer) return;

  const style = document.createElement('style');
  style.textContent = `
    .cinematic-vignette{position:fixed;inset:0;z-index:5;pointer-events:none;background:radial-gradient(ellipse at 50% 44%,transparent 32%,rgba(0,0,0,.12) 58%,rgba(0,0,0,.76) 100%),linear-gradient(180deg,rgba(0,0,0,.2),transparent 18%,transparent 72%,rgba(0,0,0,.68));}
    .cinematic-scan{position:fixed;inset:0;z-index:6;pointer-events:none;opacity:.035;background:repeating-linear-gradient(180deg,transparent 0 4px,rgba(255,255,255,.42) 5px,transparent 6px);mix-blend-mode:screen;}
    .cinematic-topline{position:fixed;left:50%;top:76px;transform:translateX(-50%);z-index:20;color:#d7e2e8a8;font:700 8px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.22em;white-space:nowrap;text-shadow:0 2px 18px #000;text-transform:uppercase;pointer-events:none}.cinematic-topline b{color:#72ecff}
    .cinematic-reticle{position:fixed;left:50%;top:45%;width:128px;height:128px;transform:translate(-50%,-50%);z-index:12;border:1px solid rgba(111,231,255,.1);border-radius:50%;box-shadow:0 0 75px rgba(90,215,255,.07);pointer-events:none}.cinematic-reticle:before,.cinematic-reticle:after{content:"";position:absolute;left:50%;top:50%;background:rgba(111,231,255,.18);transform:translate(-50%,-50%)}.cinematic-reticle:before{width:160px;height:1px}.cinematic-reticle:after{width:1px;height:160px}
    .cinematic-live{position:fixed;right:24px;top:22px;z-index:22;display:flex;align-items:center;gap:7px;padding:8px 12px;border-radius:3px;background:rgba(239,71,95,.9);color:#fff;font:900 10px Inter,system-ui,sans-serif;box-shadow:0 8px 25px #0009;pointer-events:none}.cinematic-live i{width:7px;height:7px;border-radius:50%;background:#fff;animation:cLive 1.2s infinite}@keyframes cLive{50%{opacity:.25}}
    .cinematic-corner{position:fixed;z-index:20;color:#d2dce1a8;font:700 7px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.13em;pointer-events:none;text-shadow:0 2px 12px #000}.cinematic-corner.tr{right:25px;top:76px;text-align:right}.cinematic-corner.bl{left:25px;bottom:132px}.cinematic-corner.br{right:25px;bottom:132px;text-align:right}
    .cinematic-bottom{position:fixed;left:0;right:0;bottom:0;z-index:18;height:120px;padding:11px 18px;display:grid;grid-template-columns:235px 1fr 270px;gap:10px;background:linear-gradient(180deg,rgba(2,7,11,.02),rgba(2,7,11,.88) 30%,rgba(2,7,11,.98));border-top:1px solid rgba(255,255,255,.11);backdrop-filter:blur(7px);pointer-events:none}.cinematic-bottom .cb{border:1px solid rgba(255,255,255,.09);border-radius:6px;background:rgba(5,13,19,.72);box-shadow:0 10px 35px #0007;padding:10px 13px}.cb .cap{font:700 7px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;color:#81909a;text-transform:uppercase}.cb .hero{font:850 18px Inter,system-ui,sans-serif;margin-top:4px}.cb .heroC{color:#72eaff}.cb .grid{display:grid;grid-template-columns:repeat(4,1fr);height:100%;align-items:center}.cb .item{padding:0 13px;border-left:1px solid rgba(255,255,255,.08)}.cb .item:first-child{border-left:0}.cb .val{font:800 21px ui-monospace,SFMono-Regular,Menlo,monospace;margin-top:5px}.cb .tiny{font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;color:#d3dde2}.cb.rightgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cb.badge{display:flex;flex-direction:column;justify-content:center}.cb.badge .val{font-size:13px}.cb.badge.liveb .val{color:#5ef0a6}
    @media(max-width:900px){.cinematic-bottom{height:104px;grid-template-columns:185px 1fr;padding:8px 10px}.cinematic-bottom .rightgrid{display:none}.cinematic-reticle{width:95px;height:95px}.cinematic-reticle:before{width:120px}.cinematic-reticle:after{height:120px}.cinematic-topline{top:61px;font-size:6px}.cinematic-live{top:14px;right:12px}.cinematic-corner{display:none}}
    @media(max-width:560px){.cinematic-bottom{grid-template-columns:1fr;height:88px}.cinematic-bottom .main{display:none}.cinematic-bottom .cb .grid{grid-template-columns:repeat(3,1fr)}.cinematic-bottom .item:nth-child(4){display:none}}
  `;
  document.head.appendChild(style);
  const add=(cls,html='')=>{const e=document.createElement('div');e.className=cls;e.innerHTML=html;document.body.appendChild(e);return e;};
  add('cinematic-vignette');
  add('cinematic-scan');
  add('cinematic-reticle');
  add('cinematic-live','<i></i> LIVE EARTH');
  add('cinematic-topline','<b>●</b> ORBITAL EARTH CAMERA · DYNAMIC LIGHTING · ISS 25544');
  add('cinematic-corner tr','UTC <span id="cinematicClock">--:--:--</span><br>CAMERA <span id="cameraMode">AUTO ORBIT</span>');
  add('cinematic-corner bl','EARTH OBSERVATORY / PUBLIC SPACE VIEW');
  add('cinematic-corner br','CESIUMJS / WGS84 / REAL-TIME SGP4');
  add('cinematic-bottom',`<div class="cb main"><div class="cap">CURRENT VIEW</div><div class="hero heroC">EARTH FROM SPACE</div><div class="cap" style="margin-top:7px">LIVE ORBITAL OBSERVATION</div></div><div class="cb"><div class="grid"><div class="item"><div class="cap">ALTITUDE</div><div class="val heroC" id="cAlt">—</div></div><div class="item"><div class="cap">SPEED</div><div class="val" id="cVel">—</div></div><div class="item"><div class="cap">LATITUDE</div><div class="val tiny" id="cLat">—</div></div><div class="item"><div class="cap">LONGITUDE</div><div class="val tiny" id="cLon">—</div></div></div></div><div class="cb rightgrid"><div class="cb badge liveb"><div class="cap">TRACK</div><div class="val">● LIVE</div></div><div class="cb badge"><div class="cap">ISS ORBIT</div><div class="val">92.9 MIN</div></div></div>`);

  const sync=()=>{const get=id=>document.getElementById(id);const copy=(a,b)=>{const x=get(a),y=get(b);if(x&&y&&x.textContent.trim()!=='—')y.textContent=x.textContent;};copy('alt','cAlt');copy('vel','cVel');copy('lat','cLat');copy('lon','cLon');const d=get('cinematicClock');if(d)d.textContent=new Date().toISOString().slice(11,19);const m=get('cameraMode');if(m)m.textContent=document.getElementById('follow')?.classList.contains('on')?'ISS FOLLOW':document.getElementById('auto')?.classList.contains('on')?'AUTO ORBIT':'MANUAL';};
  setInterval(sync,500);sync();

  try{
    const scene=viewer.scene;
    scene.globe.showGroundAtmosphere=true;
    scene.globe.enableLighting=true;
    scene.globe.dynamicAtmosphereLighting=true;
    scene.globe.dynamicAtmosphereLightingFromSun=true;
    scene.globe.atmosphereLightIntensity=5.8;
    if(scene.skyAtmosphere){scene.skyAtmosphere.show=true;scene.skyAtmosphere.atmosphereLightIntensity=18.5;scene.skyAtmosphere.mieCoefficient=15e-6;scene.skyAtmosphere.mieAnisotropy=.74;}
    scene.highDynamicRange=true;
  }catch(error){console.warn('Cinematic atmosphere tuning skipped',error);}

  const ASSET_ID=4547222;let tileset=null,active=false,previousView=null;
  const button=document.createElement('button');button.id='gaussianLod';button.type='button';button.textContent='GAUSSIAN LOD';
  Object.assign(button.style,{position:'fixed',right:'18px',bottom:'135px',zIndex:'31',padding:'8px 10px',border:'1px solid rgba(255,255,255,.12)',borderRadius:'4px',background:'#071019e8',color:'#c7d1d8',font:'9px ui-monospace,SFMono-Regular,Menlo,monospace',letterSpacing:'.08em',cursor:'pointer',backdropFilter:'blur(10px)'});document.body.appendChild(button);
  const status=document.createElement('div');status.id='gaussianStatus';Object.assign(status.style,{position:'fixed',left:'18px',bottom:'135px',zIndex:'31',padding:'7px 10px',border:'1px solid rgba(255,255,255,.1)',borderRadius:'4px',background:'rgba(5,12,18,.78)',color:'#9eabb4',font:'8px ui-monospace,SFMono-Regular,Menlo,monospace',letterSpacing:'.08em',display:'none',backdropFilter:'blur(10px)'});document.body.appendChild(status);
  const setStatus=text=>{status.textContent=text;status.style.display=text?'block':'none';};
  async function enter(){if(active)return;active=true;previousView={destination:viewer.camera.positionWC.clone(),direction:viewer.camera.directionWC.clone(),up:viewer.camera.upWC.clone()};button.textContent='LOADING SPLATS…';button.disabled=true;setStatus('GAUSSIAN SPLATS · STREAMING MULTIPLE LODS');try{if(!tileset){tileset=await Cesium.Cesium3DTileset.fromIonAssetId(ASSET_ID);tileset.maximumScreenSpaceError=8;viewer.scene.primitives.add(tileset);}await viewer.zoomTo(tileset,new Cesium.HeadingPitchRange(Cesium.Math.toRadians(100),Cesium.Math.toRadians(-25),220));setStatus('GAUSSIAN SPLATS · LOD STREAMING · PUBLIC DEMO');button.textContent='EXIT SPLAT';}catch(error){console.error('Gaussian splat tileset failed',error);setStatus('GAUSSIAN SPLATS · LOAD FAILED');active=false;button.textContent='GAUSSIAN LOD';}finally{button.disabled=false;}}
  function exit(){active=false;if(previousView)viewer.camera.setView({destination:previousView.destination,orientation:{direction:previousView.direction,up:previousView.up}});button.textContent='GAUSSIAN LOD';setStatus('');}
  button.addEventListener('click',()=>active?exit():enter());
  window.GaussianSplatsLOD={enter,exit,get tileset(){return tileset;}};
})();
