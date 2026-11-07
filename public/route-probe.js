// Route probe v2: clean run — pick planet, start pilot, sample, NO map click.
window.__routeProbe = async function () {
  const g = window.__game;
  const st = g();
  const pid = st.planets[0] ? st.planets[0].id : null;
  if (pid === null) return JSON.stringify({ err: 'no planets' });
  window.__routeSetTarget(pid);
  window.__routeStart();
  await new Promise(r => setTimeout(r, 5000));
  const s1 = g();
  return JSON.stringify({
    route: s1.route,
    vel: Math.round(Math.hypot(s1.ship.vx, s1.ship.vy)),
    apClass: document.getElementById('autoPilotButton').className,
    oldAuto: (document.getElementById('autopilotText')?.textContent ?? '').slice(0, 30),
  });
};
