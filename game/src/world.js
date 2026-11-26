// Langit Courier — world.js
// Membangun dunia misi: pulau-pulau latar, awan, burung, ring, dan runway.
// Semua posisi diturunkan dari seed misi, jadi dunia deterministik.

import { MISSIONS, WORLD } from './config.js';
import { makeRng, range, pick } from './rng.js';

const ISLAND_NAMES = [
  'Pulau Api', 'Pulau Lumba', 'Pulau Nyiur', 'Pulau Ombak',
  'Pulau Senja', 'Pulau Tiga', 'Pulau Burung', 'Pulau Pasir', 'Pulau Daun',
];

// Satu pulau latar: posisi, radius, jumlah pohon/rumah, dan nama.
function buildIsland(rng, z, name) {
  return {
    x: range(rng, -520, 520),
    z,
    r: range(rng, 55, 170),
    trees: Math.floor(range(rng, 4, 11)),
    houses: Math.floor(range(rng, 0, 4)),
    name,
    // Posisi pohon/rumah relatif terhadap pusat pulau, tetap saat digambar.
    spots: Array.from({ length: 12 }, () => ({
      dx: range(rng, -0.8, 0.8),
      dz: range(rng, -0.8, 0.8),
      kind: rng() < 0.72 ? 'tree' : 'house',
    })),
  };
}

export function buildWorld(missionIndex) {
  const mission = MISSIONS[missionIndex];
  const rng = makeRng(mission.seed);
  const usedNames = new Map();
  const uniqueName = () => {
    const base = pick(rng, ISLAND_NAMES);
    const count = (usedNames.get(base) ?? 0) + 1;
    usedNames.set(base, count);
    return count === 1 ? base : `${base} ${['II', 'III', 'IV'][count - 2] ?? count}`;
  };
  const islands = [];
  for (let i = 0; i < WORLD.islandCount; i++) {
    const z = 350 + i * ((WORLD.length - 400) / WORLD.islandCount) + range(rng, -90, 90);
    const island = buildIsland(rng, z, uniqueName());
    // Jangan taruh pulau latar menabrak jalur ring atau runway.
    const nearRing = mission.rings.some(
      (ring) => Math.abs(ring.z - z) < 160 && Math.abs(ring.x - island.x) < island.r + 60,
    );
    const nearRunway = Math.abs(mission.runway.z - z) < 420 && Math.abs(mission.runway.x - island.x) < 260;
    if (nearRing || nearRunway) continue;
    islands.push(island);
  }
  // Pulau runway: datar, besar, dengan strip landasan.
  const runwayIsland = {
    x: mission.runway.x,
    z: mission.runway.z + 140,
    r: 320,
    trees: 6,
    houses: 5,
    name: 'Pulau Karang',
    spots: Array.from({ length: 12 }, () => ({
      dx: range(rng, -0.9, 0.9),
      dz: range(rng, -0.9, 0.9),
      kind: rng() < 0.6 ? 'tree' : 'house',
    })),
  };
  // Awan: gumpalan di ketinggian 120–230 m, tersebar di sepanjang rute.
  const clouds = Array.from({ length: WORLD.cloudCount }, (_, i) => ({
    x: range(rng, -600, 600),
    y: range(rng, 120, 235),
    z: 200 + i * ((WORLD.length - 300) / WORLD.cloudCount) + range(rng, -120, 120),
    r: range(rng, 26, 70),
    puffs: Math.floor(range(rng, 3, 6)),
  }));
  // Burung camar: kawanan kecil yang melintas di depan pesawat.
  const birds = Array.from({ length: 9 }, (_, i) => ({
    x: range(rng, -260, 260),
    y: range(rng, 60, 160),
    z: 500 + i * 620 + range(rng, -100, 100),
    phase: range(rng, 0, Math.PI * 2),
    speed: range(rng, 4, 9),
  }));
  return {
    mission,
    missionIndex,
    islands,
    runwayIsland,
    clouds,
    birds,
    rings: mission.rings.map((ring, i) => ({ ...ring, index: i, passed: false })),
    runway: mission.runway,
  };
}

// Ring berikutnya yang belum dilewati; null kalau semua sudah.
export function nextRing(world) {
  return world.rings.find((ring) => !ring.passed) ?? null;
}

// Target navigasi saat ini: ring berikutnya, atau runway bila ring habis.
export function currentTarget(world) {
  const ring = nextRing(world);
  if (ring) return { x: ring.x, y: ring.y, z: ring.z, kind: 'ring', index: ring.index };
  return {
    x: world.runway.x,
    y: 30,
    z: world.runway.z + 140,
    kind: 'runway',
    index: -1,
  };
}
