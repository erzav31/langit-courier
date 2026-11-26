// Langit Courier — input.js
// Keyboard + mouse. Satu sumber kebenaran untuk semua kontrol:
// panah/WASD (belok + naik/turun), Shift/Ctrl (throttle),
// mouse sebagai stick (geser = belok, naik/turun), roda mouse = throttle.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    roll: 0, // -1..1, dari keyboard atau mouse
    pitch: 0, // -1..1, positif = naik
    throttleDelta: 0, // per detik
    brake: false,
    mouseActive: false,
    mouseX: 0.5, // 0..1 posisi mouse di canvas
    mouseY: 0.5,
    anyKey: false, // tombol apa pun ditekan (untuk keluar dari attract)
    clicked: false,
  };

  function updateDerived() {
    let roll = 0;
    let pitch = 0;
    let throttleDelta = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) roll -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) roll += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) pitch += 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) pitch -= 1;
    if (keys.has('ShiftLeft') || keys.has('ShiftRight')) throttleDelta += 1;
    if (keys.has('ControlLeft') || keys.has('ControlRight')) throttleDelta -= 1;
    if (keys.has('Equal') || keys.has('NumpadAdd')) throttleDelta += 1;
    if (keys.has('Minus') || keys.has('NumpadSubtract')) throttleDelta -= 1;
    // Mouse sebagai stick: hanya bila mouse bergerak baru-baru ini.
    if (state.mouseActive) {
      const mx = (state.mouseX - 0.5) * 2;
      const my = (state.mouseY - 0.5) * 2;
      if (Math.abs(mx) > 0.08) roll += clamp(mx, -1, 1);
      if (Math.abs(my) > 0.08) pitch -= clamp(my, -1, 1);
    }
    state.roll = clamp(roll, -1, 1);
    state.pitch = clamp(pitch, -1, 1);
    state.throttleDelta = clamp(throttleDelta, -1, 1) * 0.55;
    state.brake = keys.has('Space');
  }

  function onKeyDown(e) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    keys.add(e.code);
    state.anyKey = true;
    updateDerived();
  }

  function onKeyUp(e) {
    keys.delete(e.code);
    updateDerived();
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = (e.clientX - rect.left) / rect.width;
    state.mouseY = (e.clientY - rect.top) / rect.height;
    state.mouseActive = true;
    state.mouseLastMove = performance.now();
    updateDerived();
  }

  function onMouseDown() {
    state.clicked = true;
    state.anyKey = true;
  }

  function onWheel(e) {
    e.preventDefault();
    state.throttleDelta = clamp(-Math.sign(e.deltaY) * 0.8, -1, 1);
    state.wheelAt = performance.now();
    updateDerived();
    state.throttleDelta = clamp(-Math.sign(e.deltaY) * 0.8, -1, 1);
  }

  function onBlur() {
    keys.clear();
    updateDerived();
  }

  // Mouse stick kedaluwarsa setelah 2,5 detik diam: kembali ke keyboard.
  function tick() {
    if (state.mouseActive && performance.now() - (state.mouseLastMove || 0) > 2500) {
      state.mouseActive = false;
      updateDerived();
    }
    if (state.wheelAt && performance.now() - state.wheelAt > 120) {
      state.wheelAt = 0;
      updateDerived();
    }
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  state.tick = tick;
  state.consumeClick = () => {
    const c = state.clicked;
    state.clicked = false;
    return c;
  };
  state.consumeAnyKey = () => {
    const k = state.anyKey;
    state.anyKey = false;
    return k;
  };
  state.pressed = (code) => keys.has(code);
  return state;
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}
