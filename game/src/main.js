// Langit Courier — main.js
// Bootstrap: siapkan canvas 1280x800 (diskalakan ke jendela), jalankan
// loop requestAnimationFrame, terapkan preset screenshot bila ada
// ?shot= di URL, dan laporkan error ke #status untuk screen reader.

import { VIEW } from './config.js';
import { createGame } from './game.js';
import { applyShotPreset } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW.width * dpr;
  canvas.height = VIEW.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

fitCanvas();
window.addEventListener('resize', fitCanvas);

const api = createGame(canvas);
const game = api.game;

// Preset screenshot (?shot=cover|rings|landing|dusk): terapkan sekali,
// lalu biarkan loop berjalan normal supaya frame tetap hidup.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const ok = applyShotPreset(api, shot);
  if (ok) {
    statusEl.textContent = `Langit Courier — screenshot ${shot}`;
    document.title = `Langit Courier — ${shot}`;
  }
}

let last = performance.now();
let fpsAccum = 0;
let fpsFrames = 0;
let fpsShown = 0;

function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  try {
    api.step(dt);
    api.render();
  } catch (err) {
    statusEl.textContent = `Langit Courier error: ${err.message}`;
    console.error(err);
  }
  fpsAccum += dt;
  fpsFrames += 1;
  if (fpsAccum >= 1) {
    fpsShown = Math.round(fpsFrames / fpsAccum);
    fpsAccum = 0;
    fpsFrames = 0;
  }
  requestAnimationFrame(frame);
}

// Ekspos untuk harness/tes: window.__langit = { game, fps }.
window.__langit = {
  game,
  fps: () => fpsShown,
  state: () => ({
    mode: game.mode,
    mission: game.missionIndex + 1,
    x: Math.round(game.plane.x),
    y: Math.round(game.plane.y),
    z: Math.round(game.plane.z),
    speedKmh: Math.round(game.plane.speed * 3.6),
    fuel: Math.round(game.plane.fuel),
    rings: game.plane.ringsPassed,
    score: game.plane.score,
  }),
};

requestAnimationFrame(frame);
