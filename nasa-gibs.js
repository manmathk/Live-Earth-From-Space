/* NASA GIBS Earth-observation layer controller.
   Uses NASA's public GIBS WMS service for time-aware Earth layers. */
(() => {
  const Cesium = window.Cesium;
  const viewer = window.CesiumEarthViewer;
  if (!Cesium || !viewer) return;

  const WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
  const layers = {
    visible: {
      label: 'VISIBLE EARTH',
      layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
      opacity: 0.94,
      credit: 'NASA GIBS · MODIS Terra'
    },
    temp: {
      label: 'LAND TEMPERATURE',
      layer: 'MODIS_Terra_Land_Surface_Temp_Day',
      opacity: 0.72,
      credit: 'NASA GIBS · MODIS Terra'
    },
    clouds: {
      label: 'CLOUD FRACTION',
      layer: 'MODIS_Cloud_Fraction_Day',
      opacity: 0.52,
      credit: 'NASA GIBS · MODIS'
    },
    night: {
      label: 'NIGHT LIGHTS',
      layer: 'VIIRS_Black_Marble',
      opacity: 0.60,
      credit: 'NASA GIBS · VIIRS Black Marble'
    }
  };

  let activeId = 'visible';
  let activeLayer = null;
  let activeDate = null;

  const css = document.createElement('style');
  css.textContent = `
    .gibs-panel{position:fixed;right:18px;top:365px;z-index:30;width:250px;padding:0;border:1px solid rgba(255,255,255,.12);border-radius:7px;background:rgba(3,10,16,.86);backdrop-filter:blur(16px);box-shadow:0 16px 45px #0009;color:#dce7eb;font:8px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}
    .gibs-head{height:38px;padding:0 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.1);font-weight:900;letter-spacing:.15em}
    .gibs-head span:last-child{color:#5ef0a6;font-size:7px}
    .gibs-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:9px}
    .gibs-btn{appearance:none;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.025);color:#aebbc2;border-radius:4px;padding:9px 7px;text-align:left;font:800 7px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em;cursor:pointer}
    .gibs-btn:hover,.gibs-btn.on{color:#74edff;border-color:#74edff55;background:rgba(116,237,255,.06)}
    .gibs-meta{border-top:1px solid rgba(255,255,255,.1);padding:8px 10px;color:#7f8f99;line-height:1.55}
    .gibs-meta b{color:#dce7eb}
    @media(max-width:900px){.gibs-panel{top:300px;right:10px;width:210px}.gibs-btn{padding:8px 6px}}
    @media(max-width:620px){.gibs-panel{top:265px;right:10px;width:185px}.gibs-grid{gap:5px;padding:7px}.gibs-btn{font-size:6px;padding:7px 5px}.gibs-meta{display:none}}
  `;
  document.head.appendChild(css);

  const panel = document.createElement('section');
  panel.className = 'gibs-panel';
  panel.innerHTML = `<div class="gibs-head"><span>NASA EARTH DATA</span><span>● GIBS ONLINE</span></div><div class="gibs-grid"></div><div class="gibs-meta">LAYER <b id="gibsLayer">VISIBLE EARTH</b><br>OBSERVATION DATE <b id="gibsDate">—</b><br>SOURCE <b id="gibsSource">NASA GIBS</b></div>`;
  document.body.appendChild(panel);

  const grid = panel.querySelector('.gibs-grid');
  for (const [id, cfg] of Object.entries(layers)) {
    const button = document.createElement('button');
    button.className = 'gibs-btn' + (id === activeId ? ' on' : '');
    button.textContent = cfg.label;
    button.dataset.layer = id;
    button.addEventListener('click', () => setLayer(id));
    grid.appendChild(button);
  }

  function utcDateString(offsetDays = 0) {
    const d = new Date(Date.now() + offsetDays * 86400000);
    return d.toISOString().slice(0, 10);
  }

  function candidateDates() {
    return [0, -1, -2, -3].map(utcDateString);
  }

  async function createLayer(id, date) {
    const cfg = layers[id];
    const provider = new Cesium.WebMapServiceImageryProvider({
      url: WMS,
      layers: cfg.layer,
      parameters: {
        service: 'WMS',
        version: '1.1.1',
        request: 'GetMap',
        styles: '',
        format: 'image/jpeg',
        transparent: false,
        time: date
      },
      tilingScheme: new Cesium.GeographicTilingScheme({ ellipsoid: Cesium.Ellipsoid.WGS84 }),
      tileWidth: 256,
      tileHeight: 256,
      minimumLevel: 0,
      maximumLevel: 8,
      enablePickFeatures: false,
      credit: cfg.credit
    });
    return new Cesium.ImageryLayer(provider, { alpha: cfg.opacity, show: true });
  }

  async function setLayer(id) {
    activeId = id;
    const buttons = panel.querySelectorAll('.gibs-btn');
    buttons.forEach(b => b.classList.toggle('on', b.dataset.layer === id));

    for (const date of candidateDates()) {
      try {
        const layer = await createLayer(id, date);
        if (activeLayer) viewer.imageryLayers.remove(activeLayer, true);
        activeLayer = viewer.imageryLayers.add(layer, 0);
        activeDate = date;
        panel.querySelector('#gibsLayer').textContent = layers[id].label;
        panel.querySelector('#gibsDate').textContent = date;
        panel.querySelector('#gibsSource').textContent = 'NASA GIBS';
        window.NASAGIBS = { activeId, date, layer: activeLayer };
        return;
      } catch (error) {
        console.warn(`GIBS ${id} unavailable for ${date}`, error);
      }
    }
  }

  window.NASAGIBS = { setLayer, get activeId() { return activeId; }, get layer() { return activeLayer; } };
  setLayer('visible');
})();
