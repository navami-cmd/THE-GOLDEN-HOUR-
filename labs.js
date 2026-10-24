/* Golden Hour Labs: four unusual ways to find a film + a time-of-day rail.
   Uses helpers from script.js (api, state, apply, openMovie, MOODS ...). */
(() => {
  const lab = $("#lab");
  const NAMES = { 28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 53: "Thriller", 10752: "War", 37: "Western" };
  // each genre's place on the map: [dark(-1) to bright(+1), calm(-1) to intense(+1)]
  const GPOS = { 28: [.15, .85], 12: [.55, .5], 16: [.75, -.3], 35: [.85, -.1], 80: [-.7, .35], 99: [0, -.75], 18: [-.35, -.5], 10751: [.9, -.55], 14: [.35, .1], 36: [-.15, -.6], 27: [-.9, .85], 10402: [.55, -.55], 9648: [-.55, .15], 10749: [.5, -.7], 878: [-.05, .55], 53: [-.6, .75], 10752: [-.8, .55], 37: [-.1, .25] };
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

  /* ---------- 1. MOOD MAP ---------- */
  function moodMap() {
    let px = .2, py = .3, top = [], tmr, drag = false;
    openLab("Mood Map", "Drag the marker. Left is dark, right is bright, up is intense, down is calm.", `
      <div class="mm">
        <div class="mm-map" id="mmap"><span class="ax t">Intense</span><span class="ax b">Calm</span><span class="ax l">Dark</span><span class="ax r">Bright</span>
          ${Object.entries(GPOS).map(([id, [x, y]]) => `<i class="gdot ${x > .45 ? "rt" : ""}" data-g="${id}" style="left:${(x + 1) * 50}%;top:${(1 - y) * 50}%"><b>${NAMES[id]}</b></i>`).join("")}
          <div class="mm-pin" id="mpin"></div></div>
        <div class="mm-side"><h3 id="mmlabel"></h3><div id="mmchips" class="chips"></div>
          <button class="primary" id="mmuse" style="margin-top:14px">Use these as filters</button><div id="mmfilms" class="lrow"></div></div>
      </div>`);
    const map = $("#mmap");
    const update = load => {
      $("#mpin").style.left = (px + 1) * 50 + "%"; $("#mpin").style.top = (1 - py) * 50 + "%";
      const ws = Object.entries(GPOS).map(([id, [x, y]]) => [id, Math.exp(-((x - px) ** 2 + (y - py) ** 2) / .16)]).sort((a, b) => b[1] - a[1]);
      top = ws.slice(0, 3).map(w => w[0]);
      $$(".gdot").forEach(d => { d.style.setProperty("--w", ws.find(w => w[0] === d.dataset.g)[1].toFixed(2)); d.classList.toggle("hot", top.includes(d.dataset.g)); });
      $("#mmlabel").textContent = `${px < 0 ? "Dark" : "Bright"} and ${py > 0 ? "intense" : "gentle"}`;
      $("#mmchips").innerHTML = top.map(id => `<button class="on" tabindex="-1">${NAMES[id]}</button>`).join("");
      clearTimeout(tmr); if (load) tmr = setTimeout(films, 350);
    };
    async function films() {
      try {
        const d = await api("/discover/movie", { with_genres: top.join("|"), sort_by: "popularity.desc", "vote_count.gte": 300, "vote_average.gte": 6.3, include_adult: "false" });
        const l = (d.results || []).filter(m => m.poster_path).slice(0, 14); l.forEach(remember); $("#mmfilms").innerHTML = l.map(litem).join("");
      } catch (e) { $("#mmfilms").innerHTML = `<p class="muted">Couldn't load films.</p>`; }
    }
    const move = e => { const r = map.getBoundingClientRect(); px = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1)); py = Math.max(-1, Math.min(1, 1 - (e.clientY - r.top) / r.height * 2)); update(false); };
    map.addEventListener("pointerdown", e => { map.setPointerCapture(e.pointerId); drag = true; move(e); });
    map.addEventListener("pointermove", e => { if (drag) move(e); });
    map.addEventListener("pointerup", () => { drag = false; update(true); });
    $("#mmuse").onclick = () => { state.genres = [...top]; state.gmode = "any"; state.mood = ""; apply(); goGrid(); };
    update(true);
  }

  /* ---------- 2. TIME MACHINE (spin the record) ---------- */
  function timeMachine() {
    const Y0 = 1920, Y1 = new Date().getFullYear(), SPAN = 720; // two full turns cover every year
    let ang = (2000 - Y0) / (Y1 - Y0) * SPAN, mode = "vote_average.desc", tmr, drag = false, lastA = 0;
    openLab("Time Machine", "Spin the record to travel through the years. Drag it, scroll over it, or use the arrow keys.", `
      <div class="tm">
        <div class="dial" id="dial"><div class="disc" id="disc"><span class="ticks"></span></div>
          <div class="dlabel"><small>YEAR</small><b id="dyear"></b><em id="ddec"></em></div></div>
        <div class="decs">${[1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020].map(d => `<button data-dec="${d}">${d}s</button>`).join("")}</div>
        <div class="seg"><button class="on" data-tmode="vote_average.desc">Top rated</button><button data-tmode="popularity.desc">Most popular</button></div>
        <h3 id="tmhead"></h3><div id="tmfilms" class="lrow"></div>
        <button class="primary" id="tmall">See every film from this year</button>
      </div>`);
    const dial = $("#dial"), disc = $("#disc");
    const year = () => Math.round(Y0 + ang / SPAN * (Y1 - Y0));
    const set = (a, snap) => {
      ang = Math.max(0, Math.min(SPAN, a));
      disc.style.transition = snap ? "transform .7s cubic-bezier(.2,.8,.2,1)" : "none"; disc.style.transform = `rotate(${ang}deg)`;
      const y = year(); $("#dyear").textContent = y; $("#ddec").textContent = `${Math.floor(y / 10) * 10}s`;
      clearTimeout(tmr); tmr = setTimeout(load, 380);
    };
    async function load() {
      const y = year(); $("#tmhead").textContent = `${mode === "vote_average.desc" ? "Best of" : "Most popular in"} ${y}`;
      try {
        const d = await api("/discover/movie", { primary_release_year: y, sort_by: mode, "vote_count.gte": mode === "vote_average.desc" ? (y < 1970 ? 80 : 250) : 5, include_adult: "false" });
        const l = (d.results || []).filter(m => m.poster_path).slice(0, 16); l.forEach(remember);
        $("#tmfilms").innerHTML = l.length ? l.map(litem).join("") : `<p class="muted">No films found for ${y}.</p>`;
      } catch (e) { $("#tmfilms").innerHTML = `<p class="muted">Couldn't load films.</p>`; }
    }
    const pa = e => { const r = dial.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
    dial.addEventListener("pointerdown", e => { dial.setPointerCapture(e.pointerId); drag = true; lastA = pa(e); });
    dial.addEventListener("pointermove", e => { if (!drag) return; const a = pa(e); let d = a - lastA; if (d > 180) d -= 360; if (d < -180) d += 360; lastA = a; set(ang + d); });
    dial.addEventListener("pointerup", () => drag = false);
    const step = SPAN / (Y1 - Y0);
    dial.addEventListener("wheel", e => { e.preventDefault(); set(ang + Math.sign(e.deltaY) * step); }, { passive: false });
    const key = e => {
      if (!lab.classList.contains("show")) return; const k = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") set(ang + step * k); if (e.key === "ArrowLeft" || e.key === "ArrowDown") set(ang - step * k);
    };
    addEventListener("keydown", key); cleanup = () => removeEventListener("keydown", key);
    lab.querySelector(".decs").onclick = e => { const b = e.target.closest("[data-dec]"); if (b) set((+b.dataset.dec - Y0) / (Y1 - Y0) * SPAN, true); };
    lab.querySelector(".seg").onclick = e => { const b = e.target.closest("[data-tmode]"); if (!b) return; mode = b.dataset.tmode; $$("[data-tmode]").forEach(x => x.classList.toggle("on", x === b)); load(); };
    $("#tmall").onclick = () => { state.yf = state.yt = String(year()); state.mood = ""; apply(); goGrid(); };
    set(ang);
  }

  /* ---------- 3. FILM CONSTELLATION ---------- */
  async function constellation(id) {
    id = id || heroList[state.hero]?.id || heroList[0]?.id;
    if (!id) return toast("Add your TMDB key first");
    const trail = []; let nodes = [], pause = false, last = performance.now();
    openLab("Film Constellation", "Every orbiting film is similar to the one in the centre. Click one to travel to it.", `
      <div class="cs-top"><div class="trail" id="trail"></div><div class="cs-search"><input id="csq" placeholder="Start from any film..." autocomplete="off"><div id="csr" class="csr"></div></div></div>
      <div class="stage-c" id="cstage"><i class="orb" id="o1"></i><i class="orb" id="o2"></i><div class="core" id="core"></div></div>
      <div class="cs-info" id="csinfo"></div>`, () => cancelAnimationFrame(raf));
    lab.classList.add("themed");
    const stage = $("#cstage");
    stage.onpointerover = e => pause = !!e.target.closest(".cnode"); stage.onpointerleave = () => pause = false;

    const drawTrail = () => $("#trail").innerHTML = trail.map((t, i) => `<button data-tr="${i}" class="${i === trail.length - 1 ? "on" : ""}">${esc(t.title)}</button>`).join("<i>&rsaquo;</i>");
    const render = (m, list) => {
      const W = stage.clientWidth, H = stage.clientHeight, R1 = Math.min(W * .24, H * .36), R2 = Math.min(W * .45, R1 * 1.75);
      stage.querySelectorAll(".cnode").forEach(n => n.remove());
      [["o1", R1], ["o2", R2]].forEach(([i, R]) => { const o = $("#" + i); o.style.width = R * 2 + "px"; o.style.height = R * 1.6 + "px"; });
      $("#core").innerHTML = `<div class="pw">${pimg(m, "w185")}</div>`;
      const inner = Math.min(8, list.length);
      nodes = list.map((r, i) => {
        const isIn = i < 8, count = isIn ? inner : list.length - 8, idx = isIn ? i : i - 8;
        const el = document.createElement("button"); el.className = "cnode"; el.dataset.go = r.id; el.setAttribute("aria-label", r.title);
        el.innerHTML = `<div style="--d:${i * .04}s"><img src="${IMG}w154${r.poster_path}" alt=""><span>${esc(r.title)}</span></div>`; stage.appendChild(el);
        return { el, a: idx / count * Math.PI * 2 + (isIn ? 0 : .4), R: isIn ? R1 : R2, sp: isIn ? .18 : -.11, s: isIn ? 1 : .78 };
      });
      $("#csinfo").innerHTML = `<h3 class="gold-text">${esc(m.title)}</h3><p>${year(m)}${m.runtime ? ` &middot; ${rt(m.runtime)}` : ""} &middot; ★ ${m.vote_average.toFixed(1)}</p>
        <div class="btns"><button class="primary" data-open="${m.id}">Open details</button><button class="savebtn ${inVault(m.id) ? "on" : ""}" data-save="${m.id}"><span class="h"></span> Vault</button></div>`;
      drawTrail();
    };
    const travel = async (mid, push = true) => {
      let m, rec;
      try { [m, rec] = await Promise.all([api(`/movie/${mid}`), api(`/movie/${mid}/recommendations`)]); } catch (e) { return toast("Couldn't load that film"); }
      remember(m); if (push) { trail.push({ id: m.id, title: m.title }); if (trail.length > 8) trail.shift(); }
      palette(m.poster_path).then(p => applyTint(lab, p));
      let list = (rec.results || []).filter(r => r.poster_path && r.id !== m.id);
      if (list.length < 10) { try { (await api(`/movie/${mid}/similar`)).results.forEach(r => { if (r.poster_path && r.id !== m.id && !list.some(x => x.id === r.id)) list.push(r); }); } catch (e) {} }
      list = list.slice(0, 16); list.forEach(remember); render(m, list);
    };
    cs = { travel, back: i => { trail.length = i + 1; travel(trail[i].id, false); } };
    const loop = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      nodes.forEach(n => {
        if (!pause) n.a += dt * n.sp;
        const d = (Math.sin(n.a) + 1) / 2;
        n.el.style.transform = `translate(-50%,-50%) translate(${Math.cos(n.a) * n.R}px,${Math.sin(n.a) * n.R * .8}px) scale(${n.s * (.84 + .26 * d)})`;
        n.el.style.zIndex = Math.round(d * 10); n.el.style.opacity = .55 + .45 * d;
      });
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
  const LABS = { mood: moodMap, time: timeMachine, constel: () => constellation(), night: nightPlanner };
  document.addEventListener("click", e => {
    const q = s => e.target.closest(s);
    if (q("[data-labclose]")) return closeLab();
    if (q("[data-lab]")) return LABS[q("[data-lab]").dataset.lab]();
    if (q("[data-constel]")) { $("#modal").close(); return constellation(+q("[data-constel]").dataset.constel); }
    if (q("[data-go]") && cs) { $("#csr").innerHTML = ""; return cs.travel(+q("[data-go]").dataset.go); }
    if (q("[data-tr]") && cs) return cs.back(+q("[data-tr]").dataset.tr);
  });
  addEventListener("keydown", e => { if (e.key === "Escape" && lab.classList.contains("show") && !$("#modal").open) closeLab(); });
  hourRail();
})();
