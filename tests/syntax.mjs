import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = [
  'tracker.js',
  'cesium-earth.js',
  'gaussian-splats.js',
  'ambient-piano.js',
  'earth-imagery.js',
  'goes-loop.js'
];

let failed = false;
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log(`PASS syntax: ${file}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL syntax: ${file}`);
    console.error(String(error.stderr || error.stdout || error));
  }
}

const html = readFileSync('index.html', 'utf8');
const required = [
  'Cesium.js',
  'cesium-earth.js',
  'tracker.js',
  'ambient-piano.js',
  'earth3d',
  'alt',
  'vel',
  'lat',
  'lon'
];
for (const token of required) {
  const ok = html.includes(token);
  console.log(`${ok ? 'PASS' : 'FAIL'} html contains: ${token}`);
  if (!ok) failed = true;
}

for (const bad of [
  'NaturalEarthII',
  'ImageryLayer.fromProviderAsync(Cesium.IonImageryProvider.fromAssetId(2)).then',
  'youtube.com/embed',
  'sen.com/'
]) {
  const ok = !html.includes(bad) && !readFileSync('cesium-earth.js','utf8').includes(bad);
  console.log(`${ok ? 'PASS' : 'FAIL'} removed broken dependency: ${bad}`);
  if (!ok) failed = true;
}

process.exitCode = failed ? 1 : 0;
