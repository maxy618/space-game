// Scan-reveal probe: teleport 90 km from the planet, scan, report reveal.
window.__scanProbe = async function () {
  const g = window.__game;
  const t = window.__teleport;
  document.getElementById('radarButton').click();
  await new Promise(r => setTimeout(r, 300));
  const st = g();
  const p = st.planets[0];
  const ang = Math.atan2(st.ship.y - p.y, st.ship.x - p.x);
  t(p.x + Math.cos(ang) * 90000, p.y + Math.sin(ang) * 90000);
  const cdBefore = g().scan.cooldown;
  document.getElementById('scanButton').click();
  await new Promise(r => setTimeout(r, 500));
  const st2 = g();
  return JSON.stringify({
    cdBefore: Math.round(cdBefore * 10) / 10,
    scannedAfter: st2.scannedCount,
    waveActive: st2.scan.waveAge >= 0,
    cdAfter: Math.round(st2.scan.cooldown * 10) / 10,
  });
};
