// Langit Courier — shots.js
// Preset deterministik untuk screenshot: menempatkan Camar-7 di momen
// yang paling mewakili game, lalu membiarkan autopilot menerbangkannya
// beberapa detik supaya frame hidup (baling-baling, awan, burung bergerak).
// Dipakai lewat ?shot=cover|rings|landing|dusk — render asli dari kode game.

import { autopilotInput, stepPlane } from './physics.js';
import { SCORE } from './config.js';

export const SHOT_PRESETS = {
  // Gameplay padat tengah misi: ring 3 di depan, pulau + runway jauh.
  cover: { mission: 0, z: 2100, x: -100, y: 100, speed: 46, throttle: 0.72, settleSec: 3.5 },
  // Sedang menembus ring di tengah badai (misi 2).
  rings: { mission: 1, z: 1250, x: -120, y: 118, speed: 48, throttle: 0.78, settleSec: 5 },
  // Final approach ke Runway 07: strip landasan di depan, lampu menyala.
  landing: { mission: 0, z: 4420, x: 8, y: 42, speed: 40, throttle: 0.42, settleSec: 4 },
  // Senja misi 3: langit oranye-ungu, ring kuning di depan.
  dusk: { mission: 2, z: 1700, x: -80, y: 100, speed: 44, throttle: 0.7, settleSec: 6 },
};

// Terapkan preset lalu jalankan autopilot `settleSec` detik (langkah 1/60)
// supaya pesawat, awan, dan burung berada di posisi alami, bukan beku.
export function applyShotPreset(game, shotName) {
  const preset = SHOT_PRESETS[shotName];
  if (!preset) return false;
  game.loadMission(preset.mission);
  const plane = game.game.plane;
  plane.x = preset.x;
  plane.y = preset.y;
  plane.z = preset.z;
  plane.speed = preset.speed;
  plane.throttle = preset.throttle;
  plane.heading = 0;
  plane.roll = 0;
  // Tandai ring sebelum posisi pesawat sebagai sudah dilewati.
  let passed = 0;
  for (const ring of game.game.world.rings) {
    if (ring.z < preset.z - 40) {
      ring.passed = true;
      passed += 1;
    }
  }
  game.game.plane.ringsPassed = passed;
  game.game.plane.score = passed * SCORE.ring;
  game.game.lastRingCount = passed;
  const dt = 1 / 60;
  const steps = Math.round(preset.settleSec / dt);
  for (let i = 0; i < steps; i++) {
    const ai = autopilotInput(plane, game.game.world);
    stepPlane(plane, ai, game.game.world, dt);
    if (plane.landed || plane.crashed) break;
  }
  game.game.mode = 'playing';
  game.game.showHints = false;
  if (shotName === 'landing') {
    game.flash('FINAL — RUNWAY 07 DI DEPAN', '#ffd23e', 60000);
  } else if (shotName === 'rings') {
    game.flash('RING 2/6 — ANGIN BADAI 9 m/s', '#ffffff', 60000);
  } else if (shotName === 'dusk') {
    game.flash('SURAT SENJA — RING 3/7', '#ffd23e', 60000);
  } else {
    game.flash('RING 3/5 — PARSEL PAGI', '#7ed07e', 60000);
  }
  return true;
}
