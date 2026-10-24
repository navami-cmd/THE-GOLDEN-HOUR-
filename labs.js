/* Golden Hour Labs: Film Constellation, Night Planner and a time-of-day rail.
   Uses helpers from script.js (api, state, apply, openMovie, MOODS ...). */
(() => {
  const lab = $("#lab");
  const NAMES = { 28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 53: "Thriller", 10752: "War", 37: "Western" };
  let raf = 0, cleanup = null, cs = null;
  const rt = m => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
  const litem = m => `<button class="open litem" data-open="${m.id}"><div class="pw">${pimg(m, "w185")}</div><span>${esc(m.title)}</span></button>`;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const goGrid = () => { closeLab(); $("#grid").scrollIntoView({ behavior: "smooth" }); };

  function openLab(title, sub, body, onClose) {
    closeLab(true);
    lab.innerHTML = `<div class="lhead"><div><h2 class="gold-text">${title}</h2><p>${sub}</p></div><button data-labclose>Close</button></div><div class="lbody">${body}</div>`;
    lab.scrollTop = 0; lab.classList.add("show"); document.body.classList.add("lock"); cleanup = onClose || null;
  }
  function closeLab(keepLock) {
    cancelAnimationFrame(raf); if (cleanup) { cleanup(); cleanup = null; } cs = null;
    lab.classList.remove("show"); if (!keepLock) document.body.classList.remove("lock");
  }

  /* ---------- FILM CONSTELLATION ---------- */
  async function constellation(id) {
    id = id || heroList[state.hero]?.id || heroList[0]?.id;
    if (!id) return toast("Add your TMDB key first");
    const TAU = Math.PI * 2, dpr = Math.min(devicePixelRatio || 1, 2), trail = [];
    let nodes = [], pause = false, last = performance.now(), lens = "similar", cur = null, busy = 0, W = 0, H = 0, acc = "#a88a58", fr = 0;
    openLab("Film Constellation", "Films orbit the one in the centre. Click any to travel there, or change how they connect.", `
      <div class="cs-top"><div class="trail" id="trail"></div><div class="cs-search"><input id="csq" placeholder="Start from any film..." autocomplete="off"><div id="csr" class="csr"></div></div></div>
      <div class="cs-lens"><div class="seg"><button class="on" data-lens="similar">Similar films</button><button data-lens="director">Same director</button><button data-lens="actor">Lead actor</button></div><span id="lenslabel" class="muted"></span></div>
      <div class="stage-c" id="cstage"><canvas class="cscan" id="cscan"></canvas><div class="core" id="core"></div></div>
      <div class="cs-info" id="csinfo"></div>`, () => cancelAnimationFrame(raf));
    lab.classList.add("themed");
    const stage = $("#cstage"), cv = $("#cscan"), g = cv.getContext("2d");
    stage.onpointerover = e => pause = !!e.target.closest(".cnode"); stage.onpointerleave = () => pause = false;

    // what the orbiting films are, depending on the chosen lens
    const listFor = async m => {
      const norm = a => { const seen = new Set(); return a.filter(r => r.poster_path && r.id !== m.id && !seen.has(r.id) && seen.add(r.id)); };
      const person = async (p, pick, label) => {
        if (!p) return { list: [], label: "Nothing listed for this film" };
        try { const c = await api(`/person/${p.id}/movie_credits`); return { list: norm(pick(c).sort((a, b) => b.vote_count - a.vote_count)), label: label(p.name) }; }
        catch (e) { return { list: [], label: "Couldn't load that" }; }
      };
      if (lens === "director") return person((m.credits?.crew || []).find(c => c.job === "Director"), c => (c.crew || []).filter(x => x.job === "Director"), n => `More films directed by ${n}`);
      if (lens === "actor") return person((m.credits?.cast || [])[0], c => c.cast || [], n => `More films with ${n}`);
      let list = norm(m.recommendations?.results || []);
      if (list.length < 10) { try { list = norm(list.concat((await api(`/movie/${m.id}/similar`)).results || [])); } catch (e) {} }
      return { list, label: "Films viewers also enjoyed. Brighter lines share more genres." };
    };
    const build = async () => {
      if (!cur) return; const mine = ++busy;
      const { list, label } = await listFor(cur); if (mine !== busy) return;
      const items = list.slice(0, 16); items.forEach(remember);
      $("#lenslabel").textContent = items.length ? label : label + ". Nothing to orbit here.";
      stage.querySelectorAll(".cnode").forEach(n => n.remove());
      const base = new Set((cur.genres || []).map(x => String(x.id))), inner = Math.min(8, items.length);
      nodes = items.map((r, i) => {
        const isIn = i < 8, count = isIn ? inner : items.length - 8, idx = isIn ? i : i - 8;
        const shared = (r.genre_ids || []).map(String).filter(x => base.has(x));
        const el = document.createElement("button"); el.className = "cnode"; el.dataset.go = r.id; el.setAttribute("aria-label", r.title);
        el.innerHTML = `<div style="--d:${i * .04}s"><img src="${IMG}w154${r.poster_path}" alt=""><span><b>${esc(r.title)}</b>${year(r)} &middot; ★ ${(r.vote_average || 0).toFixed(1)}${shared.length ? `<em>Shares ${shared.slice(0, 3).map(x => NAMES[x]).filter(Boolean).join(", ")}</em>` : ""}</span></div>`;
        stage.appendChild(el);
        return { el, a: idx / count * TAU + (isIn ? 0 : .4), ring: isIn ? 1 : 2, sp: isIn ? .16 : -.1, s: isIn ? 1 : .78, w: shared.length };
      });
    };
    const drawTrail = () => $("#trail").innerHTML = trail.map((t, i) => `<button data-tr="${i}" class="${i === trail.length - 1 ? "on" : ""}">${esc(t.title)}</button>`).join("<i>&rsaquo;</i>");
    const travel = async (mid, push = true) => {
      let m; try { m = await api(`/movie/${mid}`, { append_to_response: "credits,recommendations" }); } catch (e) { return toast("Couldn't load that film"); }
      remember(m); cur = m; if (push) { trail.push({ id: m.id, title: m.title }); if (trail.length > 8) trail.shift(); }
      palette(m.poster_path).then(p => applyTint(lab, p));
      $("#core").innerHTML = `<button data-open="${m.id}" aria-label="Open ${esc(m.title)}"><div class="pw">${pimg(m, "w185")}</div></button>`;
      $("#csinfo").innerHTML = `<h3 class="gold-text">${esc(m.title)}</h3><p>${year(m)}${m.runtime ? ` &middot; ${rt(m.runtime)}` : ""} &middot; ★ ${m.vote_average.toFixed(1)}</p>
        <div class="btns"><button class="primary" data-open="${m.id}">Open details</button><button class="savebtn ${inVault(m.id) ? "on" : ""}" data-save="${m.id}"><span class="h"></span> Vault</button></div>`;
      drawTrail(); build();
    };
    cs = { travel, back: i => { trail.length = i + 1; travel(trail[i].id, false); }, setLens: l => { lens = l; $$("[data-lens]").forEach(b => b.classList.toggle("on", b.dataset.lens === l)); build(); } };

    const loop = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const w = stage.clientWidth, h = stage.clientHeight;
      if (w !== W || h !== H) { W = w; H = h; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); }
      if (fr++ % 20 === 0) acc = getComputedStyle(lab).getPropertyValue("--a2").trim() || acc;
      const R1 = Math.min(W * .24, H * .36), R2 = Math.min(W * .45, R1 * 1.75), cx = W / 2, cy = H / 2;
      g.clearRect(0, 0, W, H); g.strokeStyle = acc; g.fillStyle = acc;
      for (let i = 1; i <= 4; i++) { g.globalAlpha = .05; g.beginPath(); g.arc(cx, cy, 36 + i * 24, 0, TAU); g.fill(); }
      g.setLineDash([4, 7]); g.lineWidth = 1; g.globalAlpha = .3;
      [R1, R2].forEach(R => { g.beginPath(); g.ellipse(cx, cy, R, R * .8, 0, 0, TAU); g.stroke(); }); g.setLineDash([]);
      nodes.forEach(n => {
        if (!pause) n.a += dt * n.sp;
        const R = n.ring === 1 ? R1 : R2, x = Math.cos(n.a) * R, y = Math.sin(n.a) * R * .8, d = (Math.sin(n.a) + 1) / 2;
        n.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${n.s * (.84 + .26 * d)})`;
        n.el.style.zIndex = Math.round(d * 10); n.el.style.opacity = .55 + .45 * d;
        g.globalAlpha = .08 + .3 * d; g.lineWidth = .6 + n.w * .7; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + x, cy + y); g.stroke();
      });
      g.globalAlpha = 1;
      if (lab.classList.contains("show")) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    let st; $("#csq").oninput = e => {
      clearTimeout(st); const v = e.target.value.trim(); if (v.length < 2) { $("#csr").innerHTML = ""; return; }
      st = setTimeout(async () => { try { $("#csr").innerHTML = (await api("/search/movie", { query: v })).results.filter(m => m.poster_path).slice(0, 5).map(m => `<button data-go="${m.id}"><img src="${IMG}w92${m.poster_path}" alt=""><span>${esc(m.title)} (${year(m)})</span></button>`).join(""); } catch (e) {} }, 300);
    };
    travel(id);
  }

  /* ---------- 4. NIGHT PLANNER ---------- */
  function nightPlanner() {
    let films = [], spare = [], n = 2;
    openLab("Night Planner", "Pick a start time and a vibe. We build a double feature, scheduled to the minute.", `
      <div class="np-ctl">
        <label>Start time<input type="time" id="npt" value="20:00"></label>
        <label>Films<span class="seg" id="npn"><button class="on" data-n="2">2</button><button data-n="3">3</button></span></label>
        <label>Vibe<select id="npm"><option value="">Surprise me</option>${MOODS.map(m => `<option value="${m.id}">${m.name}</option>`).join("")}</select></label>
        <button class="primary" id="npgo">Build my night</button>
      </div><div id="npout"></div>`);
    const out = $("#npout"), clock = min => new Date(2000, 0, 1, 0, min).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const schedule = () => {
      const [h, mi] = $("#npt").value.split(":").map(Number); let t = (h || 0) * 60 + (mi || 0); const rows = [];
      films.forEach((f, i) => { rows.push({ f, i, at: t }); t += f.runtime; if (i < films.length - 1) { rows.push({ brk: true, at: t }); t += 15; } });
      return { rows, end: t, total: films.reduce((a, f) => a + f.runtime, 0) };
    };
    const render = () => {
      const s = schedule();
      out.innerHTML = `<div class="tix">${s.rows.map(r => r.brk
        ? `<div class="brk">Intermission, 15 minutes (${clock(r.at)})</div>`
        : `<article class="ticket"><div class="tt"><small>FILM ${r.i + 1} OF ${films.length}</small><b>${clock(r.at)}</b></div>
            <div class="tmid">${r.f.poster_path ? `<img src="${IMG}w154${r.f.poster_path}" alt="">` : ""}<div><h4>${esc(r.f.title)}</h4>
            <p>${year(r.f)} &middot; ${rt(r.f.runtime)} &middot; ★ ${r.f.vote_average.toFixed(1)}</p><p>${(r.f.genres || []).slice(0, 3).map(g => esc(g.name)).join(", ")}</p>
            <div class="btns"><button data-open="${r.f.id}">Details</button><button data-swap="${r.i}">Swap film</button></div></div></div></article>`).join("")}
        <div class="brk end">Lights up at ${clock(s.end)}${s.end >= 1440 ? " (after midnight)" : ""}. ${rt(s.total)} of cinema.</div>
        <div class="btns"><button id="npcopy">Copy plan</button><button id="npagain">Shuffle the night</button></div></div>`;
      $("#npcopy").onclick = () => { navigator.clipboard?.writeText(`My Golden Hour night\n` + s.rows.filter(r => !r.brk).map(r => `${clock(r.at)}  ${r.f.title} (${rt(r.f.runtime)})`).join("\n") + `\nLights up at ${clock(s.end)}`); toast("Plan copied"); };
      $("#npagain").onclick = build;
    };
    async function build() {
      out.innerHTML = `<p class="muted">Picking films...</p>`;
      const mood = MOODS.find(m => m.id === $("#npm").value);
      const p = { sort_by: "popularity.desc", include_adult: "false", "vote_count.gte": 500, "vote_average.gte": mood ? mood.min : 6.5, page: 1 + Math.floor(Math.random() * 4) };
      if (mood) p.with_genres = mood.g.join("|");
      try {
        const pool = shuffle(((await api("/discover/movie", p)).results || []).filter(m => m.poster_path)).slice(0, n + 5);
        const det = (await Promise.all(pool.map(m => api(`/movie/${m.id}`).catch(() => null)))).filter(m => m && m.runtime > 60 && m.runtime <= 185);
        det.forEach(remember); films = det.slice(0, n); spare = det.slice(n);
        if (!films.length) throw 0; render();
      } catch (e) { out.innerHTML = `<p class="muted">Couldn't build a night. Check your API key and try again.</p>`; }
    }
    $("#npn").onclick = e => { const b = e.target.closest("[data-n]"); if (!b) return; n = +b.dataset.n; $$("#npn button").forEach(x => x.classList.toggle("on", x === b)); };
    $("#npt").onchange = () => films.length && render();
    $("#npgo").onclick = build;
    out.onclick = e => {
      const b = e.target.closest("[data-swap]"); if (!b) return;
      if (!spare.length) return toast("No spare films. Shuffle the night instead.");
      const i = +b.dataset.swap, old = films[i]; films[i] = spare.shift(); spare.push(old); render();
    };
    build();
  }

  /* ---------- 5. FOR THIS HOUR ---------- */
  async function hourRail() {
    const now = new Date(), h = now.getHours(), day = now.toLocaleDateString([], { weekday: "long" });
    const [part, g, min] = h >= 5 && h < 12 ? ["morning", "35|10751|16|12", 6.5] : h < 17 ? ["afternoon", "12|14|10751|35", 6.5] : h < 21 ? ["evening", "18|10749|35|36", 6.8] : ["night", "53|27|878|9648|80", 6.5];
    try {
      const d = await api("/discover/movie", { with_genres: g, sort_by: "popularity.desc", "vote_count.gte": 400, "vote_average.gte": min, include_adult: "false", page: 1 + now.getDate() % 3 });
      const list = (d.results || []).filter(m => m.poster_path).slice(0, 14); list.forEach(remember); if (!list.length) return;
      $("#hour").innerHTML = `<section class="rail"><div class="rhead"><h2 class="gold-text">For a ${day} ${part}</h2><span>
        <button class="rbtn" data-rdir="-1" data-rid="hour" aria-label="Scroll left">&lsaquo;</button><button class="rbtn" data-rdir="1" data-rid="hour" aria-label="Scroll right">&rsaquo;</button></span></div>
        <p class="picks-sub">It's ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. A selection that suits the hour, refreshed daily.</p>
        <div class="rrow" id="rail-hour">${list.map(ritem).join("")}</div></section>`;
    } catch (e) {}
  }

  /* ---------- wiring ---------- */
  const LABS = { constel: () => constellation(), night: nightPlanner };
  document.addEventListener("click", e => {
    const q = s => e.target.closest(s);
    if (q("[data-labclose]")) return closeLab();
    if (q("[data-lab]")) return LABS[q("[data-lab]").dataset.lab]();
    if (q("[data-constel]")) { $("#modal").close(); return constellation(+q("[data-constel]").dataset.constel); }
    if (q("[data-go]") && cs) { $("#csr").innerHTML = ""; return cs.travel(+q("[data-go]").dataset.go); }
    if (q("[data-tr]") && cs) return cs.back(+q("[data-tr]").dataset.tr);
    if (q("[data-lens]") && cs) return cs.setLens(q("[data-lens]").dataset.lens);
  });
  addEventListener("keydown", e => { if (e.key === "Escape" && lab.classList.contains("show") && !$("#modal").open) closeLab(); });
  hourRail();
})();
