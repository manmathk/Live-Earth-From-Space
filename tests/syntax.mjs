import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = [
  'tracker.js',
  'cinematic-earth.js',
  'earth-imagery.js',
  'goes-loop.js',
  'ambient-piano.js'
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

if (html.includes('NaturalEarthII')) {
  console.error('FAIL: index.html still contains a NaturalEarthII runtime dependency');
  failed = true;
}

if (html.includes('sen.com') || html.includes('youtube.com/embed')) {
  console.error('FAIL: broken third-party iframe source remains in index.html');
  failed = true;
}

process.exitCode = failed ? 1 : 0;
