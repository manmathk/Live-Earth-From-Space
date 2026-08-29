import { readFile } from 'node:fs/promises';

const html = await readFile('index.html', 'utf8');
const required = [
  'cesium.com/downloads/cesiumjs/releases/1.144/Build/Cesium/Cesium.js',
  'satellite.js',
  'tracker.js',
  'cesium-earth.js',
  'ambient-piano.js'
];

for (const token of required) {
  if (!html.includes(token)) throw new Error(`index.html missing: ${token}`);
  console.log(`PASS index contains ${token}`);
}

if (html.includes('NaturalEarthII')) throw new Error('index.html still references NaturalEarthII imagery');
if (html.includes('iframe') && /sen\.com|youtube\.com/i.test(html)) throw new Error('Forbidden embedded third-party camera iframe remains');

const cesium = await readFile('cesium-earth.js', 'utf8');
const hasArcGIS = cesium.includes('ArcGisMapServerImageryProvider.fromUrl');
const hasIon = cesium.includes('IonImageryProvider.fromAssetId(2)');
if (!hasArcGIS && !hasIon) throw new Error('No supported Cesium aerial imagery provider configured');
console.log(`PASS Cesium imagery provider: ${hasArcGIS ? 'ArcGIS World Imagery' : 'Cesium ion asset 2'}`);

const splats = await readFile('gaussian-splats.js', 'utf8');
const splatWired = html.includes('gaussian-splats.js') || cesium.includes('gaussian-splats.js');
if (!splatWired) throw new Error('Gaussian LOD module is not wired');
console.log('PASS Gaussian LOD module wired');

if (!splats.includes('fromIonAssetId(ASSET_ID)')) throw new Error('Gaussian tileset loader missing');
if (!splats.includes('maximumScreenSpaceError')) throw new Error('Gaussian LOD performance setting missing');

console.log('Smoke checks passed.');
