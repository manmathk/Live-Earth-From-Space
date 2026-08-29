/* NOAA GOES-19 full-disk time-lapse player. */
(() => {
  const BASE = 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR';
  const SIZE = '1200x1200';
  const STEP = 10 * 60 * 1000;
  const FRAME_COUNT = 12;
  const image = () => document.getElementById('earthImage');
  const status = () => document.getElementById('imageryStatus');
  let frames = [];
  let index = 0;
  let timer = null;

  function setStatus(t) { if (status()) status().textContent = t; }
  function yday(d) {
    const start = Date.UTC(d.getUTCFullYear(), 0, 0);
    return Math.floor((d.getTime() - start) / 86400000);
  }
  function frameUrl(d) {
    const yyyy = d.getUTCFullYear();
    const ddd = String(yday(d)).padStart(3, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(Math.floor(d.getUTCMinutes() / 10) * 10).padStart(2, '0');
    const stamp = `${yyyy}${ddd}${hh}${mm}`;
    return `${BASE}/${stamp}_GOES19-ABI-FD-GEOCOLOR-${SIZE}.jpg`;
  }
  function nearestSlot(ms) { return Math.floor(ms / STEP) * STEP; }
  function loadFrame(url) {
    return new Promise(resolve => {
      const im = new Image();
      im.onload = () => resolve({url});
      im.onerror = () => resolve(null);
      im.src = url;
    });
  }
  async function build() {
    const now = nearestSlot(Date.now() - 12 * 60 * 1000);
    const urls = [];
    for (let i = FRAME_COUNT - 1; i >= 0; i--) urls.push(frameUrl(new Date(now - i * STEP)));
    const loaded = await Promise.all(urls.map(loadFrame));
    frames = loaded.filter(Boolean);
    if (!frames.length) { setStatus('NOAA GOES-19 · WAITING FOR NEW FRAME'); return; }
    index = 0;
    showFrame();
    setStatus(`NOAA GOES-19 · GEOCOLOR · LIVE LOOP · ${frames.length} FRAMES · 10 MIN UPDATE`);
  }
  function showFrame() {
    const node = image();
    if (!node || !frames.length) return;
    const src = frames[index].url;
    const next = new Image();
    next.onload = () => {
      node.classList.remove('show');
      requestAnimationFrame(() => { node.src = src; node.classList.add('show'); });
    };
    next.src = src;
    index = (index + 1) % frames.length;
  }
  function start() {
    if (timer) return;
    build();
    timer = setInterval(() => {
      showFrame();
      if (index === 0) build();
    }, 7000);
  }
  window.GOESLive = { start, rebuild: build };
  start();
})();
