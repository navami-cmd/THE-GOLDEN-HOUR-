// 👇 PASTE YOUR TMDB API KEY (v3) HERE
const KEY = "3ecb15e92ff4f2224b44b19eb3eb8648";

const API = "https://api.themoviedb.org/3", IMG = "https://image.tmdb.org/t/p/", REGION = "IN"; // REGION = country for "where to watch"
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const api = (path, params = {}) =>
  fetch(`${API}${path}?${new URLSearchParams({ api_key: KEY, language: "en-US", ...params })}`)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });

const MOODS = [
  { id: "cozy", name: "Cozy night in", g: "35|10751|16", min: 6.8 },
  { id: "mind", name: "Mind-bending", g: "878|9648", min: 7 },
  { id: "edge", name: "Edge of my seat", g: "53|28", min: 6.8 },
  { id: "cry", name: "Cry it out", g: "18|10749", min: 7.5 },
  { id: "date", name: "Date night", g: "10749|35", min: 6.8 },
  { id: "epic", name: "Epic escape", g: "12|14|878", min: 7 },
  { id: "spooky", name: "Spooky hours", g: "27|9648", min: 6.2 },
  { id: "laugh", name: "Laugh out loud", g: "35", min: 6.8 }
];
const ERAS = [["", "Any era"], ["2020", "The 2020s"], ["2010", "The 2010s"], ["2000", "The 2000s"], ["1990", "The 1990s"], ["1980", "The 1980s"], ["1970", "The 1970s"], ["1960", "The 1960s"], ["1950", "The 1950s"]];

const state = { genre: "", mood: "", era: "", rt: "", lang: "", minr: 0, sort: "popularity.desc", q: "", page: 1, total: 1, loading: false, hero: 0 };
const GENRES = new Map(), cache = new Map();
let heroList = [], heroTimer, cardIndex = 0, token = 0;
let vault = []; try { vault = JSON.parse(localStorage.getItem("gh_vault") || "[]"); } catch (e) {}

/* ---------- small effects ---------- */
addEventListener("scroll", () => {
  $("#nav").classList.toggle("solid", scrollY > 60);
  const max = document.documentElement.scrollHeight - innerHeight;
  $("#progress").style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
});
addEventListener("pointermove", e => { if (e.pointerType === "mouse") $("#glow").style.transform = `translate(${e.clientX}px,${e.clientY}px)`; });
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 1800); }
const remember = m => cache.set(m.id, { id: m.id, title: m.title, poster_path: m.poster_path, vote_average: m.vote_average || 0, release_date: m.release_date });
const year = m => (m.release_date || "").slice(0, 4) || "TBA";

/* ---------- vault (watchlist) ---------- */
const inVault = id => vault.some(v => v.id == id);
function syncVault() {
  try { localStorage.setItem("gh_vault", JSON.stringify(vault)); } catch (e) {}
  $("#vaultCount").textContent = vault.length;
  $$("[data-save]").forEach(b => b.classList.toggle("on", inVault(b.dataset.save)));
  $("#vault").innerHTML = `<div class="vhead"><div><h3 class="gold-text">My vault</h3><small class="muted">${vault.length ? `${vault.length} films, avg ★ ${(vault.reduce((a, v) => a + v.vote_average, 0) / vault.length).toFixed(1)}` : ""}</small></div><button data-vclose>Close</button></div>` +
    (vault.length ? `<div class="vgrid">${vault.map(v => `<div class="vitem"><button class="open" data-open="${v.id}">
        <div class="pw">${v.poster_path ? `<img src="${IMG}w185${v.poster_path}" alt="${esc(v.title)}">` : ""}</div><span>${esc(v.title)}</span></button>
        <button class="x" data-save="${v.id}" aria-label="Remove">✕</button></div>`).join("")}</div>`
      : `<p class="empty">Nothing saved yet. Tap the heart on any film to keep it here.</p>`);
}
function toggleVault(id) {
  const m = cache.get(+id); if (!m) return;
  if (inVault(id)) { vault = vault.filter(v => v.id != id); toast("Removed from your vault"); }
  else { vault.unshift(m); toast("Saved to your vault"); }
  syncVault();
}

/* ---------- hero ---------- */
async function loadHero() {
  try {
    const d = await api("/trending/movie/week");
    heroList = (d.results || []).filter(m => m.backdrop_path).slice(0, 6);
    heroList.forEach(remember);
    loadRails(d.results);
    if (heroList.length) return showHero(0);
  } catch (e) {}
  $("#hero").innerHTML = `<div class="info"><h1 class="gold-text">Add your TMDB key</h1><p>Open script.js and paste your API key at the very top, then refresh.</p></div>`;
}
function showHero(i) {
  clearInterval(heroTimer); state.hero = i;
  const m = heroList[i], h = $("#hero");
  const old = h.querySelector(".bg"); if (old) { old.classList.add("out"); setTimeout(() => old.remove(), 1000); }
  const img = new Image(); img.className = "bg"; img.alt = ""; img.src = IMG + "w1280" + m.backdrop_path; h.prepend(img);
  h.querySelector(".info")?.remove(); h.querySelector(".dots")?.remove();
  h.insertAdjacentHTML("beforeend", `
    <div class="info">
      <div><span class="pill star">★ ${m.vote_average.toFixed(1)}</span><span class="pill">${year(m)}</span><span class="pill">Trending this week</span></div>
      <h1 class="gold-text">${esc(m.title)}</h1><p>${esc(m.overview)}</p>
      <div class="btns"><button class="primary" data-open="${m.id}">▶ Watch trailer</button><button data-open="${m.id}">More info</button>
      <button class="savebtn ${inVault(m.id) ? "on" : ""}" data-save="${m.id}"><span class="h"></span> Vault</button></div>
    </div>
    <div class="dots">${heroList.map((_, k) => `<i class="${k === i ? "on" : ""}" data-dot="${k}"></i>`).join("")}</div>`);
  heroTimer = setInterval(() => showHero((state.hero + 1) % heroList.length), 7000);
}

/* ---------- filters ---------- */
async function loadGenres() {
  try {
    const d = await api("/genre/movie/list");
    (d.genres || []).forEach(g => GENRES.set(String(g.id), g.name));
  } catch (e) {}
  drawChips();
}
function drawChips() {
  $("#moods").innerHTML = MOODS.map(m => `<button class="${state.mood === m.id ? "on" : ""}" data-mood="${m.id}">${m.name}</button>`).join("");
  $("#genres").innerHTML = [["", "All genres"], ...GENRES].map(([id, n]) => `<button class="${!state.mood && state.genre === id ? "on" : ""}" data-genre="${id}">${n}</button>`).join("");
}
$("#era").innerHTML = ERAS.map(([v, n]) => `<option value="${v}">${n}</option>`).join("");

function params(page) {
  const p = { page, sort_by: state.sort, include_adult: "false", "vote_count.gte": 40 };
  const m = MOODS.find(x => x.id === state.mood);
  const g = m ? m.g : state.genre; if (g) p.with_genres = g;
  if (m) { p["vote_average.gte"] = m.min; p["vote_count.gte"] = 300; }
  if (state.sort === "vote_average.desc") p["vote_count.gte"] = 500;
  const today = new Date().toISOString().slice(0, 10);
  if (state.era) { p["primary_release_date.gte"] = `${state.era}-01-01`; p["primary_release_date.lte"] = `${+state.era + 9}-12-31`; }
  else if (state.sort === "primary_release_date.desc") p["primary_release_date.lte"] = today;
  if (state.rt) p[`with_runtime.${state.rt.slice(0, 3)}`] = state.rt.slice(3);
  if (state.lang) p.with_original_language = state.lang;
  if (state.minr > 0) p["vote_average.gte"] = Math.max(+p["vote_average.gte"] || 0, state.minr);
  return p;
}
function setHeading() {
  const m = MOODS.find(x => x.id === state.mood), era = ERAS.find(e => e[0] === state.era);
  let t = state.q ? `Results for "${state.q}"` : m ? m.name : state.genre ? `${GENRES.get(state.genre)} films` : "Popular right now";
  if (!state.q && state.era) t = (m || state.genre ? t : "Films") + ` from the ${era[1].replace("The ", "")}`;
  if (!state.q && state.lang) t += ` in ${$("#lang").selectedOptions[0].text}`;
  $("#heading").textContent = t;
}

/* ---------- grid + infinite scroll ---------- */
async function loadMore(reset = false) {
  if (reset) { token++; state.loading = false; state.page = 1; state.total = 1; cardIndex = 0; $("#grid").innerHTML = ""; $("#count").textContent = ""; setHeading(); }
  if (state.loading || state.page > state.total) return;
  state.loading = true; const mine = token;
  let d;
  try { d = state.q ? await api("/search/movie", { query: state.q, page: state.page }) : await api("/discover/movie", params(state.page)); }
  catch (e) { state.loading = false; $("#sentinel").textContent = "Couldn't reach the movie database. Check your API key and connection."; return; }
  if (mine !== token) return;
  state.total = Math.min(d.total_pages || 1, 500); state.page++;
  const list = (d.results || []).filter(m => m.poster_path);
  list.forEach(remember);
  $("#grid").insertAdjacentHTML("beforeend", list.map(card).join(""));
  $$(".card:not(.seen)").forEach(c => { c.classList.add("seen"); reveal.observe(c); });
  if (d.total_results != null) $("#count").textContent = `${d.total_results.toLocaleString()} films`;
  $("#sentinel").textContent = !$("#grid").children.length ? "No films match. Try loosening a filter." : state.page > state.total ? "That's every film we could find ✦" : "Loading more films…";
  state.loading = false;
}
const card = m => `
  <article class="card" style="--i:${cardIndex++ % 8}">
    <button class="open" data-open="${m.id}">
      <div class="pw"><span class="rate">★ ${m.vote_average.toFixed(1)}</span><img loading="lazy" src="${IMG}w342${m.poster_path}" alt="${esc(m.title)}"></div>
      <h3>${esc(m.title)}</h3><small>${year(m)}</small>
    </button>
    <button class="save ${inVault(m.id) ? "on" : ""}" data-save="${m.id}" aria-label="Save to vault"><span class="h"></span></button>
  </article>`;
const reveal = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); reveal.unobserve(e.target); } }), { threshold: .1 });
new IntersectionObserver(es => { if (es[0].isIntersecting) loadMore(); }, { rootMargin: "600px" }).observe($("#sentinel"));

// 3D tilt + shine that follows the mouse
const grid = $("#grid");
grid.addEventListener("pointermove", e => {
  if (e.pointerType !== "mouse") return;
  const pw = e.target.closest(".pw"); if (!pw) return;
  const r = pw.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  pw.style.setProperty("--rx", ((.5 - y) * 14) + "deg"); pw.style.setProperty("--ry", ((x - .5) * 14) + "deg");
  pw.style.setProperty("--gx", x * 100 + "%"); pw.style.setProperty("--gy", y * 100 + "%");
});
grid.addEventListener("pointerout", e => { const pw = e.target.closest?.(".pw"); if (pw) ["--rx", "--ry"].forEach(v => pw.style.removeProperty(v)); });

/* ---------- movie popup ---------- */
async function openMovie(id) {
  const dlg = $("#modal");
  dlg.innerHTML = `<div class="m-body"><p class="loadmsg">Loading…</p></div>`; if (!dlg.open) dlg.showModal(); dlg.scrollTop = 0;
  let m;
  try { m = await api(`/movie/${id}`, { append_to_response: "videos,credits,watch/providers,recommendations" }); }
  catch (e) { dlg.innerHTML = `<button class="close" data-close>Close</button><div class="m-body"><p>Couldn't load this film. Try again.</p></div>`; return; }
  remember(m);
  const vids = m.videos?.results || [], trailer = vids.find(v => v.site === "YouTube" && v.type === "Trailer") || vids.find(v => v.site === "YouTube");
  const cast = (m.credits?.cast || []).filter(c => c.profile_path).slice(0, 10);
  const dir = (m.credits?.crew || []).find(c => c.job === "Director")?.name;
  const prov = m["watch/providers"]?.results?.[REGION] || {};
  const stream = [...(prov.flatrate || []), ...(prov.free || [])], rent = [...(prov.rent || []), ...(prov.buy || [])];
  const more = (m.recommendations?.results || []).filter(r => r.poster_path).slice(0, 10); more.forEach(remember);
  dlg.innerHTML = `
    <button class="close" data-close>✕ Close</button>
    <div class="m-top" id="mtop">${m.backdrop_path ? `<img src="${IMG}w1280${m.backdrop_path}" alt="">` : ""}
      ${trailer ? `<button class="play" data-play="${trailer.key}" aria-label="Play trailer">▶</button>` : ""}</div>
    <div class="m-body">
      <div class="m-head">
        <div class="ring" style="--p:${Math.round(m.vote_average * 10)}"><span>${m.vote_average.toFixed(1)}</span></div>
        <div><h2 class="gold-text">${esc(m.title)}</h2>
        <div>${year(m) !== "TBA" ? `<span class="pill">${year(m)}</span>` : ""}${m.runtime ? `<span class="pill">${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m</span>` : ""}${(m.genres || []).map(g => `<span class="pill">${esc(g.name)}</span>`).join("")}</div></div>
      </div>
      <div class="btns"><button class="savebtn ${inVault(m.id) ? "on" : ""}" data-save="${m.id}"><span class="h"></span> Save to vault</button>
      <button data-copy="${esc(m.title)}">Copy title</button></div>
      ${m.tagline ? `<p class="tagline">${esc(m.tagline)}</p>` : ""}
      <p>${esc(m.overview) || "No description yet."}</p>
      ${dir ? `<p class="muted">Directed by ${esc(dir)}</p>` : ""}
      <h4>Where to watch in ${REGION}</h4>
      <div class="provs">${stream.length ? stream.map(p => `<img src="${IMG}w92${p.logo_path}" alt="${esc(p.provider_name)}" title="${esc(p.provider_name)}">`).join("") : `<span class="muted">Not streaming here right now.</span>`}
        ${rent.length ? `<small class="muted">Rent or buy: ${[...new Set(rent.map(p => esc(p.provider_name)))].slice(0, 4).join(", ")}</small>` : ""}</div>
      ${cast.length ? `<h4>Cast</h4><div class="cast">${cast.map(c => `<div><img loading="lazy" src="${IMG}w185${c.profile_path}" alt=""><b>${esc(c.name)}</b><small>${esc(c.character)}</small></div>`).join("")}</div>` : ""}
      ${more.length ? `<h4>If you liked this</h4><div class="similar">${more.map(r => `<button class="open" data-open="${r.id}"><div class="pw"><img loading="lazy" src="${IMG}w185${r.poster_path}" alt="${esc(r.title)}"></div><span>${esc(r.title)}</span></button>`).join("")}</div>` : ""}
    </div>`;
}
$("#modal").addEventListener("close", () => $("#modal").innerHTML = "");

/* ---------- surprise roulette ---------- */
async function surprise() {
  const ov = $("#roulette");
  ov.className = "roulette show";
  ov.innerHTML = `<div class="rwrap"><p class="gold-text">Finding your film…</p><div class="reel"><img id="rimg" alt=""></div><h3 id="rname"></h3></div>`;
  let pool = [];
  try {
    const d = await api("/discover/movie", { ...params(1 + Math.floor(Math.random() * 5)), "vote_count.gte": 300 });
    pool = (d.results || []).filter(m => m.poster_path);
  } catch (e) {}
  if (!pool.length) { ov.className = "roulette"; return toast("Couldn't pick one. Check your API key."); }
  const win = pool[Math.floor(Math.random() * pool.length)], img = $("#rimg");
  let i = 0, delay = 70;
  (function step() {
    const last = delay > 330;
    img.src = IMG + "w342" + (last ? win : pool[i++ % pool.length]).poster_path;
    if (!last) { delay *= 1.13; return setTimeout(step, delay); }
    $("#rname").textContent = win.title; ov.querySelector(".reel").classList.add("won");
    setTimeout(() => { ov.className = "roulette"; openMovie(win.id); }, 1100);
  })();
}

/* ---------- events ---------- */
document.addEventListener("click", e => {
  const t = e.target, q = s => t.closest(s);
  if (q("[data-rdir]")) { const b = q("[data-rdir]"); return $("#rail-" + b.dataset.rid).scrollBy({ left: b.dataset.rdir * innerWidth * .7, behavior: "smooth" }); }
  if (q("[data-save]")) return toggleVault(q("[data-save]").dataset.save);
  if (q("[data-open]")) { $("#vault").classList.remove("open"); return openMovie(q("[data-open]").dataset.open); }
  if (q("[data-dot]")) return showHero(+q("[data-dot]").dataset.dot);
  if (q("[data-play]")) return $("#mtop").innerHTML = `<iframe src="https://www.youtube.com/embed/${q("[data-play]").dataset.play}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  if (q("[data-copy]")) { navigator.clipboard?.writeText(q("[data-copy]").dataset.copy); return toast("Title copied"); }
  if (q("[data-close]") || t.id === "modal") return $("#modal").close();
  if (q("[data-mood]")) { const id = q("[data-mood]").dataset.mood; state.mood = state.mood === id ? "" : id; state.genre = ""; return refilter(); }
  if (q("[data-genre]") !== null && q("[data-genre]")) { state.genre = q("[data-genre]").dataset.genre; state.mood = ""; return refilter(); }
  if (q("[data-vclose]")) $("#vault").classList.remove("open");
  if (t.closest("#roulette") && !t.closest(".rwrap")) $("#roulette").className = "roulette";
});
function refilter() { state.q = ""; $("#search").value = ""; drawChips(); loadMore(true); }
$("#era").onchange = e => { state.era = e.target.value; refilter(); };
$("#runtime").onchange = e => { state.rt = e.target.value; refilter(); };
$("#sort").onchange = e => { state.sort = e.target.value; refilter(); };
$("#vaultBtn").onclick = () => $("#vault").classList.toggle("open");
$("#surprise").onclick = surprise;
$("#quizBtn").onclick = () => quiz();
$("#lang").onchange = e => { state.lang = e.target.value; refilter(); };
$("#minr").oninput = e => { state.minr = +e.target.value; $("#minrv").textContent = state.minr || "Any"; clearTimeout(window._mr); window._mr = setTimeout(refilter, 300); };
$("#toTop").onclick = () => scrollTo({ top: 0, behavior: "smooth" });
addEventListener("scroll", () => $("#toTop").classList.toggle("show", scrollY > 800));
let debounce;
$("#search").oninput = e => { clearTimeout(debounce); debounce = setTimeout(() => { state.q = e.target.value.trim(); loadMore(true); }, 400); };
document.addEventListener("keydown", e => {
  if (e.key === "/" && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $("#search").focus(); }
  if (e.key === "Escape") { $("#vault").classList.remove("open"); $("#roulette").className = "roulette"; $("#quiz").className = "roulette"; }
});

/* ---------- rails: Top 10, in theatres, coming soon ---------- */
const RAILS = [{ id: "top", title: "Top 10 this week", top: true }, { id: "now", title: "In theatres now", path: "/movie/now_playing", p: { region: REGION } }, { id: "soon", title: "Coming soon", path: "/movie/upcoming", p: { region: REGION } }];
async function loadRails(trend) {
  $("#rails").innerHTML = RAILS.map(r => `<section class="rail"><div class="rhead"><h2 class="gold-text">${r.title}</h2><span>
    <button class="rbtn" data-rdir="-1" data-rid="${r.id}" aria-label="Scroll left">‹</button><button class="rbtn" data-rdir="1" data-rid="${r.id}" aria-label="Scroll right">›</button></span></div>
    <div class="rrow ${r.top ? "top10" : ""}" id="rail-${r.id}"></div></section>`).join("");
  for (const r of RAILS) {
    let list = []; try { list = r.top ? trend : (await api(r.path, r.p)).results; } catch (e) {}
    list = (list || []).filter(m => m.poster_path).slice(0, r.top ? 10 : 14); list.forEach(remember);
    const row = $("#rail-" + r.id);
    if (!list.length) { row.closest(".rail").remove(); continue; }
    row.innerHTML = list.map((m, i) => `<div class="ritem">${r.top ? `<i class="num">${i + 1}</i>` : ""}
      <button class="open" data-open="${m.id}"><div class="pw"><span class="rate">★ ${m.vote_average.toFixed(1)}</span><img loading="lazy" src="${IMG}w342${m.poster_path}" alt="${esc(m.title)}"></div>${r.top ? "" : `<small>${esc(m.title)}</small>`}</button>
      <button class="save ${inVault(m.id) ? "on" : ""}" data-save="${m.id}" aria-label="Save to vault"><span class="h"></span></button></div>`).join("");
  }
}

/* ---------- 3-question quiz ---------- */
const QUIZ = [
  { q: "What's the vibe tonight?", key: "mood", opts: MOODS.map(m => [m.id, m.name]) },
  { q: "How long do you have?", key: "rt", opts: [["lte100", "Under 100 min"], ["lte130", "About two hours"], ["gte150", "All night, epic"], ["", "No limit"]] },
  { q: "Which era feels right?", key: "era", opts: [["2020", "Brand new"], ["2010", "The 2010s"], ["2000", "The 2000s"], ["1990", "Classics, 90s"], ["", "Surprise me"]] }
];
function syncFilterUI() { $("#era").value = state.era; $("#runtime").value = state.rt; $("#sort").value = state.sort; $("#lang").value = state.lang; $("#minr").value = state.minr; $("#minrv").textContent = state.minr || "Any"; }
function quiz(step = 0, ans = {}) {
  const ov = $("#quiz"), s = QUIZ[step]; ov.className = "roulette show";
  ov.innerHTML = `<div class="rwrap qwrap"><small>Question ${step + 1} of 3</small><p class="gold-text">${s.q}</p><div class="qopts">${s.opts.map(([v, n]) => `<button data-qv="${esc(v)}">${n}</button>`).join("")}</div></div>`;
  ov.onclick = e => {
    const b = e.target.closest("[data-qv]");
    if (!b) { if (!e.target.closest(".qwrap")) ov.className = "roulette"; return; }
    ans = { ...ans, [s.key]: b.dataset.qv };
    if (step < 2) return quiz(step + 1, ans);
    Object.assign(state, { mood: ans.mood, rt: ans.rt, era: ans.era, genre: "", q: "" });
    $("#search").value = ""; syncFilterUI(); drawChips(); ov.className = "roulette"; loadMore(true); setTimeout(surprise, 250);
  };
}

/* ---------- gold sparkle trail ---------- */
let lastSpark = 0;
addEventListener("pointermove", e => {
  if (e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const n = performance.now(); if (n - lastSpark < 70) return; lastSpark = n;
  const s = document.createElement("i"); s.className = "spark"; s.textContent = "✦";
  s.style.left = e.clientX + "px"; s.style.top = e.clientY + "px"; s.style.setProperty("--dx", (Math.random() * 40 - 20) + "px");
  document.body.appendChild(s); setTimeout(() => s.remove(), 900);
});

/* ---------- start ---------- */
syncVault(); drawChips(); loadHero(); loadGenres(); loadMore(true);
