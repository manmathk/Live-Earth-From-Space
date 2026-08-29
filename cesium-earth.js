/* CesiumJS globe + ISS orbit layer + on-demand Gaussian splat LOD showcase. */
(() => {
  const Cesium = window.Cesium;
  if (!Cesium) { console.error('CesiumJS failed to load.'); return; }

  const viewer = new Cesium.Viewer('earth3d', {
    baseLayer: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    animation: false, timeline: false, baseLayerPicker: false,
    geocoder: false, homeButton: false, sceneModePicker: false,
    navigationHelpButton: false, fullscreenButton: false,
    infoBox: false, selectionIndicator: false, vrButton: false,
    shouldAnimate: true, skyBox: undefined,
    creditContainer: document.createElement('div')
  });

  const scene = viewer.scene;
  scene.scene3DOnly = true;
  scene.backgroundColor = Cesium.Color.BLACK;
  scene.globe.enableLighting = true;
  scene.globe.dynamicAtmosphereLighting = true;
  scene.globe.dynamicAtmosphereLightingFromSun = true;
  scene.globe.showGroundAtmosphere = true;
  scene.globe.atmosphereLightIntensity = 5.5;
  scene.globe.lambertDiffuseMultiplier = 1.0;
  scene.globe.nightFadeOutDistance = 0.7 * Math.PI * Cesium.Ellipsoid.WGS84.minimumRadius;
  scene.globe.nightFadeInDistance = 2.6 * Math.PI * Cesium.Ellipsoid.WGS84.minimumRadius;
  scene.skyAtmosphere = new Cesium.SkyAtmosphere();
  scene.skyAtmosphere.show = true;
  scene.skyAtmosphere.atmosphereLightIntensity = 20.0;
  scene.skyAtmosphere.mieCoefficient = 18e-6;
  scene.skyAtmosphere.mieAnisotropy = 0.72;
  scene.fog.enabled = false;
  scene.highDynamicRange = true;

  // Use Cesium ion imagery instead of Cesium CDN Natural Earth tiles.
  // Asset 2 is Bing Maps Aerial in Cesium's default asset set.
  if (Cesium.IonImageryProvider?.fromAssetId && Cesium.ImageryLayer?.fromProviderAsync) {
    Cesium.ImageryLayer.fromProviderAsync(Cesium.IonImageryProvider.fromAssetId(2))
      .then(layer => scene.globe.imageryLayers.add(layer))
      .catch(error => console.warn('Ion imagery unavailable; continuing with globe only.', error));
  }

  const iss = viewer.entities.add({
    id: 'ISS-25544', name: 'International Space Station · ZARYA',
    position: Cesium.Cartesian3.fromDegrees(0, 0, 420000),
    point: {
      pixelSize: 9, color: Cesium.Color.CYAN,
      outlineColor: Cesium.Color.WHITE, outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(4e6, 1.25, 3e7, .72)
    },
    label: {
      text: 'ISS', font: '700 12px monospace', fillColor: Cesium.Color.CYAN,
      outlineColor: Cesium.Color.BLACK, outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -15),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      showBackground: true,
      backgroundColor: new Cesium.Color(.02,.06,.09,.72),
      backgroundPadding: new Cesium.Cartesian2(6,4)
    }
  });

  const halo = viewer.entities.add({
    id: 'ISS-25544-HALO', position: iss.position,
    ellipse: {
      semiMajorAxis: 42000, semiMinorAxis: 42000,
      material: new Cesium.ColorMaterialProperty(new Cesium.Color(.35,.92,1,.10)),
      outline: true, outlineColor: Cesium.Color.CYAN.withAlpha(.5), outlineWidth: 1,
      height: 420000, classificationType: Cesium.ClassificationType.NONE
    }
  });

  const orbitEntity = viewer.entities.add({
    id: 'ISS-ORBIT-PATH', name: 'ISS ±50 minute orbit path',
    polyline: {
      positions: [], width: 2,
      material: new Cesium.PolylineGlowMaterialProperty({glowPower:.16,taperPower:.35,color:Cesium.Color.CYAN.withAlpha(.55)}),
      clampToGround: false, arcType: Cesium.ArcType.NONE
    }
  });

  const groundTrack = viewer.entities.add({
    id: 'ISS-GROUND-TRACK', name: 'ISS ground track',
    polyline: {positions: [], width: 1.5, material: Cesium.Color.CYAN.withAlpha(.22), clampToGround: true}
  });

  let autoOrbit = true, followISS = false, heading = 5.1, lastManual = 0;
  const stopAutoOnInteraction = () => { lastManual=performance.now(); autoOrbit=false; document.getElementById('auto')?.classList.remove('on'); };
  viewer.screenSpaceEventHandler.setInputAction(stopAutoOnInteraction, Cesium.ScreenSpaceEventType.LEFT_DOWN);
  viewer.screenSpaceEventHandler.setInputAction(stopAutoOnInteraction, Cesium.ScreenSpaceEventType.WHEEL);
  viewer.screenSpaceEventHandler.setInputAction(stopAutoOnInteraction, Cesium.ScreenSpaceEventType.PINCH_START);

  window.toggleEarthAuto=()=>{autoOrbit=!autoOrbit;if(autoOrbit)followISS=false;return autoOrbit};
  window.toggleEarthFollow=()=>{followISS=!followISS;if(followISS)autoOrbit=false;else viewer.camera.lookAt(Cesium.Cartesian3.ZERO,new Cesium.HeadingPitchRange(heading,-.22,14500000));return followISS};
  window.resetEarth=()=>{autoOrbit=true;followISS=false;heading=5.1;viewer.camera.lookAt(Cesium.Cartesian3.ZERO,new Cesium.HeadingPitchRange(heading,-.22,14500000));document.getElementById('auto')?.classList.add('on');document.getElementById('follow')?.classList.remove('on')};

  window.updateISS3D=(lat,lon,altKm)=>{
    const p=Cesium.Cartesian3.fromDegrees(lon,lat,Math.max(altKm||0,0)*1000);
    iss.position=p; halo.position=p;
    if(followISS) viewer.camera.lookAt(p,new Cesium.HeadingPitchRange(0,-.12,1450000));
  };
  window.updateOrbitPath=(sat,date)=>{
    if(!sat||!window.satellite)return;
    const orbitPts=[],trackPts=[];
    for(let min=-50;min<=50;min++){
      const t=new Date(date.getTime()+min*60000),pv=window.satellite.propagate(sat,t);
      if(!pv||!pv.position)continue;
      const geo=window.satellite.eciToGeodetic(pv.position,window.satellite.gstime(t));
      const lat=window.satellite.degreesLat(geo.latitude),lon=window.satellite.degreesLong(geo.longitude),alt=Math.max(geo.height,0)*1000;
      orbitPts.push(Cesium.Cartesian3.fromDegrees(lon,lat,alt+18000));
      trackPts.push(Cesium.Cartesian3.fromDegrees(lon,lat,0));
    }
    orbitEntity.polyline.positions=orbitPts;groundTrack.polyline.positions=trackPts;
  };

  viewer.camera.lookAt(Cesium.Cartesian3.ZERO,new Cesium.HeadingPitchRange(heading,-.22,14500000));
  scene.postRender.addEventListener(()=>{
    const now=performance.now();
    if(autoOrbit&&!followISS&&now-lastManual>250){heading+=.000085;viewer.camera.lookAt(Cesium.Cartesian3.ZERO,new Cesium.HeadingPitchRange(heading,-.22,14500000));}
  });
  window.CesiumEarthViewer=viewer;

  // Gaussian-splat LOD showcase is injected after the base Cesium scene exists.
  const script=document.createElement('script');
  script.src='gaussian-splats.js';
  script.onload=()=>console.info('Gaussian LOD module ready');
  script.onerror=()=>console.warn('Gaussian LOD module failed to load');
  document.body.appendChild(script);
})();
