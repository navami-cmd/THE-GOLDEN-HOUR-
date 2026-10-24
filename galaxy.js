// Moving golden galaxy: rotating spiral, drifting nebula, twinkling stars, floating gold dust, shooting stars
(() => {
  const c = document.getElementById("galaxy"), x = c.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;
  let w, h, dpr, cx, cy, R, mx = 0, my = 0, px = 0, py = 0, t = 0, last = 0;
  let disk = [], bg = [], dust = [], neb = [], shooters = [];

  const sprite = (r, g, b) => {
    const s = document.createElement("canvas"); s.width = s.height = 128;
    const q = s.getContext("2d"), gr = q.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(.3, `rgba(${r},${g},${b},.4)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    q.fillStyle = gr; q.fillRect(0, 0, 128, 128); return s;
  };
  const S = { gold: sprite(200, 171, 120), pale: sprite(237, 231, 221), amber: sprite(152, 124, 82), deep: sprite(83, 69, 48) };
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

  function setup() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr; c.style.width = w + "px"; c.style.height = h + "px";
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w * (w < 760 ? .5 : .66); cy = h * .46; R = Math.max(w, h) * .62;

    const N = w < 760 ? 900 : 2200, ARMS = 3;
    disk = Array.from({ length: N }, (_, i) => {
      const r = Math.pow(Math.random(), 1.5) * R + 6, arm = i % ARMS;
      const th = arm * TAU / ARMS + Math.log(1 + r / R * 9) * 2.7 + gauss() * (.5 - r / R * .25);
      const inner = 1 - r / R;
      return { r, th, om: 2.6e-3 / (r + 140) * 1.3, z: gauss() * 12,
        s: .6 + Math.random() * 1.5 + inner * .8, a: .3 + Math.random() * .7, tw: Math.random() * TAU, ts: .5 + Math.random() * 2,
        k: inner > .66 ? 0 : inner > .3 ? 1 : 2, big: Math.random() < .035 };
    });
    bg = Array.from({ length: w < 760 ? 120 : 260 }, () => ({ x: Math.random() * w, y: Math.random() * h, z: .2 + Math.random() * .8, tw: Math.random() * TAU, ts: .6 + Math.random() * 2, s: Math.random() * 1.2 + .3 }));
    dust = Array.from({ length: w < 760 ? 18 : 40 }, () => ({ x: Math.random() * w, y: Math.random() * h, s: 6 + Math.random() * 18, v: .12 + Math.random() * .3, sw: Math.random() * TAU, a: .06 + Math.random() * .16 }));
    neb = [[.15, .25, 1.1, "amber"], [.85, .75, 1.3, "deep"], [.5, .9, 1, "amber"], [.7, .1, .9, "deep"], [.3, .6, .8, "gold"]]
      .map(([nx, ny, sc, k], i) => ({ nx, ny, sc, k, ph: i * 1.7 }));
  }
  const col = ["#efeae2", "#c9b081", "#947c56"];

  function frame(now) {
    const dt = Math.min(48, now - last || 16); last = now; t += dt;
    px += (mx - px) * .05; py += (my - py) * .05;
    x.globalCompositeOperation = "source-over"; x.fillStyle = "#030202"; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = "lighter";

    // drifting nebula clouds
    neb.forEach(n => {
      const X = w * n.nx + Math.sin(t * .00008 + n.ph) * 120 - px * 40, Y = h * n.ny + Math.cos(t * .00006 + n.ph) * 90 - py * 40, d = Math.max(w, h) * .7 * n.sc;
      x.globalAlpha = .085 + .035 * Math.sin(t * .0003 + n.ph); x.drawImage(S[n.k], X - d / 2, Y - d / 2, d, d);
    });

    // background stars with parallax + twinkle
    bg.forEach(s => {
      s.x -= .006 * s.z * dt; if (s.x < -2) s.x = w + 2;
      x.globalAlpha = .2 + .8 * Math.abs(Math.sin(t * .0012 * s.ts + s.tw));
      x.fillStyle = "#e7e0d4"; x.fillRect(s.x - px * s.z * 30, s.y - py * s.z * 30, s.s, s.s);
    });

    // galaxy core glow
    const cg = R * .7, gx = cx - px * 18, gy = cy - py * 18;
    x.globalAlpha = .38 + .08 * Math.sin(t * .0008); x.drawImage(S.pale, gx - cg * .35, gy - cg * .22, cg * .7, cg * .44);
    x.globalAlpha = .3; x.drawImage(S.gold, gx - cg, gy - cg * .62, cg * 2, cg * 1.24);

    // spiral disk: differential rotation (inner spins faster)
    const phi = -.5 + Math.sin(t * .00004) * .05, cp = Math.cos(phi), sp = Math.sin(phi), sq = .46;
    for (let i = 0; i < disk.length; i++) {
      const p = disk[i]; p.th += p.om * dt;
      const ux = Math.cos(p.th) * p.r, uy = Math.sin(p.th) * p.r * sq + p.z;
      const X = gx + ux * cp - uy * sp, Y = gy + ux * sp + uy * cp;
      if (X < -30 || X > w + 30 || Y < -30 || Y > h + 30) continue;
      const a = p.a * (.55 + .45 * Math.sin(t * .0015 * p.ts + p.tw));
      if (p.big) { x.globalAlpha = a * .9; const d = 12 + p.s * 6; x.drawImage(S.pale, X - d / 2, Y - d / 2, d, d); }
      else { x.globalAlpha = a; x.fillStyle = col[p.k]; x.fillRect(X, Y, p.s, p.s); }
    }

    // floating gold bokeh dust
    dust.forEach(d => {
      d.y -= d.v * dt * .03; d.sw += dt * .0005; if (d.y < -30) { d.y = h + 30; d.x = Math.random() * w; }
      x.globalAlpha = d.a * (.6 + .4 * Math.sin(t * .001 + d.sw * 3));
      const X = d.x + Math.sin(d.sw) * 30 - px * 20; x.drawImage(S.gold, X - d.s, d.y - d.s, d.s * 2, d.s * 2);
    });

    // shooting stars
    if (Math.random() < .006 && shooters.length < 2) shooters.push({ x: w * (.3 + Math.random() * .7), y: -10, vx: -7 - Math.random() * 5, vy: 3.5 + Math.random() * 2, life: 1 });
    shooters = shooters.filter(s => s.life > 0);
    shooters.forEach(s => {
      s.x += s.vx * dt / 16; s.y += s.vy * dt / 16; s.life -= .011;
      const g = x.createLinearGradient(s.x, s.y, s.x - s.vx * 16, s.y - s.vy * 16);
      g.addColorStop(0, `rgba(236,230,218,${s.life})`); g.addColorStop(1, "rgba(205,177,123,0)");
      x.globalAlpha = 1; x.strokeStyle = g; x.lineWidth = 2; x.beginPath(); x.moveTo(s.x, s.y); x.lineTo(s.x - s.vx * 16, s.y - s.vy * 16); x.stroke();
    });
    x.globalAlpha = 1;
    if (!reduce && !document.hidden) requestAnimationFrame(frame);
  }

  addEventListener("pointermove", e => { mx = e.clientX / w - .5; my = e.clientY / h - .5; });
  addEventListener("resize", setup);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !reduce) { last = 0; requestAnimationFrame(frame); } });
  setup(); requestAnimationFrame(frame);
})();
