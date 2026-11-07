// ram-route probe: park near asteroid[0], nose on the rock, full thrust 6 s,
// measure rAF frame times + warning activity. Returns compact JSON.
(() => {
  const norm = a => { while (a > Math.PI) a -= 2*Math.PI; while (a < -Math.PI) a += 2*Math.PI; return a; };
  const key = (c, on) => window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code: c }));
  return async () => {
    const g = window.__game;
    const ast = g().asteroids[0];
    key('KeyW', true);
    const dts = [];
    let last = performance.now();
    const t0 = last;
    let impactTicks = 0;
    let sawWarning = false;
    while (performance.now() - t0 < 6000) {
      await new Promise(r => requestAnimationFrame(r));
      const s = g().ship;
      const target = Math.atan2(ast.y - s.y, ast.x - s.x);
      const err = norm(target - s.angle);
      key('KeyD', err > 0.08);
      key('KeyA', err < -0.08);
      const n = performance.now();
      dts.push(n - last);
      last = n;
      if (g().impact) { sawWarning = true; impactTicks++; }
    }
    key('KeyW', false);
    key('KeyD', false);
    key('KeyA', false);
    dts.sort((a, b) => a - b);
    const p50 = dts[Math.floor(dts.length * 0.5)];
    const p95 = dts[Math.floor(dts.length * 0.95)];
    const fin = g();
    let minSurf = 1e9;
    for (const a of fin.asteroids) {
      const s = Math.hypot(a.x - fin.ship.x, a.y - fin.ship.y) - a.radius;
      if (s < minSurf) minSurf = s;
    }
    return JSON.stringify({
      fpsP50: Math.round(1000 / p50),
      fpsP95: Math.round(1000 / p95),
      minSurfDist: Math.round(minSurf),
      stuckOnRock: minSurf < 80,
      sawWarning,
      warningTicks: impactTicks,
    });
  };
})()
