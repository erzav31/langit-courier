// Langit Courier — render.js
// Gambar pseudo-3D chase view: langit, laut, pulau, awan, ring, runway,
// pesawat kurir dari belakang, lalu HUD lengkap (ALT/SPD/HDG, bahan bakar,
// throttle, damage, panel misi, peta jalur, indikator sikap).
// Semua gambar digambar dari angka — tanpa aset gambar.

import { VIEW, WORLD, PLANE, RING } from './config.js';

const W = VIEW.width;
const H = VIEW.height;

// Proyeksi: putar titik dunia ke ruang kamera (maju = heading pesawat),
// lalu bagi dengan kedalaman. Mengembalikan null bila di belakang kamera.
export function projectPoint(wx, wy, wz, cam) {
  const relX = wx - cam.x;
  const relY = wy - cam.y;
  const relZ = wz - cam.z;
  const sinH = Math.sin(cam.heading);
  const cosH = Math.cos(cam.heading);
  const depth = relX * sinH + relZ * cosH;
  if (depth < 4) return null;
  const lateral = relX * cosH - relZ * sinH;
  const s = WORLD.focal / depth;
  return {
    x: W / 2 + lateral * s,
    y: cam.horizonY - relY * s * 0.92,
    s,
    depth,
  };
}

function cameraFor(plane) {
  return {
    x: plane.x,
    y: plane.y + WORLD.cameraUp,
    z: plane.z - WORLD.cameraBack,
    heading: plane.heading,
    horizonY: Math.max(H * 0.30, Math.min(H * 0.55, H * 0.44 - plane.verticalSpeed * 2.2)),
  };
}

export function renderScene(ctx, view) {
  const { plane, world, palette } = view;
  const cam = cameraFor(plane);
  const horizonY = cam.horizonY;

  drawSky(ctx, palette, horizonY, plane);
  drawSun(ctx, palette, plane);
  drawSea(ctx, palette, horizonY);
  drawClouds(ctx, world, palette, cam);
  drawBirds(ctx, world, cam, plane.timeSec);
  drawIslands(ctx, world, palette, cam);
  drawRunway(ctx, world, palette, cam);
  drawRings(ctx, world, palette, cam);
  drawSpeedLines(ctx, plane);
  drawPlane(ctx, plane);
  drawTargetBeacon(ctx, world, plane, cam);
  drawHud(ctx, view, cam);
  drawOverlayPanels(ctx, view);
}

function drawSky(ctx, palette, horizonY, plane) {
  const g = ctx.createLinearGradient(0, 0, 0, horizonY);
  g.addColorStop(0, palette.skyTop);
  g.addColorStop(0.62, palette.skyMid);
  g.addColorStop(1, palette.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, horizonY + 1);
  // Kabut tipis di cakrawala supaya laut dan langit menyatu.
  const haze = ctx.createLinearGradient(0, horizonY - 60, 0, horizonY + 30);
  haze.addColorStop(0, 'rgba(255,255,255,0)');
  haze.addColorStop(1, 'rgba(255,255,255,0.35)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizonY - 60, W, 90);
}

function drawSun(ctx, palette, plane) {
  // Matahari mengikuti heading supaya selalu terlihat di depan.
  const sunX = W * 0.5 + Math.sin(plane.heading * 2.2) * W * 0.22 + 260;
  const sunY = 92;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 130);
  glow.addColorStop(0, palette.sun);
  glow.addColorStop(0.35, hexA(palette.sun, 0.55));
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 130, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
}

function drawSea(ctx, palette, horizonY) {
  const g = ctx.createLinearGradient(0, horizonY, 0, H);
  g.addColorStop(0, palette.seaTop);
  g.addColorStop(1, palette.seaLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, horizonY, W, H - horizonY);
  // Kilau matahari di air: garis-garis pendek acak tapi stabil.
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const y = horizonY + 14 + ((i * 53) % 260);
    const x = W / 2 + ((i * 173) % 700) - 350;
    const len = 26 + ((i * 37) % 60);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
}

function drawClouds(ctx, world, palette, cam) {
  for (const cloud of world.clouds) {
    const p = projectPoint(cloud.x, cloud.y, cloud.z, cam);
    if (!p || p.depth > WORLD.drawDistance || p.depth < 60) continue;
    const r = cloud.r * p.s;
    if (r < 3 || p.x < -120 || p.x > W + 120) continue;
    ctx.fillStyle = palette.cloud;
    for (let i = 0; i < cloud.puffs; i++) {
      const ox = (i - cloud.puffs / 2) * r * 0.9;
      const oy = Math.sin(i * 2.4) * r * 0.16;
      const pr = r * (0.55 + (i % 2) * 0.22);
      ctx.beginPath();
      ctx.ellipse(p.x + ox, p.y + oy, pr, pr * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBirds(ctx, world, cam, timeSec) {
  ctx.strokeStyle = 'rgba(30,30,40,0.75)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const bird of world.birds) {
    const bx = bird.x + Math.sin(timeSec * 0.7 + bird.phase) * 24;
    const by = bird.y + Math.sin(timeSec * 1.3 + bird.phase) * 4;
    const bz = bird.z + ((timeSec * bird.speed) % 400);
    const p = projectPoint(bx, by, bz, cam);
    if (!p || p.depth > 1500 || p.depth < 60) continue;
    const s = Math.max(2, 9 * p.s);
    const flap = Math.sin(timeSec * 9 + bird.phase) * s * 0.45;
    ctx.beginPath();
    ctx.moveTo(p.x - s, p.y + flap);
    ctx.quadraticCurveTo(p.x - s * 0.4, p.y - s * 0.3, p.x, p.y);
    ctx.quadraticCurveTo(p.x + s * 0.4, p.y - s * 0.3, p.x + s, p.y + flap);
    ctx.stroke();
  }
}

function drawIslands(ctx, world, palette, cam) {
  const all = [...world.islands, world.runwayIsland];
  // Jauh dulu supaya pulau dekat menimpa yang jauh.
  const visible = [];
  for (const island of all) {
    const p = projectPoint(island.x, 0, island.z, cam);
    // Pulau yang sudah di bawah/di samping kamera memenuhi layar
    // (radius proyeksi meledak saat depth kecil) — jangan digambar.
    if (!p || p.depth > WORLD.drawDistance || p.depth < 160) continue;
    visible.push({ island, p });
  }
  visible.sort((a, b) => b.p.depth - a.p.depth);
  for (const { island, p } of visible) {
    const rx = island.r * p.s;
    const ry = rx * 0.30;
    if (rx < 2 || p.x < -rx - 60 || p.x > W + rx + 60) continue;
    // Pasir, lalu rumput, lalu pepohonan/rumah.
    ctx.fillStyle = palette.islandSand;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.islandGreen;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - ry * 0.22, rx * 0.82, ry * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.islandDark;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - ry * 0.30, rx * 0.5, ry * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const spot of island.spots) {
      const sx = island.x + spot.dx * island.r * 0.8;
      const sz = island.z + spot.dz * island.r * 0.8;
      const sp = projectPoint(sx, 2, sz, cam);
      // Pohon/rumah di tepi pulau bisa jauh lebih dekat dari pusatnya.
      if (!sp || sp.depth < 90) continue;
      const size = Math.max(1.5, 7 * sp.s);
      if (spot.kind === 'tree') drawTree(ctx, sp.x, sp.y, size, palette);
      else drawHouse(ctx, sp.x, sp.y, size, palette);
    }
    // Nama pulau bila cukup besar di layar.
    if (rx > 60) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(island.name, p.x, p.y - ry - 8);
    }
  }
}

function drawTree(ctx, x, y, size, palette) {
  ctx.fillStyle = palette.islandDark;
  ctx.beginPath();
  ctx.moveTo(x, y - size * 1.6);
  ctx.lineTo(x - size * 0.7, y);
  ctx.lineTo(x + size * 0.7, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6b4a2b';
  ctx.fillRect(x - size * 0.12, y, size * 0.24, size * 0.7);
}

function drawHouse(ctx, x, y, size, palette) {
  ctx.fillStyle = '#f5efe0';
  ctx.fillRect(x - size * 0.7, y - size * 0.6, size * 1.4, size * 0.9);
  ctx.fillStyle = '#c65a3a';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.9, y - size * 0.6);
  ctx.lineTo(x, y - size * 1.3);
  ctx.lineTo(x + size * 0.9, y - size * 0.6);
  ctx.closePath();
  ctx.fill();
}

function drawRunway(ctx, world, palette, cam) {
  const rw = world.runway;
  const z0 = rw.z;
  const z1 = rw.z + PLANE.runwayLength;
  const corners = [
    projectPoint(rw.x - PLANE.runwayHalfWidth, 0.6, z0, cam),
    projectPoint(rw.x + PLANE.runwayHalfWidth, 0.6, z0, cam),
    projectPoint(rw.x + PLANE.runwayHalfWidth, 0.6, z1, cam),
    projectPoint(rw.x - PLANE.runwayHalfWidth, 0.6, z1, cam),
  ];
  if (corners.some((c) => !c)) return;
  ctx.fillStyle = '#2e3238';
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (const c of corners.slice(1)) ctx.lineTo(c.x, c.y);
  ctx.closePath();
  ctx.fill();
  // Garis tengah putus-putus + marka ambang.
  ctx.fillStyle = '#f8f8f0';
  for (let z = z0 + 15; z < z1 - 10; z += 30) {
    const a = projectPoint(rw.x - 1, 0.9, z, cam);
    const b = projectPoint(rw.x + 1, 0.9, z + 14, cam);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x, b.y + Math.max(1, 2 * b.s));
    ctx.lineTo(a.x, a.y + Math.max(1, 2 * a.s));
    ctx.closePath();
    ctx.fill();
  }
  // Lampu runway: titik oranye di kedua sisi, menyala.
  ctx.fillStyle = '#ffb02e';
  for (let z = z0 + 10; z <= z1; z += 40) {
    for (const side of [-1, 1]) {
      const p = projectPoint(rw.x + side * (PLANE.runwayHalfWidth + 3), 1, z, cam);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1.5, 3.5 * p.s), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Label runway di ujung dekat.
  const label = projectPoint(rw.x, 2, z0 + 8, cam);
  if (label && label.depth < 900) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RUNWAY 07 — PULAU KARANG', label.x, label.y - 14);
  }
}

function drawRings(ctx, world, palette, cam) {
  const rings = [...world.rings].sort((a, b) => b.z - a.z);
  for (const ring of rings) {
    const p = projectPoint(ring.x, ring.y, ring.z, cam);
    if (!p || p.depth > WORLD.drawDistance) continue;
    const r = RING.radius * p.s;
    if (r < 2) continue;
    const isNext = !ring.passed && world.rings.find((x) => !x.passed) === ring;
    ctx.save();
    ctx.globalAlpha = ring.passed ? 0.35 : 1;
    if (isNext) {
      ctx.shadowColor = palette.ringGlow;
      ctx.shadowBlur = 26;
    }
    ctx.strokeStyle = ring.passed ? '#7ed07e' : palette.ring;
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.94, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = ring.passed ? '#4d8a52' : '#ffffff';
    ctx.lineWidth = Math.max(1, r * 0.045);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 0.78, r * 0.73, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Nomor ring di tengah.
    ctx.fillStyle = ring.passed ? '#4d8a52' : '#ffffff';
    ctx.font = `700 ${Math.max(11, r * 0.5)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ring.passed ? '✓' : String(ring.index + 1), p.x, p.y);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }
}

function drawSpeedLines(ctx, plane) {
  if (plane.speed < 55) return;
  const n = Math.floor((plane.speed - 55) / 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    const y = 60 + ((i * 97 + plane.z * 3) % 640);
    const x = i % 2 === 0 ? 30 + ((i * 61) % 120) : W - 30 - ((i * 61) % 120);
    const len = 30 + plane.speed * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + len);
    ctx.stroke();
  }
}

// Pesawat kurir "Camar-7" dari belakang: badan meruncing ke depan,
// sayap lebar, ekor, baling-baling kabur, lampu navigasi.
function drawPlane(ctx, plane) {
  const cx = W / 2;
  const cy = H * 0.60 + Math.sin(plane.timeSec * 2.1) * 2;
  const scale = 1.0 + plane.speed * 0.0012;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(plane.roll * 0.9);
  ctx.scale(scale, scale);
  // Bayangan di air/darat di bawah pesawat.
  // Baling-baling: cakram kabur di ujung depan (atas gambar).
  const propSpin = (plane.timeSec * 40) % (Math.PI * 2);
  ctx.fillStyle = 'rgba(220,225,230,0.30)';
  ctx.beginPath();
  ctx.ellipse(0, -78, 26, 8, propSpin * 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Sayap utama.
  ctx.fillStyle = '#e8b13c';
  ctx.beginPath();
  ctx.moveTo(-14, -52);
  ctx.lineTo(-118, -34);
  ctx.lineTo(-112, -18);
  ctx.lineTo(-12, -30);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, -52);
  ctx.lineTo(118, -34);
  ctx.lineTo(112, -18);
  ctx.lineTo(12, -30);
  ctx.closePath();
  ctx.fill();
  // Ujung sayap + lampu navigasi.
  ctx.fillStyle = '#c62828';
  ctx.beginPath();
  ctx.arc(-114, -26, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2e7d32';
  ctx.beginPath();
  ctx.arc(114, -26, 5, 0, Math.PI * 2);
  ctx.fill();
  // Badan: meruncing ke depan.
  const body = ctx.createLinearGradient(0, 46, 0, -84);
  body.addColorStop(0, '#f7f3ea');
  body.addColorStop(0.6, '#e8b13c');
  body.addColorStop(1, '#d18f1f');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-15, 44);
  ctx.quadraticCurveTo(-19, -10, -9, -80);
  ctx.lineTo(9, -80);
  ctx.quadraticCurveTo(19, -10, 15, 44);
  ctx.quadraticCurveTo(0, 52, -15, 44);
  ctx.closePath();
  ctx.fill();
  // Garis badan + kode registrasi.
  ctx.strokeStyle = 'rgba(120,70,10,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -78);
  ctx.lineTo(0, 42);
  ctx.stroke();
  ctx.fillStyle = '#5a3a08';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PK-LCT', 0, 30);
  // Ekor horizontal + sirip vertikal.
  ctx.fillStyle = '#e8b13c';
  ctx.beginPath();
  ctx.moveTo(-10, 38);
  ctx.lineTo(-46, 52);
  ctx.lineTo(-44, 62);
  ctx.lineTo(-8, 50);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, 38);
  ctx.lineTo(46, 52);
  ctx.lineTo(44, 62);
  ctx.lineTo(8, 50);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c62828';
  ctx.beginPath();
  ctx.moveTo(-7, 40);
  ctx.lineTo(0, 2);
  ctx.lineTo(7, 40);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Panah penunjuk ke target berikutnya bila target di luar layar.
function drawTargetBeacon(ctx, world, plane, cam) {
  const target = nextTarget(world);
  if (!target) return;
  const p = projectPoint(target.x, target.y, target.z, cam);
  const dist = Math.max(0, Math.round(target.z - plane.z));
  if (p && p.x > 90 && p.x < W - 90 && p.y > 90 && p.y < H - 140) {
    // Target terlihat: label jarak di atasnya.
    ctx.fillStyle = 'rgba(10,20,30,0.65)';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${target.kind === 'ring' ? 'RING ' + (target.index + 1) : 'RUNWAY'} — ${dist} m`, p.x, p.y - (target.kind === 'ring' ? RING.radius * p.s + 12 : 24));
    return;
  }
  // Di luar layar: panah di tepi.
  let ax = p ? p.x : W / 2;
  let ay = p ? p.y : 120;
  ax = Math.max(70, Math.min(W - 70, ax));
  ay = Math.max(110, Math.min(H - 180, ay));
  const angle = Math.atan2((p ? p.y : 120) - ay, (p ? p.x : W / 2) - ax);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(angle);
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, -11);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 11);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${target.kind === 'ring' ? 'RING ' + (target.index + 1) : 'RUNWAY'} ${dist} m`, ax, ay + 26);
}

function nextTarget(world) {
  const ring = world.rings.find((r) => !r.passed);
  if (ring) return { x: ring.x, y: ring.y, z: ring.z, kind: 'ring', index: ring.index };
  return { x: world.runway.x, y: 8, z: world.runway.z + 140, kind: 'runway', index: -1 };
}

// ---------------- HUD ----------------

function panel(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(8,18,28,${alpha ?? 0.62})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawHud(ctx, view, cam) {
  const { plane, world } = view;
  const mission = world.mission;
  const speedKmh = Math.round(plane.speed * 3.6);
  const headingDeg = ((Math.round((-plane.heading * 180) / Math.PI) % 360) + 360) % 360;

  // Kompas pita di atas tengah.
  drawCompassTape(ctx, headingDeg);
  // Kotak ALT / SPD / HDG.
  hudBox(ctx, 24, 24, 150, 'ALT', `${Math.round(plane.y)} m`, plane.y < 12 ? '#ffb02e' : '#ffffff');
  hudBox(ctx, 190, 24, 150, 'SPD', `${speedKmh} km/h`, plane.speed < PLANE.stallSpeed + 4 ? '#ff5a4e' : '#ffffff');
  hudBox(ctx, W - 190, 24, 166, 'HDG', `${String(headingDeg).padStart(3, '0')}°`, '#ffffff');
  hudBox(ctx, W - 356, 24, 150, 'SKOR', String(plane.score), '#ffd23e');

  // Kolom kiri: throttle, bahan bakar, damage.
  drawGauge(ctx, 24, 108, 150, 'THR', plane.throttle, '#7ec8f2');
  drawGauge(ctx, 24, 148, 150, 'FUEL', plane.fuel / 100, plane.fuel < 25 ? '#ff5a4e' : plane.fuel < 50 ? '#ffb02e' : '#7ed07e');
  drawGauge(ctx, 24, 188, 150, 'DMG', plane.damage / 100, plane.damage > 60 ? '#ff5a4e' : '#ffb02e');
  if (plane.engineOut) {
    ctx.fillStyle = '#ff5a4e';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚠ MESIN MATI — MELAYANG', 24, 236);
  }
  // Angin.
  const wind = plane.windNow ?? mission.wind;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`ANGIN ${Math.abs(wind).toFixed(0)} m/s ${wind >= 0 ? '→' : '←'}`, 24, 262);

  // Panel misi kanan atas.
  drawMissionPanel(ctx, view, headingDeg);
  // Peta jalur bawah kiri + indikator sikap bawah kanan.
  drawProgressStrip(ctx, view);
  drawAttitude(ctx, plane);
  // Pesan tengah.
  if (view.message && view.messageUntil > performance.now()) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (view.messageUntil - performance.now()) / 400);
    ctx.fillStyle = 'rgba(8,18,28,0.72)';
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(view.message).width;
    ctx.beginPath();
    ctx.roundRect(W / 2 - tw / 2 - 22, 118, tw + 44, 46, 10);
    ctx.fill();
    ctx.fillStyle = view.messageColor || '#ffffff';
    ctx.fillText(view.message, W / 2, 150);
    ctx.restore();
  }
  // Hint kontrol (memudar setelah 14 detik bermain).
  if (view.showHints && plane.timeSec < 14 && view.mode === 'playing') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← → / A D belok · ↑ ↓ / W S naik-turun · Shift/Ctrl throttle · Mouse = stick · R ulang · M suara', W / 2, H - 16);
  }
}

function hudBox(ctx, x, y, w, label, value, color) {
  panel(ctx, x, y, w, 58);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 12, y + 18);
  ctx.fillStyle = color;
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText(value, x + 12, y + 46);
}

function drawGauge(ctx, x, y, w, label, frac, color) {
  panel(ctx, x, y, w, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 10, y + 19);
  const bx = x + 52;
  const bw = w - 62;
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.roundRect(bx, y + 9, bw, 12, 6);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(bx, y + 9, Math.max(4, bw * Math.max(0, Math.min(1, frac))), 12, 6);
  ctx.fill();
}

function drawCompassTape(ctx, headingDeg) {
  const cx = W / 2;
  const tapeW = 460;
  panel(ctx, cx - tapeW / 2, 24, tapeW, 58);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - tapeW / 2, 24, tapeW, 58);
  ctx.clip();
  const pxPerDeg = 3.2;
  for (let d = -60; d <= 60; d += 5) {
    const deg = ((headingDeg + d) % 360 + 360) % 360;
    const x = cx + d * pxPerDeg;
    const major = deg % 45 === 0;
    ctx.strokeStyle = major ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 74);
    ctx.lineTo(x, major ? 56 : 64);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(compassLabel(deg), x, 48);
    }
  }
  ctx.restore();
  // Jarum tengah.
  ctx.fillStyle = '#ffb02e';
  ctx.beginPath();
  ctx.moveTo(cx, 78);
  ctx.lineTo(cx - 7, 66);
  ctx.lineTo(cx + 7, 66);
  ctx.closePath();
  ctx.fill();
}

function compassLabel(deg) {
  const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
  return names[deg] ?? String(deg).padStart(3, '0');
}

function drawMissionPanel(ctx, view, headingDeg) {
  const { plane, world } = view;
  const mission = world.mission;
  const x = W - 356;
  const y = 96;
  const rows = 2 + mission.rings.length;
  const h = 34 + rows * 22;
  panel(ctx, x, y, 332, h);
  ctx.fillStyle = '#ffd23e';
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`MISI ${mission.id} — ${mission.name}`, x + 14, y + 24);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '500 12px system-ui, sans-serif';
  ctx.fillText(mission.brief, x + 14, y + 42, 304);
  let ry = y + 64;
  world.rings.forEach((ring, i) => {
    ctx.fillStyle = ring.passed ? '#7ed07e' : '#ffffff';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(`${ring.passed ? '✓' : '○'} Ring ${i + 1} — ${ring.z} m`, x + 14, ry);
    ry += 20;
  });
  ctx.fillStyle = plane.landed ? '#7ed07e' : '#ffb02e';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText(`${plane.landed ? '✓' : '○'} Mendarat di Runway 07`, x + 14, ry);
  ry += 22;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(`Waktu ${formatTime(plane.timeSec)} · Ring ${plane.ringsPassed}/${world.rings.length}`, x + 14, ry);
}

function drawProgressStrip(ctx, view) {
  const { plane, world } = view;
  const x = 24;
  const y = H - 64;
  const w = 420;
  panel(ctx, x, y, w, 40);
  const total = world.runway.z + PLANE.runwayLength;
  const px = (z) => x + 12 + (z / total) * (w - 24);
  // Garis rute.
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px(0), y + 20);
  ctx.lineTo(px(total), y + 20);
  ctx.stroke();
  // Runway.
  ctx.fillStyle = '#ffb02e';
  ctx.fillRect(px(world.runway.z) - 2, y + 12, 8, 16);
  // Ring.
  for (const ring of world.rings) {
    ctx.fillStyle = ring.passed ? '#7ed07e' : '#ff7a1a';
    ctx.beginPath();
    ctx.arc(px(ring.z), y + 20, ring.passed ? 4 : 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pesawat.
  const planeX = px(Math.max(0, Math.min(total, plane.z)));
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(planeX, y + 8);
  ctx.lineTo(planeX - 6, y + 26);
  ctx.lineTo(planeX + 6, y + 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RUTE', x + 12, y + 8 + 2);
  ctx.textAlign = 'right';
  ctx.fillText('RUNWAY 07', x + w - 12, y + 8 + 2);
  ctx.textAlign = 'left';
}

function drawAttitude(ctx, plane) {
  const cx = W - 90;
  const cy = H - 92;
  const r = 52;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#7ec8f2';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.translate(cx, cy);
  ctx.rotate(-plane.roll);
  ctx.translate(0, plane.verticalSpeed * 1.6);
  ctx.fillStyle = '#3e7d44';
  ctx.fillRect(-r, 0, r * 2, r * 2);
  ctx.fillStyle = '#bfe6f7';
  ctx.fillRect(-r, -r, r * 2, r);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Simbol pesawat tetap di tengah.
  ctx.fillStyle = '#ffb02e';
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy);
  ctx.lineTo(cx + 16, cy);
  ctx.lineTo(cx, cy + 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SIKAP', cx, cy + r + 14);
}

function drawOverlayPanels(ctx, view) {
  const { plane, mode } = view;
  if (mode === 'attract') {
    // Judul kecil di atas gameplay yang sedang berjalan (bukan title screen).
    ctx.fillStyle = 'rgba(8,18,28,0.66)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 250, H - 130, 500, 62, 10);
    ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LANGIT COURIER', W / 2, H - 104);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText('Tekan tombol apa pun / klik untuk terbang — 1/2/3 ganti misi', W / 2, H - 82);
    return;
  }
  if (mode === 'landed' || mode === 'crashed') {
    ctx.fillStyle = 'rgba(6,14,22,0.55)';
    ctx.fillRect(0, 0, W, H);
    const ok = mode === 'landed';
    panel(ctx, W / 2 - 260, H / 2 - 130, 520, 260, 0.92);
    ctx.fillStyle = ok ? '#7ed07e' : '#ff5a4e';
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ok ? (plane.earlyLanding ? 'SELAMAT — TAPI RING BELUM HABIS' : 'MISI SELESAI!') : 'CAMAR-7 JATUH', W / 2, H / 2 - 82);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 15px system-ui, sans-serif';
    if (ok) {
      ctx.fillText(`Skor ${plane.score} · Ring ${plane.ringsPassed}/${view.world.rings.length} · Waktu ${formatTime(plane.timeSec)}`, W / 2, H / 2 - 44);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '500 14px system-ui, sans-serif';
      ctx.fillText('Parsel terkirim, Camar-7 parkir rapi di Runway 07.', W / 2, H / 2 - 16);
    } else {
      ctx.fillText(plane.crashReason, W / 2, H / 2 - 44);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '500 14px system-ui, sans-serif';
      ctx.fillText(`Skor ${plane.score} · Ring ${plane.ringsPassed}/${view.world.rings.length}`, W / 2, H / 2 - 16);
    }
    ctx.fillStyle = '#ffd23e';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText('Tekan R untuk terbang lagi · 1/2/3 ganti misi', W / 2, H / 2 + 34);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '500 13px system-ui, sans-serif';
    ctx.fillText('Langit Courier — pesawat kurir Camar-7, Kepulauan Langit', W / 2, H / 2 + 62);
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function hexA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
