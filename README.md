# Langit Courier

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/erzav31/langit-courier/rank.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/erzav31/langit-courier/reward.svg)](https://make.fun/c/best-flight-game-20261126-0057)

Terbangkan pesawat kurir **Camar-7** keliling Kepulauan Langit: lewati ring
pengantar parsel, hemat bahan bakar melawan angin, lalu mendarat mulus di
**Runway 07, Pulau Karang**. Tiga misi dengan tujuan, angin, dan bahan bakar
yang berbeda — pagi, badai, dan senja.

## Main

Buka `game/index.html` di desktop Chrome (atau `node serve.ts`, lalu
http://localhost:8080). Tanpa instalasi, tanpa network — semua file statis
di bawah `game/`.

- **Keyboard:** `←`/`→` atau `A`/`D` belok, `↑`/`↓` atau `W`/`S` naik-turun,
  `Shift`/`Ctrl` throttle, `Space` rem udara, `1`/`2`/`3` ganti misi,
  `R` ulang, `M` suara.
- **Mouse:** gerakkan mouse sebagai stick, roda mouse = throttle, klik untuk
  mulai terbang.
- **Misi:** 5–7 ring per misi, lalu mendarat di runway. Mendarat sebelum
  semua ring = selamat tapi misi belum selesai. Bahan bakar habis = mesin
  mati, melayang. Pendaratan keras / di luar runway = Camar-7 jatuh.

## Struktur source

- `game/src/config.js` — angka tuning, 3 misi, palet langit.
- `game/src/rng.js` — random deterministik (mulberry32).
- `game/src/world.js` — pulau, awan, burung, ring, runway per misi.
- `game/src/physics.js` — model terbang: throttle, stall, belok, angin,
  ring, pendaratan, autopilot.
- `game/src/input.js` — keyboard + mouse.
- `game/src/audio.js` — suara mesin/lonceng/debuk via WebAudio, tanpa aset.
- `game/src/render.js` — pseudo-3D chase view + HUD (ALT/SPD/HDG, bahan
  bakar, throttle, damage, panel misi, peta rute, indikator sikap).
- `game/src/game.js` — state attract → playing → landed/crashed.
- `game/src/shots.js` — preset deterministik untuk screenshot.
- `game/src/main.js` — bootstrap + loop.
- `tests/flight.test.mjs` — 31 logic test (Node, tanpa browser).

## Lisensi

MIT — lihat `LICENSE`.
