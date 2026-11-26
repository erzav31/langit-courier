// Langit Courier — game.js
// Mesin state game: attract (autopilot jalan sendiri supaya tangkapan
// harness langsung menampilkan gameplay) → playing → landed / crashed.
// Menggabungkan fisika, dunia, input, audio, dan renderer.

import { MISSIONS, PALETTES, SCORE } from './config.js';
import { buildWorld } from './world.js';
import { createPlane, stepPlane, autopilotInput } from './physics.js';
import { renderScene } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';

export function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  const input = createInput(canvas);
  const audio = createAudio();
  const game = {
    mode: 'attract', // attract | playing | landed | crashed
    missionIndex: 0,
    plane: null,
    world: null,
    palette: null,
    message: '',
    messageColor: '#ffffff',
    messageUntil: 0,
    showHints: true,
    muted: false,
    lastRingCount: 0,
    lowFuelWarned: false,
    onEvent: null, // callback eksternal (dipakai harness/tes): (name, detail)
  };

  function loadMission(index) {
    game.missionIndex = index;
    game.world = buildWorld(index);
    game.plane = createPlane(game.world.mission);
    game.palette = PALETTES[game.world.mission.palette];
    game.lastRingCount = 0;
    game.lowFuelWarned = false;
    game.message = '';
    game.mode = game.mode === 'attract' ? 'attract' : 'playing';
  }

  function flash(text, color, ms) {
    game.message = text;
    game.messageColor = color || '#ffffff';
    game.messageUntil = performance.now() + (ms || 2200);
  }

  function startPlaying() {
    if (game.mode === 'attract') {
      game.mode = 'playing';
      audio.unlock();
      flash(`MISI ${game.world.mission.id} — ${game.world.mission.name}`, '#ffd23e', 2600);
    }
  }

  function restart() {
    loadMission(game.missionIndex);
    game.mode = 'playing';
    audio.unlock();
    flash(`MISI ${game.world.mission.id} — ${game.world.mission.name}`, '#ffd23e', 2600);
  }

  // Satu langkah simulasi (dt detik). Dipisah dari render supaya bisa
  // dijalankan deterministik oleh preset screenshot.
  function step(dt) {
    input.tick();
    const plane = game.plane;
    const world = game.world;
    if (game.mode === 'attract') {
      const ai = autopilotInput(plane, world);
      stepPlane(plane, ai, world, dt);
      if (plane.landed || plane.crashed) {
        // Attract tidak berhenti di akhir: muat ulang misi yang sama.
        loadMission(game.missionIndex);
      }
      if (input.consumeAnyKey() || input.consumeClick()) startPlaying();
      const mk = consumeMissionKey();
      if (mk >= 0) {
        game.missionIndex = mk;
        restart();
      }
      return;
    }
    if (game.mode === 'playing') {
      if (input.pressed('KeyR')) {
        restart();
        return;
      }
      if (input.pressed('KeyM') && !muteKeySeen) {
        muteKeySeen = true;
        game.muted = audio.toggleMute();
        flash(game.muted ? 'SUARA MATI' : 'SUARA HIDUP', '#ffffff', 1200);
      }
      if (!input.pressed('KeyM')) muteKeySeen = false;
      const mk = consumeMissionKey();
      if (mk >= 0) {
        game.missionIndex = mk;
        restart();
        return;
      }
      stepPlane(plane, input, world, dt);
      audio.updateEngine(plane.throttle, plane.speed, plane.engineOut);
      if (plane.ringsPassed > game.lastRingCount) {
        game.lastRingCount = plane.ringsPassed;
        audio.ring();
        flash(`RING ${plane.ringsPassed}/${world.rings.length} — +${SCORE.ring} PARSEL TERKIRIM`, '#7ed07e');
        game.onEvent?.('ring', { count: plane.ringsPassed });
      }
      if (!game.lowFuelWarned && plane.fuel < 25 && !plane.engineOut) {
        game.lowFuelWarned = true;
        audio.alarm();
        flash('⚠ BAHAN BAKAR RENDAH — CARI RUNWAY', '#ff5a4e', 3000);
      }
      if (plane.engineOut && plane.fuel <= 0) {
        flash('MESIN MATI — MELAYANG KE RUNWAY', '#ff5a4e', 1600);
      }
      if (plane.landed) {
        game.mode = 'landed';
        audio.thud();
        audio.fanfare();
        game.onEvent?.('landed', { score: plane.score });
      } else if (plane.crashed) {
        game.mode = 'crashed';
        audio.thud();
        game.onEvent?.('crashed', { reason: plane.crashReason });
      }
      return;
    }
    // landed / crashed: tunggu R atau klik untuk terbang lagi.
    if (input.pressed('KeyR') || input.consumeClick() || input.consumeAnyKey()) restart();
    const mk = consumeMissionKey();
    if (mk >= 0) {
      game.missionIndex = mk;
      restart();
    }
  }

  // Tombol 1/2/3 memilih misi (dibaca sekali per tekanan via edge detect).
  let missionKeySeen = false;
  let muteKeySeen = false;
  function consumeMissionKey() {
    const pressed =
      input.pressed('Digit1') || input.pressed('Digit2') || input.pressed('Digit3');
    if (!pressed) {
      missionKeySeen = false;
      return -1;
    }
    if (missionKeySeen) return -1;
    missionKeySeen = true;
    if (input.pressed('Digit1')) return 0;
    if (input.pressed('Digit2')) return 1;
    return 2;
  }

  function render() {
    renderScene(ctx, {
      plane: game.plane,
      world: game.world,
      palette: game.palette,
      mode: game.mode,
      message: game.message,
      messageColor: game.messageColor,
      messageUntil: game.messageUntil,
      showHints: game.showHints,
    });
  }

  loadMission(0);
  return { game, step, render, loadMission, restart, startPlaying, flash };
}
