import fs from 'node:fs';
let p = 'src/app/MainActivity15.ts';
let s = fs.readFileSync(p, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
// star evade: bias the dodge outward (away from the star center), not pure tangency
const old = [
  '            const vPerp = ship.velocity.x * px + ship.velocity.y * py;',
  '            const side = vPerp >= 0 ? 1 : -1;',
  '            if (safeMode === "brake-evade") {'].join(NL);
if (!s.includes(old)) { console.log('evade needle missing'); process.exit(1); }
s = s.replace(old, [
  '            const vPerp = ship.velocity.x * px + ship.velocity.y * py;',
  '            const side = vPerp >= 0 ? 1 : -1;',
  '            // star: actively carry the ship AWAY from the star (not just brake in place).',
  '            if (safeBodyKind === "star") {',
  '                const sx = ship.pos.x - universe.star.pos.x;',
  '                const sy = ship.pos.y - universe.star.pos.y;',
  '                const sl = Math.hypot(sx, sy) || 1;',
  '                const wx = px * side * 1.0 + (sx / sl) * 0.6;',
  '                const wy = py * side * 1.0 + (sy / sl) * 0.6;',
  '                want = Math.atan2(wy, wx);',
  '            } else if (safeMode === "brake-evade") {'].join(NL) + NL +
  '                // braker still evades slightly while straightening (mixed vector below)');
fs.writeFileSync(p, s);
console.log('ok');
