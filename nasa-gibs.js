/* NASA GIBS tiled imagery controller.
   Uses the documented REST WMTS tile pattern because it is designed for interactive maps.
   A stable ArcGIS layer remains underneath as a visual fallback/base. */
(() => {
  const Cesium = window.Cesium;
  const viewer = window.CesiumEarthViewer;
  if (!Cesium || !viewer) return;

  const GIBS_ROOT = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best';
  const TILE_SET = '250m';
  const layers = {
    visible: { label: 'VISIBLE EARTH', layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', format: 'jpg', alpha: 1.0 },
    clouds: { label: 'CLOUD FRACTION', layer: 'MODIS_Cloud_Fraction_Day', format: 'jpg', alpha: 0.72 },
    temp: { label: 'LAND TEMPERATURE', layer: 'MODIS_Terra_Land_Surface_Temp_Day', format: 'png', alpha: 0.68 },
    night: { label: 'NIGHT LIGHTS', layer: 'VIIRS_Black_Marble', format: 'jpg', alpha: 0.78 }
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
  panel.innerHTML = `<div class="gibs-head"><span>NASA EARTH DATA</span><span>● GIBS ONLINE</span></div><div class="gibs-grid"></div><div class="gibs-meta">LAYER <b id="gibsLayer">VISIBLE EARTH</b><br>OBSERVATION DATE <b id="gibsDate">—</b><br>RENDER <b>WMTS / EPSG:4326</b></div>`;
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

  function providerFor(cfg, date) {
    const template = `${GIBS_ROOT}/${cfg.layer}/default/${date}/${TILE_SET}/{z}/{y}/{x}.${cfg.format}`;
    return new Cesium.UrlTemplateImageryProvider({
      url: template,
      tilingScheme: new Cesium.GeographicTilingScheme({ ellipsoid: Cesium.Ellipsoid.WGS84 }),
      tileWidth: 256,
      tileHeight: 256,
      minimumLevel: 0,
      maximumLevel: 7,
      hasAlphaChannel: cfg.format === 'png',
      enablePickFeatures: false,
      credit: `NASA GIBS · ${cfg.layer}`
    });
  }

  async function verifyProvider(provider) {
    // Force a real low-level tile request before replacing the currently visible layer.
    const image = await provider.requestImage(0, 0, 0, undefined);
    if (!image) throw new Error('GIBS tile unavailable');
    return true;
  }

  async function setLayer(id) {
    const cfg = layers[id];
    for (const daysAgo of [0, 1, 2, 3]) {
      const date = dateString(daysAgo);
      try {
        const provider = providerFor(cfg, date);
        await verifyProvider(provider);
        const layer = new Cesium.ImageryLayer(provider, { alpha: cfg.alpha, show: true });
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
