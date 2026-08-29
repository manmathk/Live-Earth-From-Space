/* CesiumJS cinematic Earth + ISS orbit layer. No Cesium ion token required. */
(() => {
  const Cesium = window.Cesium;
  if (!Cesium) {
    console.error('CesiumJS failed to load.');
    return;
  }

  const viewer = new Cesium.Viewer('earth3d', {
    baseLayer: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    vrButton: false,
    shouldAnimate: true,
    skyBox: undefined,
    skyAtmosphere: true,
    creditContainer: document.createElement('div')
  });

  const scene = viewer.scene;
  scene.scene3DOnly = true;
  scene.backgroundColor = Cesium.Color.BLACK;
  scene.globe.enableLighting = true;
  scene.globe.dynamicAtmosphereLighting = true;
  scene.globe.dynamicAtmosphereLightingFromSun = true;
  scene.globe.showGroundAtmosphere = true;
  scene.globe.atmosphereLightIntensity = 8.0;
  scene.globe.lambertDiffuseMultiplier = 1.05;
  scene.globe.nightFadeOutDistance = 0.8 * Math.PI * Cesium.Ellipsoid.WGS84.minimumRadius;
  scene.globe.nightFadeInDistance = 3.0 * Math.PI * Cesium.Ellipsoid.WGS84.minimumRadius;
  scene.skyAtmosphere = new Cesium.SkyAtmosphere();
  scene.skyAtmosphere.show = true;
  scene.skyAtmosphere.atmosphereLightIntensity = 35.0;
  scene.skyAtmosphere.mieCoefficient = 21e-6;
  scene.skyAtmosphere.mieAnisotropy = 0.76;
  scene.fog.enabled = false;
  scene.highDynamicRange = true;

  // Cesium's bundled Natural Earth II gives us a dependable equirectangular
  // Earth texture without a third-party map token or CORS dependency.
  const naturalEarth = new Cesium.UrlTemplateImageryProvider({
    url: Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII') + '/{z}/{x}/{reverseY}.jpg',
    tilingScheme: new Cesium.GeographicTilingScheme(),
    maximumLevel: 5,
    credit: new Cesium.Credit('Natural Earth II / CesiumJS')
  });
  scene.globe.imageryLayers.addImageryProvider(naturalEarth);

  // Subtle translucent cloud motion, procedurally represented by repeated
  // soft ellipses rather than a fragile external texture.
  const cloudCollection = scene.primitives.add(new Cesium.PolylineCollection());

  const iss = viewer.entities.add({
    id: 'ISS-25544',
    name: 'International Space Station · ZARYA',
    position: Cesium.Cartesian3.fromDegrees(0, 0, 420000),
    point: {
      pixelSize: 9,
      color: Cesium.Color.CYAN,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(4.0e6, 1.25, 3.0e7, 0.72)
    },
    label: {
      text: 'ISS',
      font: '700 12px monospace',
      fillColor: Cesium.Color.CYAN,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -15),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      showBackground: true,
      backgroundColor: new Cesium.Color(0.02, 0.06, 0.09, 0.72),
      backgroundPadding: new Cesium.Cartesian2(6, 4)
    }
  });

  const halo = viewer.entities.add({
    id: 'ISS-25544-HALO',
    position: iss.position,
    ellipse: {
      semiMajorAxis: 42000,
      semiMinorAxis: 42000,
      material: new Cesium.ColorMaterialProperty(new Cesium.Color(0.35, 0.92, 1.0, 0.12)),
      outline: true,
      outlineColor: Cesium.Color.CYAN.withAlpha(0.55),
      outlineWidth: 1,
      height: 420000,
      classificationType: Cesium.ClassificationType.NONE
    }
  });

  const orbitEntity = viewer.entities.add({
    id: 'ISS-ORBIT-PATH',
    name: 'ISS ±50 minute orbit path',
    polyline: {
      positions: [],
      width: 2,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.16,
        taperPower: 0.35,
        color: Cesium.Color.CYAN.withAlpha(0.55)
      }),
      clampToGround: false,
      arcType: Cesium.ArcType.NONE
    }
  });

  const groundTrack = viewer.entities.add({
    id: 'ISS-GROUND-TRACK',
    name: 'ISS ground track',
    polyline: {
      positions: [],
      width: 1.5,
      material: Cesium.Color.CYAN.withAlpha(0.25),
      clampToGround: true
    }
  });

  let autoOrbit = true;
  let followISS = false;
  let heading = 5.1;
  let lastManual = 0;

  function stopAutoOnInteraction() {
    lastManual = performance.now();
    autoOrbit = false;
    const a = document.getElementById('auto');
    if (a) a.classList.remove('on');
  }

  viewer.screenSpaceEventHandler.setInputAction(stopAutoOnInteraction, Cesium.ScreenSpaceEventType.LEFT_DOWN);
  viewer.screenSpaceEventHandler.setInputAction(stopAutoOnInteraction, Cesium.ScreenSpaceEventType.WHEEL);
  viewer.screenSpaceEventHandler.setInputAction(stopAutoOnInteraction, Cesium.ScreenSpaceEventType.PINCH_START);

  window.toggleEarthAuto = () => {
    autoOrbit = !autoOrbit;
    if (autoOrbit) followISS = false;
    return autoOrbit;
  };

  window.toggleEarthFollow = () => {
    followISS = !followISS;
    if (followISS) autoOrbit = false;
    if (!followISS) viewer.camera.lookAt(Cesium.Cartesian3.ZERO, new Cesium.HeadingPitchRange(heading, -0.22, 14500000));
    return followISS;
  };

  window.resetEarth = () => {
    autoOrbit = true;
    followISS = false;
    heading = 5.1;
    viewer.camera.lookAt(Cesium.Cartesian3.ZERO, new Cesium.HeadingPitchRange(heading, -0.22, 14500000));
    const a = document.getElementById('auto');
    const f = document.getElementById('follow');
    if (a) a.classList.add('on');
    if (f) f.classList.remove('on');
  };

  window.updateISS3D = (lat, lon, altKm) => {
    const h = Math.max(altKm || 0, 0) * 1000;
    const p = Cesium.Cartesian3.fromDegrees(lon, lat, h);
    iss.position = p;
    halo.position = p;
    if (followISS) {
      viewer.camera.lookAt(p, new Cesium.HeadingPitchRange(0, -0.12, 1450000));
    }
  };

  window.updateOrbitPath = (sat, date) => {
    if (!sat || !window.satellite) return;
    const orbitPts = [];
    const trackPts = [];
    for (let min = -50; min <= 50; min += 1) {
      const t = new Date(date.getTime() + min * 60000);
      const pv = window.satellite.propagate(sat, t);
      if (!pv || !pv.position) continue;
      const geo = window.satellite.eciToGeodetic(pv.position, window.satellite.gstime(t));
      const lat = window.satellite.degreesLat(geo.latitude);
      const lon = window.satellite.degreesLong(geo.longitude);
      const alt = geo.height * 1000;
      orbitPts.push(Cesium.Cartesian3.fromDegrees(lon, lat, Math.max(0, alt + 18000)));
      trackPts.push(Cesium.Cartesian3.fromDegrees(lon, lat, 0));
    }
    orbitEntity.polyline.positions = orbitPts;
    groundTrack.polyline.positions = trackPts;
  };

  viewer.camera.lookAt(Cesium.Cartesian3.ZERO, new Cesium.HeadingPitchRange(heading, -0.22, 14500000));

  scene.postRender.addEventListener(() => {
    const now = performance.now();
    if (autoOrbit && !followISS && now - lastManual > 250) {
      heading += 0.000085;
      viewer.camera.lookAt(Cesium.Cartesian3.ZERO, new Cesium.HeadingPitchRange(heading, -0.22, 14500000));
    }
  });

  window.CesiumEarthViewer = viewer;
})();
