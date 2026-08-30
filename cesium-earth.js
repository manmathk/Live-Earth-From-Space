/* CesiumJS cinematic Earth + ISS orbit layer. */
(async () => {
  const Cesium = window.Cesium;
  if (!Cesium) { console.error('CesiumJS failed to load.'); return; }
  const viewer = new Cesium.Viewer('earth3d', {
    baseLayer: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    animation:false,timeline:false,baseLayerPicker:false,geocoder:false,homeButton:false,
    sceneModePicker:false,navigationHelpButton:false,fullscreenButton:false,infoBox:false,
    selectionIndicator:false,vrButton:false,shouldAnimate:true,
    creditContainer: document.createElement('div')
  });
  const scene=viewer.scene;
  scene.scene3DOnly=true;
  scene.backgroundColor=Cesium.Color.BLACK;
  scene.globe.enableLighting=true;
  scene.globe.dynamicAtmosphereLighting=true;
  scene.globe.dynamicAtmosphereLightingFromSun=true;
  scene.globe.showGroundAtmosphere=true;
  scene.globe.atmosphereLightIntensity=7.5;
  scene.globe.lambertDiffuseMultiplier=1.10;
  scene.globe.nightFadeOutDistance=0.55*Math.PI*Cesium.Ellipsoid.WGS84.minimumRadius;
  scene.globe.nightFadeInDistance=2.5*Math.PI*Cesium.Ellipsoid.WGS84.minimumRadius;
  scene.skyAtmosphere=new Cesium.SkyAtmosphere();
  scene.skyAtmosphere.show=true;
  scene.skyAtmosphere.atmosphereLightIntensity=30.0;
  scene.skyAtmosphere.mieCoefficient=19e-6;
  scene.skyAtmosphere.mieAnisotropy=0.78;
  scene.fog.enabled=false;
  scene.highDynamicRange=true;

  (async()=>{try{
    const provider=await Cesium.ArcGisMapServerImageryProvider.fromUrl(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
      {enablePickFeatures:false}
    );
    const layer=new Cesium.ImageryLayer(provider);
    layer.brightness=1.04;
    layer.contrast=1.08;
    layer.saturation=1.12;
    scene.globe.imageryLayers.add(layer,0);
  }catch(e){console.warn('Fallback imagery unavailable.',e)}})();

  const iss=viewer.entities.add({
    id:'ISS-25544', name:'International Space Station · ZARYA',
    position:Cesium.Cartesian3.fromDegrees(0,0,420000),
    point:{pixelSize:10,color:Cesium.Color.CYAN,outlineColor:Cesium.Color.WHITE,outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY,scaleByDistance:new Cesium.NearFarScalar(4e6,1.35,3e7,.78)},
    label:{text:'ISS',font:'700 12px monospace',fillColor:Cesium.Color.CYAN,outlineColor:Cesium.Color.BLACK,outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,verticalOrigin:Cesium.VerticalOrigin.BOTTOM,pixelOffset:new Cesium.Cartesian2(0,-15),disableDepthTestDistance:Number.POSITIVE_INFINITY,showBackground:true,backgroundColor:new Cesium.Color(.02,.06,.09,.72),backgroundPadding:new Cesium.Cartesian2(6,4)}
  });
  const halo=viewer.entities.add({id:'ISS-25544-HALO',position:iss.position,ellipse:{semiMajorAxis:38000,semiMinorAxis:38000,material:new Cesium.ColorMaterialProperty(new Cesium.Color(.35,.92,1,.08)),outline:true,outlineColor:Cesium.Color.CYAN.withAlpha(.48),outlineWidth:1,height:420000}});
  const orbitEntity=viewer.entities.add({id:'ISS-ORBIT-PATH',name:'ISS ±55 minute orbit path',polyline:{positions:[],width:2.2,material:new Cesium.PolylineGlowMaterialProperty({glowPower:.2,taperPower:.4,color:Cesium.Color.CYAN.withAlpha(.52)}),clampToGround:false,arcType:Cesium.ArcType.NONE}});
  const groundTrack=viewer.entities.add({id:'ISS-GROUND-TRACK',name:'ISS ground track',polyline:{positions:[],width:1.6,material:Cesium.Color.CYAN.withAlpha(.26),clampToGround:true,arcType:Cesium.ArcType.GEODESIC}});

  let autoOrbit=true,followISS=false,heading=5.08,phase=0,lastManual=0,issLat=0,issLon=0,issAlt=420;
  const stop=()=>{lastManual=performance.now();autoOrbit=false;document.getElementById('auto')?.classList.remove('on')};
  viewer.screenSpaceEventHandler.setInputAction(stop,Cesium.ScreenSpaceEventType.LEFT_DOWN);
  viewer.screenSpaceEventHandler.setInputAction(stop,Cesium.ScreenSpaceEventType.WHEEL);
  viewer.screenSpaceEventHandler.setInputAction(stop,Cesium.ScreenSpaceEventType.PINCH_START);
  window.toggleEarthAuto=()=>{autoOrbit=!autoOrbit;if(autoOrbit)followISS=false;return autoOrbit};
  window.toggleEarthFollow=()=>{followISS=!followISS;if(followISS)autoOrbit=false;else viewer.camera.lookAt(Cesium.Cartesian3.ZERO,new Cesium.HeadingPitchRange(heading,-.18,9800000));return followISS};
  window.resetEarth=()=>{autoOrbit=true;followISS=false;heading=5.08;phase=0;viewer.camera.lookAt(Cesium.Cartesian3.ZERO,new Cesium.HeadingPitchRange(heading,-.18,9800000));document.getElementById('auto')?.classList.add('on');document.getElementById('follow')?.classList.remove('on')};
  window.updateISS3D=(lat,lon,altKm)=>{
    issLat=lat;issLon=lon;issAlt=altKm;
    const p=Cesium.Cartesian3.fromDegrees(lon,lat,Math.max(altKm||0,0)*1000);
    iss.position=p;halo.position=p;
    if(followISS)viewer.camera.lookAt(p,new Cesium.HeadingPitchRange(Cesium.Math.toRadians(12),-.08,Math.max(950000,Math.min(1700000,(altKm||420)*2500))));
  };
  window.updateOrbitPath=(sat,date)=>{
    if(!sat||!window.satellite)return;
    const op=[],gp=[];
    for(let m=-55;m<=55;m++){
      const t=new Date(date.getTime()+m*60000),pv=window.satellite.propagate(sat,t);
      if(!pv?.position)continue;
      const geo=window.satellite.eciToGeodetic(pv.position,window.satellite.gstime(t));
      const lat=window.satellite.degreesLat(geo.latitude),lon=window.satellite.degreesLong(geo.longitude),alt=Math.max(geo.height,0)*1000;
      op.push(Cesium.Cartesian3.fromDegrees(lon,lat,alt+18000));
      gp.push(Cesium.Cartesian3.fromDegrees(lon,lat,0));
    }
    orbitEntity.polyline.positions=op;
    groundTrack.polyline.positions=gp;
  };

  viewer.camera.lookAt(Cesium.Cartesian3.ZERO,new Cesium.HeadingPitchRange(heading,-.18,9800000));
  scene.postRender.addEventListener(()=>{
    const now=performance.now();
    if(!autoOrbit||followISS||now-lastManual<=250)return;
    phase+=0.00042;
    heading+=0.000020;
    const cycle=(phase%(Math.PI*2));
    const pitch=-0.18 + Math.sin(cycle*0.5)*0.045 + Math.sin(cycle*0.17)*0.018;
    const range=9800000 + Math.sin(cycle*0.31)*650000 + Math.sin(cycle*0.77)*190000;
    viewer.camera.lookAt(Cesium.Cartesian3.ZERO,new Cesium.HeadingPitchRange(heading,pitch,range));
  });

  window.CesiumEarthViewer=viewer;
})();
