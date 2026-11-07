// Ram-probe v3: grind test — nose 72° off the surface normal (outside the
// π/4 landing cone) so the ship IMPACTS and grinds, not lands. Result →
// window.__probeResult. Leaves thrust held OFF at the end.
window.__runRamProbe = async function () {
  const g = window.__game;
  const t = window.__teleport;
  const key = (c, on) => window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code: c }));
  let target = null, bd = 1e18;
  for (const a of g().asteroids) {
    const d = Math.hypot(a.x - g().ship.x, a.y - g().ship.y) - a.radius;
    if (d < bd) { bd = d; target = a; }
  }
  const st = g().ship;
  const surfAngle = Math.atan2(st.y - target.y, st.x - target.x);
  // place on surface, nose 72° off the outward normal → impact grind
  t(target.x + Math.cos(surfAngle) * (target.radius + 20), target.y + Math.sin(surfAngle) * (target.radius + 20), surfAngle + Math.PI * 0.6);
  key('KeyW', true);
  const dts = [];
  let last = performance.now();
  const t0 = last;
  let ramTicks = 0, sawWarning = false;
  while (performance.now() - t0 < 6000) {
    await new Promise(r => requestAnimationFrame(r));
    const n = performance.now();
    dts.push(n - last);
    last = n;
    if (g().impact) { sawWarning = true; ramTicks++; }
  }
  key('KeyW', false);
  dts.sort((a, b) => a - b);
  const res = {
    contactFrames: dts.length,
    fpsP50: dts.length ? Math.round(1000 / dts[Math.floor(dts.length * 0.5)]) : null,
    fpsP95: dts.length ? Math.round(1000 / dts[Math.floor(dts.length * 0.95)]) : null,
    sawWarning,
    warningTicks: ramTicks,
  };
  window.__probeResult = JSON.stringify(res);
  return window.__probeResult;
};
