// Langit Courier — physics.js
// Model terbang pesawat kurir "Camar-7". Murni fungsi angka, tanpa DOM,
// supaya bisa diuji dengan node (lihat tests/flight.test.mjs).
//
// State pesawat: x (lateral, m), y (ketinggian, m), z (jarak maju, m),
// heading (radian, 0 = lurus ke +z), speed (m/s), throttle (0..1),
// roll (radian, miring sayap), pitchRate (m/s naik/turun), fuel (%),
// damage (%), verticalSpeed (m/s, untuk menilai pendaratan).

import { PLANE, RING, SCORE } from './config.js';

export function createPlane(mission) {
  return {
    x: 0,
    y: 85,
    z: 0,
    heading: 0,
    speed: 30,
    throttle: 0.55,
    roll: 0,
    pitchRate: 0,
    verticalSpeed: 0,
    fuel: mission.fuel,
    damage: 0,
    ringsPassed: 0,
    score: 0,
    timeSec: 0,
    landed: false,
    crashed: false,
    crashReason: '',
    engineOut: false,
    gearDown: true,
  };
}

// Input ternormalisasi: { roll: -1..1, pitch: -1..1 (positif = naik),
// throttleDelta: -1..1 per detik, brake: boolean }
export function stepPlane(plane, input, world, dt) {
  if (plane.landed || plane.crashed) return plane;
  const mission = world.mission;
  plane.timeSec += dt;

  // --- Bahan bakar: throttle tinggi = boros. Habis = mesin mati, melayang. ---
  const burn = (PLANE.fuelBurnIdle + plane.throttle * PLANE.fuelBurnPerSec) * dt;
  plane.fuel = Math.max(0, plane.fuel - burn);
  plane.engineOut = plane.fuel <= 0;
  if (plane.engineOut) plane.throttle = Math.max(0, plane.throttle - dt * 0.5);

  // --- Throttle & kecepatan: kecepatan mengejar target throttle. ---
  plane.throttle = clamp(plane.throttle + input.throttleDelta * dt, 0, 1);
  const targetSpeed = plane.engineOut
    ? 22
    : PLANE.minSpeed + plane.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
  const accel = input.brake ? PLANE.accel * 2.2 : PLANE.accel;
  plane.speed = approach(plane.speed, targetSpeed, accel * dt);

  // --- Stall: terlalu pelan = kontrol melemah, pesawat merosot. ---
  const stallFactor = clamp((plane.speed - PLANE.stallSpeed) / 12, 0.25, 1);
  const maxBank = (PLANE.maxBankDeg * Math.PI) / 180;
  const targetRoll = input.roll * maxBank * stallFactor;
  plane.roll = approachAngle(plane.roll, targetRoll, 3.0 * dt);
  // Belok dari kemiringan sayap: sayap kanan turun (roll +) = belok kanan
  // (heading +, hidung ke +x). Makin miring + makin cepat = makin tajam.
  const turnRate = Math.tan(plane.roll) * 0.45 * (plane.speed / PLANE.cruiseSpeed);
  plane.heading += turnRate * dt;

  // --- Naik/turun: stick + daya angkat dari kecepatan (di atas cruise
  // naik pelan, di bawah cruise merosot pelan — stick netral ≈ tahan ketinggian).
  const lift = (plane.speed - PLANE.cruiseSpeed) * 0.1;
  const targetPitchRate = input.pitch * PLANE.maxPitch * stallFactor + lift;
  plane.pitchRate = approach(plane.pitchRate, targetPitchRate, 9 * dt);
  plane.verticalSpeed = plane.pitchRate;
  if (plane.speed < PLANE.stallSpeed) {
    plane.verticalSpeed -= (PLANE.stallSpeed - plane.speed) * 0.55;
  }
  plane.y += plane.verticalSpeed * dt;

  // --- Maju + angin lateral (angin + hembusan berubah pelan). ---
  const gust = Math.sin(plane.timeSec * 0.5) * mission.gust;
  const wind = mission.wind + gust;
  plane.x += Math.sin(plane.heading) * plane.speed * dt + wind * dt * 0.6;
  plane.z += Math.cos(plane.heading) * plane.speed * dt;
  plane.windNow = wind;

  // --- Ring: lewati lingkaran 3D = parsel terkirim. ---
  const ring = world.rings.find((r) => !r.passed);
  if (ring) {
    const dx = plane.x - ring.x;
    const dy = plane.y - ring.y;
    const dz = plane.z - ring.z;
    if (dx * dx + dy * dy + dz * dz < RING.radius * RING.radius) {
      ring.passed = true;
      plane.ringsPassed += 1;
      plane.score += SCORE.ring;
      plane.lastRingAt = plane.timeSec;
    }
  }

  // --- Tanah & air: y <= 0. Mendarat hanya sah di runway. ---
  if (plane.y <= 0) {
    plane.y = 0;
    const rw = world.runway;
    const onRunway =
      Math.abs(plane.x - rw.x) < PLANE.runwayHalfWidth &&
      plane.z > rw.z &&
      plane.z < rw.z + PLANE.runwayLength;
    const gentle = plane.verticalSpeed > -PLANE.safeSinkRate;
    const slowEnough = plane.speed <= PLANE.safeTouchdownSpeed;
    const aligned = Math.abs(plane.heading) < 0.35;
    const allRings = plane.ringsPassed >= world.rings.length;
    if (onRunway && gentle && slowEnough && aligned && allRings) {
      plane.landed = true;
      plane.score += SCORE.landing;
      if (plane.verticalSpeed > -3.5 && plane.speed < 45) plane.score += SCORE.smoothLanding;
    } else if (onRunway && gentle && slowEnough && aligned && !allRings) {
      // Mendarat di runway sebelum semua ring: selamat, tapi misi belum selesai.
      plane.landed = true;
      plane.earlyLanding = true;
    } else if (onRunway && (!gentle || !slowEnough)) {
      plane.damage += 45;
      plane.verticalSpeed = Math.abs(plane.verticalSpeed) * 0.4; // memantul
      plane.y = 2;
      if (plane.damage >= 100) crash(plane, 'Pendaratan terlalu keras — Camar-7 hancur.');
    } else if (!onRunway) {
      crash(plane, plane.z < 50 ? 'Camar-7 menabrak laut.' : 'Camar-7 menabrak daratan.');
    } else {
      crash(plane, 'Pendaratan miring — Camar-7 tergelincir.');
    }
  }

  // --- Batas dunia: terlalu jauh ke samping = kembali dipaksa angin. ---
  if (Math.abs(plane.x) > 700) {
    plane.x = Math.sign(plane.x) * 700;
    plane.damage = Math.min(100, plane.damage + 2 * dt);
  }
  if (plane.y > 320) {
    plane.y = 320;
    plane.verticalSpeed = Math.min(0, plane.verticalSpeed);
  }
  if (plane.z > world.mission.runway.z + PLANE.runwayLength + 600) {
    crash(plane, 'Camar-7 terbang melewati Pulau Karang.');
  }
  return plane;
}

function crash(plane, reason) {
  plane.crashed = true;
  plane.crashReason = reason;
  plane.damage = 100;
}

// Autopilot untuk mode attract & preset screenshot: arahkan ke target,
// jaga ketinggian target, throttle ekonomis.
export function autopilotInput(plane, world) {
  const target = currentTargetLocal(world);
  const dx = target.x - plane.x;
  // Bidik titik minimal 120 m di depan: atan2 jadi hipersensitif saat
  // dz mendekati nol dan autopilot membanting sayap di depan ring.
  const dz = Math.max(120, target.z - plane.z);
  const desiredHeading = Math.atan2(dx, dz);
  let headingError = desiredHeading - plane.heading;
  while (headingError > Math.PI) headingError -= Math.PI * 2;
  while (headingError < -Math.PI) headingError += Math.PI * 2;
  const roll = clamp(headingError * 1.6, -1, 1);
  const altError = target.y - plane.y;
  const pitch = clamp(altError / 40, -1, 1);
  const wantSpeed = target.kind === 'runway' ? 0.45 : 0.72;
  return {
    roll,
    pitch,
    throttleDelta: clamp((wantSpeed - plane.throttle) * 1.5, -1, 1),
    brake: target.kind === 'runway' && plane.z > target.z - 700,
  };
}

function currentTargetLocal(world) {
  const ring = world.rings.find((r) => !r.passed);
  if (ring) return { x: ring.x, y: ring.y, z: ring.z, kind: 'ring' };
  return { x: world.runway.x, y: 30, z: world.runway.z + 140, kind: 'runway' };
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function approach(v, target, step) {
  if (v < target) return Math.min(target, v + step);
  return Math.max(target, v - step);
}

function approachAngle(v, target, step) {
  return approach(v, target, step);
}
