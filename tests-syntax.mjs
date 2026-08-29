import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const files = ['tracker.js','cesium-earth.js','gaussian-splats.js','ambient-piano.js','earth-imagery.js','goes-loop.js'];
let failed = false;
for (const file of files) {
  try { await readFile(file, 'utf8'); } catch { console.error(`MISSING ${file}`); failed = true; continue; }
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) { failed = true; console.error(`FAIL ${file}\n${result.stderr || result.stdout}`); }
  else console.log(`PASS ${file}`);
}
if (failed) process.exit(1);
console.log('All JavaScript syntax checks passed.');
