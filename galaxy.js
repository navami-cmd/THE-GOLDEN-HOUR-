(() => {
  const c = document.getElementById("galaxy"), x = c.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w, h, dpr, cx, cy, maxR, mx = 0, my = 0, px = 0, py = 0, t = 0, last = 0;
  let stars = [], ribbons = [], shooters = [];

  function setup() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr;
    c.style.width = w + "px"; c.style.height = h + "px";
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w * .62; cy = h * .42; maxR = Math.hypot(w, h) * .8;
    const n = Math.min(340, Math.floor(w * h / 4500));
    stars = Array.from({ length: n }, () => {
      const z = .2 + Math.random() * .8;
      return { a: Math.random() * 6.283, r: Math.pow(Math.random(), .7) * maxR, z,
        size: z * 1.7 + .2, tw: Math.random() * 6.283, ts: .6 + Math.random() * 1.6,
        col: `hsl(${36 + Math.random() * 16},${70 + Math.random() * 30}%,${68 + Math.random() * 25}%)` };
    });
    ribbons = Array.from({ length: 7 }, (_, i) => ({
      y: h * (.08 + i * .13), amp: 40 + Math.random() * 80, f: .0014 + Math.random() * .002,
      ph: Math.random() * 6, sp: .00012 + Math.random() * .0002, lines: 6,
      gap: 5 + Math.random() * 4, alpha: .06 + Math.random() * .1
    }));
  }

  function frame(now) {
    const dt = Math.min(50, now - last || 16); last = now; t += dt;
    px += (mx - px) * .04; py += (my - py) * .04;
    x.globalCompositeOperation = "source-over";
    x.fillStyle = "#050403"; x.fillRect(0, 0, w, h);

    // nebula glows
    const glows = [[.25, .3, "#6b4509"], [.8, .7, "#8a5a0c"], [.55, .1, "#4a300a"]];
    glows.forEach(([gx, gy, col], i) => {
      const X = w * gx + Math.sin(t * .00007 * (i + 1) + i) * 90 - px * 25;
      const Y = h * gy + Math.cos(t * .00006 * (i + 2)) * 70 - py * 25;
      const g = x.createRadialGradient(X, Y, 0, X, Y, Math.max(w, h) * .5);
      g.addColorStop(0, col + "55"); g.addColorStop(1, "#05040300");
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });

    x.globalCompositeOperation = "lighter";

    // flowing smoke ribbons
    ribbons.forEach(r => {
      for (let l = 0; l < r.lines; l++) {
        x.beginPath();
        for (let xx = -20; xx <= w + 20; xx += 14) {
          const y = r.y + Math.sin(xx * r.f + t * r.sp + r.ph) * r.amp
            + Math.sin(xx * r.f * 2.3 - t * r.sp * 1.4 + r.ph * 2) * r.amp * .35
            + l * r.gap * (1 + Math.sin(xx * .004 + r.ph) * .6) - py * 14;
          xx === -20 ? x.moveTo(xx, y) : x.lineTo(xx, y);
        }
        x.strokeStyle = `rgba(226,176,80,${r.alpha * (1 - l / r.lines * .6)})`;
        x.lineWidth = 1; x.stroke();
      }
    });

    // gold dust that slowly orbits
    stars.forEach(s => {
      s.a += .00005 * (1.4 - s.r / maxR) * dt * .06 * 16;
      const X = cx + Math.cos(s.a) * s.r - px * s.z * 40;
      const Y = cy + Math.sin(s.a) * s.r * .62 - py * s.z * 40;
      if (X < -5 || X > w + 5 || Y < -5 || Y > h + 5) return;
      x.globalAlpha = .25 + .75 * Math.abs(Math.sin(t * .001 * s.ts + s.tw));
      x.fillStyle = s.col;
      x.beginPath(); x.arc(X, Y, s.size, 0, 6.283); x.fill();
    });
    x.globalAlpha = 1;

    // shooting stars
    if (Math.random() < .004 && shooters.length < 2)
      shooters.push({ x: w * (.4 + Math.random() * .6), y: -10, vx: -6 - Math.random() * 4, vy: 3 + Math.random() * 2, life: 1 });
    shooters = shooters.filter(s => s.life > 0);
    shooters.forEach(s => {
      s.x += s.vx; s.y += s.vy; s.life -= .012;
      const g = x.createLinearGradient(s.x, s.y, s.x - s.vx * 14, s.y - s.vy * 14);
      g.addColorStop(0, `rgba(255,232,160,${s.life})`); g.addColorStop(1, "rgba(255,200,90,0)");
      x.strokeStyle = g; x.lineWidth = 2;
      x.beginPath(); x.moveTo(s.x, s.y); x.lineTo(s.x - s.vx * 14, s.y - s.vy * 14); x.stroke();
    });

    if (!reduce && !document.hidden) requestAnimationFrame(frame);
  }

  addEventListener("mousemove", e => { mx = e.clientX / w - .5; my = e.clientY / h - .5; });
  addEventListener("resize", setup);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !reduce) requestAnimationFrame(frame); });
  setup(); requestAnimationFrame(frame);
})();