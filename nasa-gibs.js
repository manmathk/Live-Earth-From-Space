/* NASA GIBS cinematic Earth imagery.
   Uses one WMS-rendered global image for the main visible Earth layer.
   A single top-level image avoids the curved tile-gap artifacts that are
   unacceptable in a cinematic broadcast view. */
(() => {
  const Cesium = window.Cesium;
  const viewer = window.CesiumEarthViewer;
  if (!Cesium || !viewer) return;

  const WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
  const WORLD = Cesium.Rectangle.fromDegrees(-180, -90, 180, 90);
  const layers = {
    visible: { label: 'VISIBLE EARTH', layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', format: 'image/jpeg', alpha: 1.0 },
    clouds: { label: 'CLOUD FRACTION', layer: 'MODIS_Cloud_Fraction_Day', format: 'image/png', alpha: 0.72 },
    temp: { label: 'LAND TEMPERATURE', layer: 'MODIS_Terra_Land_Surface_Temp_Day', format: 'image/png', alpha: 0.68 },
    night: { label: 'NIGHT LIGHTS', layer: 'VIIRS_Black_Marble', format: 'image/jpeg', alpha: 0.78 }
  };

  let activeId = 'visible';
  let activeLayer = null;
  let activeDate = null;

  const css = document.createElement('style');
  css.textContent = `
    .gibs-panel{position:fixed;right:18px;top:350px;z-index:30;width:252px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(3,10,16,.88);backdrop-filter:blur(16px);box-shadow:0 18px 48px #0009;color:#dce7eb;font:8px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}
    .gibs-head{height:39px;padding:0 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.1);font-weight:900;letter-spacing:.15em}.gibs-head span:last-child{color:#5ef0a6;font-size:7px}
    .gibs-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:9px}.gibs-btn{appearance:none;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.025);color:#aebbc2;border-radius:4px;padding:9px 7px;text-align:left;font:800 7px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em;cursor:pointer}.gibs-btn:hover,.gibs-btn.on{color:#74edff;border-color:#74edff55;background:rgba(116,237,255,.06)}
    .gibs-meta{border-top:1px solid rgba(255,255,255,.1);padding:8px 10px;color:#7f8f99;line-height:1.55}.gibs-meta b{color:#dce7eb}
    @media(max-width:900px){.gibs-panel{top:286px;right:10px;width:210px}}@media(max-width:620px){.gibs-panel{top:250px;right:10px;width:185px}.gibs-grid{gap:5px;padding:7px}.gibs-btn{font-size:6px;padding:7px 5px}.gibs-meta{display:none}}
  `;
  document.head.appendChild(css);

  const panel = document.createElement('section');
  panel.className = 'gibs-panel';
  panel.innerHTML = `<div class="gibs-head"><span>NASA EARTH DATA</span><span>● GIBS ONLINE</span></div><div class="gibs-grid"></div><div class="gibs-meta">LAYER <b id="gibsLayer">VISIBLE EARTH</b><br>OBSERVATION DATE <b id="gibsDate">—</b><br>RENDER <b>SINGLE WORLD IMAGE</b></div>`;
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

  function dateString(daysAgo = 0) {
    const d = new Date(Date.now() - daysAgo * 86400000);
    return d.toISOString().slice(0, 10);
  }

  function wmsUrl(cfg, date) {
    const p = new URLSearchParams({
      service: 'WMS',
      version: '1.1.1',
      request: 'GetMap',
      layers: cfg.layer,
      styles: '',
      srs: 'EPSG:4326',
      bbox: '-180,-90,180,90',
      width: '2048',
      height: '1024',
      format: cfg.format,
      transparent: cfg.format === 'image/png' ? 'true' : 'false',
      time: date
    });
    return `${WMS}?${p.toString()}`;
  }

  async function buildLayer(id, date) {
    const cfg = layers[id];
    const url = wmsUrl(cfg, date);
    const provider = await Cesium.SingleTileImageryProvider.fromUrl(url, {
      rectangle: WORLD,
      credit: `NASA GIBS · ${cfg.layer}`
    });
    return new Cesium.ImageryLayer(provider, { alpha: cfg.alpha, show: true });
  }

  async function setLayer(id) {
    const cfg = layers[id];
    for (const daysAgo of [0, 1, 2, 3]) {
      const date = dateString(daysAgo);
      try {
        const layer = await buildLayer(id, date);
        if (activeLayer) viewer.imageryLayers.remove(activeLayer, true);
        activeLayer = viewer.imageryLayers.add(layer, 0);
        activeId = id;
        activeDate = date;
        panel.querySelector('#gibsLayer').textContent = cfg.label;
        panel.querySelector('#gibsDate').textContent = date;
        grid.querySelectorAll('.gibs-btn').forEach(b => b.classList.toggle('on', b.dataset.layer === id));
        window.NASAGIBS = { activeId, date, layer: activeLayer, setLayer };
        return;
      } catch (error) {
        console.warn(`GIBS ${id} unavailable for ${date}`, error);
      }
    }
    panel.querySelector('#gibsDate').textContent = 'UNAVAILABLE';
  }

  window.NASAGIBS = { setLayer, get activeId() { return activeId; }, get date() { return activeDate; }, get layer() { return activeLayer; } };
  setLayer('visible');
})();
