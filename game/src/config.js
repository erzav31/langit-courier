// Langit Courier — config.js
// Satu-satunya tempat angka tuning, misi, dan palet tinggal.
// Misi: antar parsel keliling kepulauan dengan pesawat kurir "Camar-7".

export const VIEW = { width: 1280, height: 800 };

export const PLANE = {
  minSpeed: 16, // m/s — di bawah ini pesawat stall
  maxSpeed: 78, // m/s — throttle penuh
  cruiseSpeed: 46, // m/s — kecepatan ekonomis
  accel: 7, // m/s^2 menuju kecepatan target
  maxBankDeg: 52, // derajat belok maksimum
  maxPitch: 14, // m/s laju naik/turun maksimum dari stick
  stallSpeed: 24, // m/s — di bawah ini kontrol melemah dan pesawat merosot
  fuelBurnPerSec: 1.05, // % bahan bakar per detik pada throttle penuh
  fuelBurnIdle: 0.12, // % per detik walau throttle kecil
  safeTouchdownSpeed: 55, // m/s — lebih cepat dari ini saat mendarat = rusak
  safeSinkRate: 7, // m/s — laju turun lebih besar dari ini saat mendarat = rusak
  runwayHalfWidth: 11, // m — setengah lebar runway
  runwayLength: 280, // m — panjang runway
};

export const RING = { radius: 16, score: 100 };

// Misi: tiap misi punya seed dunia sendiri (deterministik), daftar ring,
// runway, bahan bakar awal, angin, dan palet langit.
export const MISSIONS = [
  {
    id: 1,
    name: 'PARSEL PAGI',
    brief: 'Antar 5 parsel lewat ring, lalu mendarat di Pulau Karang.',
    seed: 1101,
    fuel: 100,
    wind: 2.5, // m/s dorongan lateral, positif = ke kanan
    gust: 0.6,
    palette: 'morning',
    rings: [
      { x: -40, y: 80, z: 700 },
      { x: 90, y: 110, z: 1500 },
      { x: -110, y: 95, z: 2300 },
      { x: 60, y: 130, z: 3100 },
      { x: -20, y: 100, z: 3900 },
    ],
    runway: { x: 0, z: 5000, headingDeg: 0 },
    timeBonus: 400,
  },
  {
    id: 2,
    name: 'ANGIN BADAI',
    brief: '6 ring melawan angin kencang. Hemat bahan bakar, jaga sayap tetap datar.',
    seed: 2202,
    fuel: 88,
    wind: 9.0,
    gust: 2.4,
    palette: 'storm',
    rings: [
      { x: 120, y: 90, z: 650 },
      { x: -140, y: 120, z: 1400 },
      { x: 40, y: 70, z: 2150 },
      { x: -90, y: 140, z: 2900 },
      { x: 130, y: 100, z: 3650 },
      { x: 0, y: 110, z: 4400 },
    ],
    runway: { x: -30, z: 5400, headingDeg: 0 },
    timeBonus: 600,
  },
  {
    id: 3,
    name: 'SURAT SENJA',
    brief: '7 ring di senja terakhir. Bahan bakar tipis — terbang ekonomis atau pulang berenang.',
    seed: 3303,
    fuel: 72,
    wind: 4.0,
    gust: 1.2,
    palette: 'dusk',
    rings: [
      { x: -60, y: 85, z: 600 },
      { x: 80, y: 120, z: 1250 },
      { x: -120, y: 95, z: 1900 },
      { x: 30, y: 135, z: 2550 },
      { x: -70, y: 80, z: 3200 },
      { x: 100, y: 115, z: 3850 },
      { x: -10, y: 100, z: 4500 },
    ],
    runway: { x: 20, z: 5400, headingDeg: 0 },
    timeBonus: 800,
  },
];

// Palet langit + laut per suasana. Satu gaya: cat air datar, garis bersih.
export const PALETTES = {
  morning: {
    skyTop: '#7ec8f2', skyMid: '#bfe6f7', skyLow: '#ffe9b8',
    seaTop: '#2e7fa8', seaLow: '#174a6b', sun: '#fff3c4',
    islandSand: '#e8d29a', islandGreen: '#5da85f', islandDark: '#3e7d44',
    cloud: 'rgba(255,255,255,0.92)', ring: '#ff7a1a', ringGlow: 'rgba(255,122,26,0.35)',
  },
  storm: {
    skyTop: '#5a6b7d', skyMid: '#8fa0ae', skyLow: '#d8c9a3',
    seaTop: '#2c4a5e', seaLow: '#16283a', sun: '#e8e0c8',
    islandSand: '#d9c48f', islandGreen: '#4d8a52', islandDark: '#35603a',
    cloud: 'rgba(230,232,235,0.95)', ring: '#ff9d00', ringGlow: 'rgba(255,157,0,0.35)',
  },
  dusk: {
    skyTop: '#2c2350', skyMid: '#7a4a7d', skyLow: '#ff9d5c',
    seaTop: '#3a2a63', seaLow: '#1c1440', sun: '#ffb36b',
    islandSand: '#c9a878', islandGreen: '#3f6b4f', islandDark: '#2c4e38',
    cloud: 'rgba(255,190,160,0.85)', ring: '#ffd23e', ringGlow: 'rgba(255,210,62,0.35)',
  },
};

export const WORLD = {
  length: 6000, // m — ujung dunia misi
  islandCount: 26, // pulau latar (di luar pulau runway)
  cloudCount: 22,
  focal: 620, // jarak fokus proyeksi pseudo-3D
  cameraBack: 16, // m — kamera di belakang pesawat
  cameraUp: 3.2, // m — kamera di atas pesawat
  drawDistance: 2600, // m — fitur lebih jauh dari ini tidak digambar
};

export const SCORE = { ring: 100, landing: 500, smoothLanding: 250, missionClear: 300 };
