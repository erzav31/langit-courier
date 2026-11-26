// Langit Courier — tests/flight.test.mjs
// Logic test murni Node (tanpa DOM/browser): fisika terbang + dunia misi.
// Jalankan: node tests/flight.test.mjs — keluar 0 bila semua PASS.

import { createPlane, stepPlane, autopilotInput, clamp } from '../game/src/physics.js';
import { buildWorld, nextRing, currentTarget } from '../game/src/world.js';
import { MISSIONS } from '../game/src/config.js';

let pass = 0;
let fail = 0;
const results = [];

function check(name, cond, detail) {
  if (cond) {
    pass += 1;
    results.push(`PASS ${name}`);
  } else {
    fail += 1;
    results.push(`FAIL ${name} — ${detail ?? ''}`);
  }
}

function almost(a, b, eps = 1e-6) {
  return Math.abs(a - b) < eps;
}

function freshWorld(missionIndex = 0) {
  return buildWorld(missionIndex);
}

function freshPlane(world) {
  return createPlane(world.mission);
}

const idle = { roll: 0, pitch: 0, throttleDelta: 0, brake: false };

// --- 1. Dunia deterministik: seed sama = pulau sama. ---
{
  const a = freshWorld(0);
  const b = freshWorld(0);
  check(
    'world deterministic (islands identical)',
    JSON.stringify(a.islands) === JSON.stringify(b.islands) &&
      JSON.stringify(a.clouds) === JSON.stringify(b.clouds),
    'islands/clouds differ between builds',
  );
  check('world has runway island', a.runwayIsland.r === 320, `r=${a.runwayIsland.r}`);
  check('world rings = mission rings', a.rings.length === MISSIONS[0].rings.length, `${a.rings.length}`);
  check('nextRing is ring 0', nextRing(a)?.index === 0, `${nextRing(a)?.index}`);
  check('currentTarget is ring 0', currentTarget(a).kind === 'ring', currentTarget(a).kind);
}

// --- 2. Throttle menaikkan kecepatan menuju target. ---
{
  const w = freshWorld(0);
  const p = freshPlane(w);
  const s0 = p.speed;
  stepPlane(p, { ...idle, throttleDelta: 1 }, w, 2);
  check('throttle up raises speed', p.speed > s0, `s0=${s0} s=${p.speed}`);
  check('speed capped at maxSpeed', p.speed <= 78.01, `speed=${p.speed}`);
  stepPlane(p, { ...idle, throttleDelta: -1 }, w, 10);
  check('throttle down lowers speed', p.speed < 40, `speed=${p.speed}`);
}

// --- 3. Stall: di bawah 24 m/s pesawat merosot walau stick naik. ---
{
  const w = freshWorld(0);
  const p = freshPlane(w);
  p.speed = 18;
  p.throttle = 0;
  p.y = 100;
  stepPlane(p, { ...idle, pitch: 1 }, w, 1);
  check('stall sinks despite pitch up', p.verticalSpeed < 0, `vs=${p.verticalSpeed}`);
}

// --- 4. Belok: roll kanan mengubah heading ke kanan (negatif). ---
{
  const w = freshWorld(0);
  const p = freshPlane(w);
  p.speed = 46;
  const h0 = p.heading;
  stepPlane(p, { ...idle, roll: 1 }, w, 1);
  check('bank right turns right', p.heading > h0, `h0=${h0} h=${p.heading}`);
  check('roll approaches max bank', Math.abs(p.roll) > 0.5, `roll=${p.roll}`);
  const p2 = freshPlane(w);
  p2.speed = 46;
  stepPlane(p2, { ...idle, roll: -1 }, w, 1);
  check('bank left turns left', p2.heading < 0, `h=${p2.heading}`);
}

// --- 5. Bahan bakar habis = mesin mati, kecepatan melayang ke 22. ---
{
  const w = freshWorld(0);
  const p = freshPlane(w);
  p.fuel = 0.5;
  p.throttle = 1;
  p.speed = 60;
  for (let i = 0; i < 8; i++) stepPlane(p, { ...idle, throttleDelta: 1 }, w, 1);
  check('fuel empty => engineOut', p.engineOut === true, `fuel=${p.fuel}`);
  check('glide speed approaches 22', Math.abs(p.speed - 22) < 6, `speed=${p.speed}`);
}

// --- 6. Ring: lewati lingkaran = skor +100, ring tertandai. ---
{
  const w = freshWorld(0);
  const p = freshPlane(w);
  const ring = w.rings[0];
  p.x = ring.x;
  p.y = ring.y;
  p.z = ring.z - 12;
  p.speed = 40;
  const s0 = p.score;
  stepPlane(p, idle, w, 0.5);
  check('ring pass scores +100', p.score === s0 + 100, `score=${p.score}`);
  check('ring marked passed', ring.passed === true, '');
  check('nextRing advances', nextRing(w)?.index === 1, `${nextRing(w)?.index}`);
}

// --- 7. Ring yang meleset jauh tidak terhitung. ---
{
  const w = freshWorld(0);
  const p = freshPlane(w);
  const ring = w.rings[0];
  p.x = ring.x + 60;
  p.y = ring.y;
  p.z = ring.z;
  p.speed = 40;
  stepPlane(p, idle, w, 0.5);
  check('ring miss scores nothing', p.score === 0 && ring.passed === false, `score=${p.score}`);
}

// --- 8. Mendarat benar di runway setelah semua ring = landed + bonus. ---
{
  const w = freshWorld(0);
  const p = freshPlane(w);
  for (const r of w.rings) r.passed = true;
  p.ringsPassed = w.rings.length;
  p.x = w.runway.x;
  p.z = w.runway.z + 100;
  p.y = 0.3;
  p.speed = 40;
  p.heading = 0;
  const s0 = p.score;
  stepPlane(p, { ...idle, pitch: -1 }, w, 0.2);
  check('clean landing succeeds', p.landed === true, `landed=${p.landed} crashed=${p.crashed}`);
  check('landing bonus added', p.score >= s0 + 500, `score=${p.score} s0=${s0}`);
}

// --- 9. Mendarat di luar runway = crash. ---
{
  const w = freshWorld(0);
  const p = freshPlane(w);
  p.x = w.runway.x + 200;
  p.z = w.runway.z + 100;
  p.y = 0.3;
  p.speed = 40;
  stepPlane(p, { ...idle, pitch: -1 }, w, 0.2);
  check('off-runway touchdown crashes', p.crashed === true, `crashed=${p.crashed}`);
  check('crash reason mentions sea/land', /laut|daratan/.test(p.crashReason), p.crashReason);
}

// --- 10. Pendaratan terlalu cepat di runway = damage, bukan langsung hancur. ---
{
  const w = freshWorld(0);
  const p = freshPlane(w);
  for (const r of w.rings) r.passed = true;
  p.ringsPassed = w.rings.length;
  p.x = w.runway.x;
  p.z = w.runway.z + 100;
  p.y = 0.3;
  p.speed = 70;
  stepPlane(p, { ...idle, pitch: -1 }, w, 0.2);
  check('hot landing damages, not instant crash', p.damage === 45 && p.crashed === false, `dmg=${p.damage} crashed=${p.crashed}`);
}

// --- 11. Angin mendorong pesawat ke samping. ---
{
  const w = freshWorld(1); // misi 2: angin 9 m/s
  const p = freshPlane(w);
  const x0 = p.x;
  p.speed = 40;
  stepPlane(p, idle, w, 2);
  check('wind pushes laterally', p.x > x0 + 5, `x0=${x0} x=${p.x}`);
}

// --- 12. Autopilot mengejar ring pertama (heading menuju target). ---
{
  const w = freshWorld(0);
  const p = freshPlane(w);
  p.x = 100;
  const ai = autopilotInput(p, w);
  check('autopilot banks toward ring', ai.roll < 0, `roll=${ai.roll}`);
  const p2 = freshPlane(w);
  p2.y = 40;
  const ai2 = autopilotInput(p2, w);
  check('autopilot pitches up when low', ai2.pitch > 0, `pitch=${ai2.pitch}`);
}

// --- 12b. Autopilot berbelok KE target, bukan menjauhinya. ---
{
  const w = freshWorld(0);
  const p = freshPlane(w);
  p.x = 100; // ring 1 ada di x=-40: target di kiri
  p.speed = 46;
  for (let i = 0; i < 480; i++) {
    stepPlane(p, autopilotInput(p, w), w, 1 / 60);
  }
  check('autopilot turns toward target', p.heading < -0.05, `heading=${p.heading}`);
  check('autopilot closes lateral gap', Math.abs(p.x - -40) < 100, `x=${p.x}`);
}
{
  const w = freshWorld(0);
  const p = freshPlane(w);
  p.y = 319;
  p.speed = 60;
  stepPlane(p, { ...idle, pitch: 1 }, w, 2);
  check('altitude ceiling 320', p.y <= 320.01, `y=${p.y}`);
}

// --- 14. clamp helper. ---
check('clamp works', clamp(5, 0, 1) === 1 && clamp(-2, 0, 1) === 0 && almost(clamp(0.5, 0, 1), 0.5));

// --- 15. Misi 3 punya 7 ring & bahan bakar 72. ---
check(
  'mission 3 config',
  MISSIONS[2].rings.length === 7 && MISSIONS[2].fuel === 72,
  `${MISSIONS[2].rings.length} rings, fuel ${MISSIONS[2].fuel}`,
);

for (const line of results) console.log(line);
console.log(`\n${pass}/${pass + fail} PASS${fail ? ` — ${fail} FAIL` : ''}`);
process.exit(fail ? 1 : 0);
