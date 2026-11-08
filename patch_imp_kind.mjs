import fs from 'node:fs';
let p = 'src/app/MainActivity15.ts';
let s = fs.readFileSync(p, 'utf8');

function kindOf(b: any): string {
  if (b === universe.star) return "star";
  if (b instanceof Asteroid) return "asteroid";
  return "planet";
}

// 1. new-threat assignment
const a1 = `            universe.impactThreat = {
                x: bestBody.pos.x, y: bestBody.pos.y,
                radius: bestBody.radius,
                tti: bestTti, level: bestLevel,
            };`;
if (!s.includes(a1)) { console.log('a1 missing'); process.exit(1); }
s = s.replace(a1, `            universe.impactThreat = {
                x: bestBody.pos.x, y: bestBody.pos.y,
                radius: bestBody.radius,
                tti: bestTti, level: bestLevel,
                kind: kindOf(bestBody) as "star" | "planet" | "asteroid",
                vx: bestBody.velocity.x, vy: bestBody.velocity.y, body: bestBody,
            };`);
// 2. latched assignment
const a2 = `                universe.impactThreat = {
                    x: b.pos.x, y: b.pos.y,
                    radius: b.radius,
                    tti, level,
                };`;
if (!s.includes(a2)) { console.log('a2 missing'); process.exit(1); }
s = s.replace(a2, `                universe.impactThreat = {
                    x: b.pos.x, y: b.pos.y,
                    radius: b.radius,
                    tti, level,
                    kind: kindOf(b) as "star" | "planet" | "asteroid",
                    vx: b.velocity.x, vy: b.velocity.y, body: b,
                };`);

fs.writeFileSync(p, s);
console.log('impact kind ok');
