import { readFileSync, existsSync } from 'node:fs';

let failed = false;
const mustExist = ['index.html','cesium-earth.js','tracker.js','gaussian-splats.js','ambient-piano.js','data/iss.tle','.github/workflows/update-iss-tle.yml'];
for (const file of mustExist) {
  const ok = existsSync(file);
  console.log(`${ok ? 'PASS' : 'FAIL'} exists: ${file}`);
  if (!ok) failed = true;
}
const html = readFileSync('index.html','utf8');
for (const token of ['Cesium.js','satellite.js','tracker.js','cesium-earth.js','earth3d','alt','vel','lat','lon']) {
  const ok = html.includes(token);
  console.log(`${ok ? 'PASS' : 'FAIL'} html: ${token}`);
  if (!ok) failed = true;
}
for (const bad of ['NaturalEarthII/{z}/{x}/{reverseY}','ImageryLayer.fromProviderAsync(Cesium.IonImageryProvider.fromAssetId(2)).then','youtube.com/embed','sen.com/']) {
  const ok = !readFileSync('cesium-earth.js','utf8').includes(bad) && !html.includes(bad);
  console.log(`${ok ? 'PASS' : 'FAIL'} removed broken pattern: ${bad}`);
  if (!ok) failed = true;
}
const tle = readFileSync('data/iss.tle','utf8');
for (const linePrefix of ['1 25544 ','2 25544 ']) {
  const ok = tle.split(/\r?\n/).some(line => line.startsWith(linePrefix));
  console.log(`${ok ? 'PASS' : 'FAIL'} TLE contains ${linePrefix.trim()}`);
  if (!ok) failed = true;
}
process.exitCode = failed ? 1 : 0;
