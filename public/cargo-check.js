// count colored pixels near viewport center.
window.__cargoPixelCheck = function () {
  const cv = document.getElementById('canvasMain');
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const img = ctx.getImageData(W / 2 - 50, H / 2 - 80, 100, 160);
  let bright = 0, colored = 0, hue = 0;
  for (let p = 0; p < img.data.length; p += 4) {
    const r = img.data[p], g = img.data[p + 1], b = img.data[p + 2];
    if (r > 80 || g > 80 || b > 80) bright++;
    if ((r > 120 && g > 60 && b < 120 && Math.abs(r - g) > 35) || (b > 130 && g > 110 && r > 80 && b > r)) colored++;
    hue = hue * 31 + r + g * 7 + b * 13;
  }
  const g = window.__game();
  return JSON.stringify({ bright, colored, hue: hue % 100000, ship: [Math.round(g.ship.x), Math.round(g.ship.y)], cargo: [Math.round(g.cargo[0].x), Math.round(g.cargo[0].y)] });
};
