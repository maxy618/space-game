// Grind-visual probe: repeatedly teleport onto the surface (nose 72° off
// normal) while thrusting, sample impact HUD, and leave the ship pressed
// against the rock with thrust ON so a screenshot catches sparks.
window.__grindVisual = async function () {
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
  key('KeyW', true);
  let hits = 0;
  for (let i = 0; i < 26; i++) {
    t(target.x + Math.cos(surfAngle) * (target.radius + 20), target.y + Math.sin(surfAngle) * (target.radius + 20), surfAngle + Math.PI * 0.6);
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    if (g().impact) hits++;
    if (i === 13) window.__grindShotMoment = true;
    await new Promise(r => setTimeout(r, 55));
  }
  // final press: leave the ship grinding, thrust on, warning active
  t(target.x + Math.cos(surfAngle) * (target.radius + 20), target.y + Math.sin(surfAngle) * (target.radius + 20), surfAngle + Math.PI * 0.6);
  key('KeyW', true);
  window.__grindHits = hits;
  return JSON.stringify({ impactHits: hits });
};
