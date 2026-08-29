/* Cesium 3D Tiles Gaussian Splats — Multiple LOD demo.
   Public reference asset documented by Cesium: asset 4547222.
   Loaded only on demand so the Earth view stays lightweight.
*/
(() => {
  const Cesium = window.Cesium;
  if (!Cesium || !window.CesiumEarthViewer) return;

  const viewer = window.CesiumEarthViewer;
  const ASSET_ID = 4547222;
  let tileset = null;
  let active = false;
  let previousView = null;

  const button = document.createElement('button');
  button.id = 'gaussianLod';
  button.type = 'button';
  button.textContent = 'GAUSSIAN LOD';
  Object.assign(button.style, {
    position: 'fixed', right: '18px', bottom: '207px', zIndex: '31',
    padding: '8px 10px', border: '1px solid rgba(255,255,255,.12)',
    borderRadius: '4px', background: '#071019e8', color: '#c7d1d8',
    font: '9px ui-monospace,SFMono-Regular,Menlo,monospace',
    letterSpacing: '.08em', cursor: 'pointer', backdropFilter: 'blur(10px)'
  });
  document.body.appendChild(button);

  const status = document.createElement('div');
  status.id = 'gaussianStatus';
  Object.assign(status.style, {
    position: 'fixed', left: '18px', bottom: '159px', zIndex: '31',
    padding: '7px 10px', border: '1px solid rgba(255,255,255,.1)',
    borderRadius: '4px', background: 'rgba(5,12,18,.78)', color: '#9eabb4',
    font: '8px ui-monospace,SFMono-Regular,Menlo,monospace',
    letterSpacing: '.08em', display: 'none', backdropFilter: 'blur(10px)'
  });
  document.body.appendChild(status);

  function setStatus(text) {
    status.textContent = text;
    status.style.display = text ? 'block' : 'none';
  }

  async function enter() {
    if (active) return;
    active = true;
    previousView = {
      destination: viewer.camera.positionWC.clone(),
      direction: viewer.camera.directionWC.clone(),
      up: viewer.camera.upWC.clone()
    };
    button.textContent = 'LOADING SPLATS…';
    button.disabled = true;
    setStatus('GAUSSIAN SPLATS · STREAMING MULTIPLE LODS');

    try {
      if (!tileset) {
        tileset = await Cesium.Cesium3DTileset.fromIonAssetId(ASSET_ID);
        tileset.maximumScreenSpaceError = 8;
        viewer.scene.primitives.add(tileset);
      }
      await viewer.zoomTo(tileset, new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(100),
        Cesium.Math.toRadians(-25),
        220
      ));
      setStatus('GAUSSIAN SPLATS · LOD STREAMING · PUBLIC DEMO');
      button.textContent = 'EXIT SPLAT';
    } catch (error) {
      console.error('Gaussian splat tileset failed', error);
      setStatus('GAUSSIAN SPLATS · LOAD FAILED');
      active = false;
      button.textContent = 'GAUSSIAN LOD';
    } finally {
      button.disabled = false;
    }
  }

  function exit() {
    active = false;
    if (previousView) {
      viewer.camera.setView({
        destination: previousView.destination,
        orientation: {
          direction: previousView.direction,
          up: previousView.up
        }
      });
    }
    button.textContent = 'GAUSSIAN LOD';
    setStatus('');
  }

  button.addEventListener('click', () => active ? exit() : enter());
  window.GaussianSplatsLOD = { enter, exit, get tileset() { return tileset; } };
})();
