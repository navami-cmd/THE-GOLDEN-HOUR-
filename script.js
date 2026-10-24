// 👇 PASTE YOUR TMDB API KEY (v3) HERE
const KEY = "3ecb15e92ff4f2224b44b19eb3eb8648";
const API = "https://api.themoviedb.org/3", IMG = "https://image.tmdb.org/t/p/", REGION = "IN"; // REGION = country for "where to watch"
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const api = (path, params = {}) =>
  fetch(`${API}${path}?${new URLSearchParams({ api_key: KEY, language: "en-US", ...params })}`)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });

/* Moods are presets: they fill in the filters below, which you can then tweak */
const MOODS = [
  { id: "cozy", name: "Cozy night in", g: ["35", "10751", "16"], mode: "any", min: 6.5 },
  { id: "mind", name: "Mind-bending", g: ["878", "9648"], mode: "any", min: 7 },
  { id: "edge", name: "Edge of my seat", g: ["53", "28"], mode: "any", min: 6.5 },
  { id: "cry", name: "Cry it out", g: ["18", "10749"], mode: "all", min: 7 },
  { id: "date", name: "Date night", g: ["10749", "35"], mode: "any", min: 6.5 },
  { id: "epic", name: "Epic escape", g: ["12", "14", "878"], mode: "any", min: 6.5 },
  { id: "spooky", name: "Spooky hours", g: ["27", "9648"], mode: "any", min: 6 },
  { id: "laugh", name: "Laugh out loud", g: ["35"], mode: "any", min: 6.5 }
];
const ERAS = [["", "", "Any era"], ["2020", "2029", "2020s"], ["2010", "2019", "2010s"], ["2000", "2009", "2000s"], ["1990", "1999", "1990s"], ["1980", "1989", "1980s"], ["1970", "1979", "1970s"], ["1960", "1969", "1960s"], ["", "1959", "Classics"]];

const state = { genres: [], gmode: "any", yf: "", yt: "", rt: "", lang: "", minr: 0, obscure: false, mood: "", sort: "popularity.desc", q: "", page: 1, total: 1, tr: 0, loading: false, hero: 0 };
const GENRES = new Map(), cache = new Map();
let heroList = [], heroTimer, cardIndex = 0, token = 0;
let vault = []; try { vault = JSON.parse(localStorage.getItem("gh_vault") || "[]"); } catch (e) {}

/* ---------- small effects ---------- */
addEventListener("scroll", () => {
  $("#nav").classList.toggle("solid", scrollY > 60);
  $("#toTop").classList.toggle("show", scrollY > 800);
  const max = document.documentElement.scrollHeight - innerHeight;
  $("#progress").style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
});
addEventListener("pointermove", e => { if (e.pointerType === "mouse") $("#glow").style.transform = `translate(${e.clientX}px,${e.clientY}px)`; });
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 1800); }
const remember = m => cache.set(m.id, { id: m.id, title: m.title, poster_path: m.poster_path, vote_average: m.vote_average || 0, release_date: m.release_date, genre_ids: m.genre_ids || (m.genres || []).map(g => g.id) });
const year = m => (m.release_date || "").slice(0, 4) || "TBA";
const pimg = (m, w = "w342") => m.poster_path ? `<img loading="lazy" src="${IMG}${w}${m.poster_path}" alt="${esc(m.title)}">` : `<div class="noposter"><span>${esc(m.title)}</span></div>`;

/* ---------- poster colours: hero, popup and cards take on each film's palette ---------- */
const palCache = new Map();
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; }
  return [h, s, l];
}
const fixH = h => (h > 42 && h < 75 ? 36 : h);   // keep yellows out: pull them to bronze
function palette(path) {
  if (!path) return Promise.resolve(null);
  if (palCache.has(path)) return palCache.get(path);
  const p = new Promise(res => {
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => {
      try {
        const W = 36, H = 54, c = document.createElement("canvas"); c.width = W; c.height = H;
        const x = c.getContext("2d"); x.drawImage(im, 0, 0, W, H); const d = x.getImageData(0, 0, W, H).data;
        const wt = new Array(36).fill(0), sat = new Array(36).fill(0);
        for (let i = 0; i < d.length; i += 4) {
          const [h, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]); if (l < .14 || l > .9 || s < .12) continue;
          const w = s * (1 - Math.abs(l - .5) * 1.4), b = Math.floor(h / 10) % 36; wt[b] += w; sat[b] += w * s;
        }
        let best = 0; for (let i = 1; i < 36; i++) if (wt[i] > wt[best]) best = i;
        res(wt[best] < 1.5 ? null : { h: fixH(best * 10 + 5), s: sat[best] / wt[best] });
      } catch (e) { res(null); }
    };
    im.onerror = () => res(null); im.src = IMG + "w92" + path;
  });
  palCache.set(path, p); return p;
}
const hsl = (h, s, l) => `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${l}%)`;
const clampS = s => Math.min(.8, Math.max(.4, s));
function applyTint(el, p) {          // p = null falls back to champagne gold
  const h = p ? p.h : 36, s = p ? clampS(p.s) * .75 : .36;
  Object.entries({ "--a0": hsl(h, s * .5, 87), "--a1": hsl(h, s * .85, 68), "--a2": hsl(h, s, 52), "--a3": hsl(h, s * .95, 29) }).forEach(([k, v]) => el.style.setProperty(k, v));
}
function tintScene(path) {
  palette(path).then(p => { applyTint($("#hero"), p); $("#ambient").style.setProperty("--amb", p ? hsl(p.h, clampS(p.s) * .75, 30) : "#4a3a20"); });
}
document.addEventListener("pointerover", e => {       // each card glows in its own poster's colour on hover
  const pw = e.target.closest?.(".pw"); if (!pw || pw.dataset.t) return;
  const img = pw.querySelector("img"); if (!img) return; pw.dataset.t = 1;
  palette(img.getAttribute("src").replace(/^.*?\/w\d+/, "")).then(p => p && pw.style.setProperty("--acc", hsl(p.h, clampS(p.s) * .75, 58)));
});

/* ---------- vault ---------- */
const inVault = id => vault.some(v => v.id == id);
let picksT;
function tasteHTML() {
  const c = {}; vault.forEach(v => (v.genre_ids || []).forEach(g => c[g] = (c[g] || 0) + 1));
  const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 4); if (!top.length) return "";
  return `<div class="taste"><h4>YOUR TASTE</h4>${top.map(([g, n]) => `<div class="trow"><span>${esc(GENRES.get(String(g)) || "Genre")}</span><div class="tbar"><i style="width:${n / top[0][1] * 100}%"></i></div><b>${n}</b></div>`).join("")}</div>`;
}
function syncVault() {
  try { localStorage.setItem("gh_vault", JSON.stringify(vault)); } catch (e) {}
  $("#vaultCount").textContent = vault.length;
  $$("[data-save]").forEach(b => b.classList.toggle("on", inVault(b.dataset.save)));
  const seen = vault.filter(v => v.seen).length, avg = vault.length ? (vault.reduce((a, v) => a + v.vote_average, 0) / vault.length).toFixed(1) : "";
  $("#vault").innerHTML = `<div class="vhead"><div><h3 class="gold-text">My vault</h3><small class="muted">${vault.length ? `${vault.length} saved, ${seen} watched, avg ★ ${avg}` : ""}</small></div><button data-vclose>Close</button></div>` +
    (vault.length ? `<div class="vtools"><button data-vcopy>Copy list</button></div>${tasteHTML()}<div class="vgrid">${vault.map(v => `<div class="vitem ${v.seen ? "seen" : ""}"><button class="open" data-open="${v.id}"><div class="pw">${pimg(v, "w185")}</div><span>${esc(v.title)}</span></button>
        <button class="x" data-save="${v.id}" aria-label="Remove">✕</button><button class="seenbtn" data-seen="${v.id}">${v.seen ? "Watched" : "Mark watched"}</button></div>`).join("")}</div>`
      : `<p class="empty">Nothing saved yet. Tap the bookmark on any film to keep it here. Your taste and personal picks will appear as you save.</p>`);
  clearTimeout(picksT); picksT = setTimeout(loadPicks, 700);
}
function toggleVault(id) {
  const m = cache.get(+id); if (!m) return;
  if (inVault(id)) { vault = vault.filter(v => v.id != id); toast("Removed from your vault"); } else { vault.unshift(m); toast("Saved to your vault"); }
  syncVault();
}

function toggleSeen(id) { const v = vault.find(x => x.id == id); if (v) { v.seen = !v.seen; syncVault(); } }

/* ---------- picked for you (based on your vault) ---------- */
const recCache = new Map();
const ritem = m => `<div class="ritem"><button class="open" data-open="${m.id}"><div class="pw"><span class="rate">★ ${m.vote_average.toFixed(1)}</span>${pimg(m)}</div><small>${esc(m.title)}</small></button>
  <button class="save ${inVault(m.id) ? "on" : ""}" data-save="${m.id}" aria-label="Save to vault"><span class="h"></span></button></div>`;
async function loadPicks() {
  const box = $("#picks"); if (!vault.length) { box.innerHTML = ""; return; }
  const src = vault.slice(0, 3); let all = [];
  for (const v of src) {
    if (!recCache.has(v.id)) { try { recCache.set(v.id, (await api(`/movie/${v.id}/recommendations`)).results || []); } catch (e) { recCache.set(v.id, []); } }
    all = all.concat(recCache.get(v.id));
  }
  const have = new Set(vault.map(v => v.id)), uniq = [];
  all.forEach(m => { if (m.poster_path && !have.has(m.id) && !uniq.some(u => u.id === m.id)) uniq.push(m); });
  const list = uniq.sort((a, b) => b.vote_average - a.vote_average).slice(0, 14); list.forEach(remember);
  box.innerHTML = list.length ? `<section class="rail"><div class="rhead"><h2 class="gold-text">Picked for you</h2><span>
    <button class="rbtn" data-rdir="-1" data-rid="picks" aria-label="Scroll left">‹</button><button class="rbtn" data-rdir="1" data-rid="picks" aria-label="Scroll right">›</button></span></div>
    <p class="picks-sub">Because you saved ${src.map(v => esc(v.title)).join(", ")}</p><div class="rrow" id="rail-picks">${list.map(ritem).join("")}</div></section>` : "";
}

/* ---------- shareable links: filters and open film live in the URL ---------- */
let curMovie = null;
function writeHash() {
  const p = new URLSearchParams(), s = state;
  if (s.genres.length) p.set("g", s.genres.join(",")); if (s.gmode !== "any") p.set("gm", s.gmode);
  if (s.yf) p.set("yf", s.yf); if (s.yt) p.set("yt", s.yt); if (s.rt) p.set("rt", s.rt); if (s.lang) p.set("l", s.lang);
  if (s.minr) p.set("r", s.minr); if (s.sort !== "popularity.desc") p.set("s", s.sort); if (s.obscure) p.set("o", "1");
  if (s.mood) p.set("mood", s.mood); if (s.q) p.set("q", s.q); if (curMovie) p.set("m", curMovie);
  const h = p.toString(); try { history.replaceState(null, "", h ? "#" + h : location.pathname + location.search); } catch (e) {}
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1)), s = state;
  s.genres = p.get("g") ? p.get("g").split(",") : []; s.gmode = p.get("gm") || "any"; s.yf = p.get("yf") || ""; s.yt = p.get("yt") || "";
  s.rt = p.get("rt") || ""; s.lang = p.get("l") || ""; s.minr = +(p.get("r") || 0); s.sort = p.get("s") || "popularity.desc";
  s.obscure = p.get("o") === "1"; s.mood = p.get("mood") || ""; s.q = p.get("q") || ""; $("#search").value = s.q;
  return p.get("m");
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
      <div class="btns"><button class="primary" data-playmovie="${m.id}"><i class="tri"></i> Watch trailer</button><button data-open="${m.id}">More info</button>
      <button class="savebtn ${inVault(m.id) ? "on" : ""}" data-save="${m.id}"><span class="h"></span> Vault</button></div>
    </div>
    ${m.poster_path ? `<img class="hposter" src="${IMG}w500${m.poster_path}" alt="">` : ""}
    <div class="dots">${heroList.map((_, k) => `<i class="${k === i ? "on" : ""}" data-dot="${k}"></i>`).join("")}</div>`);
  tintScene(m.poster_path);
  heroTimer = setInterval(() => showHero((state.hero + 1) % heroList.length), 7000);
}

/* ---------- filters ---------- */
const YEARS = []; for (let y = new Date().getFullYear() + 1; y >= 1900; y--) YEARS.push(y);
["#yf", "#yt"].forEach(s => $(s).innerHTML = `<option value="">Any</option>` + YEARS.map(y => `<option>${y}</option>`).join(""));

const eraText = () => state.yf && state.yt ? (state.yf === state.yt ? state.yf : `${state.yf} to ${state.yt}`) : state.yf ? `since ${state.yf}` : state.yt ? `up to ${state.yt}` : "";
const selText = id => $(id).selectedOptions[0].text;

function renderFilters() {
  $("#moods").innerHTML = MOODS.map(m => `<button class="${state.mood === m.id ? "on" : ""}" data-mood="${m.id}">${m.name}</button>`).join("");
  $("#genres").innerHTML = [...GENRES].map(([id, n]) => `<button class="${state.genres.includes(id) ? "on" : ""}" data-genre="${id}">${n}</button>`).join("");
  $("#gmode").innerHTML = [["any", "Match any"], ["all", "Match all"]].map(([v, n]) => `<button class="${state.gmode === v ? "on" : ""}" data-gmode="${v}">${n}</button>`).join("");
  $("#eras").innerHTML = ERAS.map(([a, b, n]) => `<button class="${state.yf === a && state.yt === b ? "on" : ""}" data-era="${a}|${b}">${n}</button>`).join("");
  $("#yf").value = state.yf; $("#yt").value = state.yt; $("#runtime").value = state.rt; $("#lang").value = state.lang;
  $("#sort").value = state.sort; $("#minr").value = state.minr; $("#minrv").textContent = state.minr || "Any"; $("#obscure").checked = state.obscure;

  const act = [];
  if (state.mood) act.push(["mood", MOODS.find(m => m.id === state.mood).name]);
  state.genres.forEach(g => act.push(["genre:" + g, GENRES.get(g) || g]));
  if (state.yf || state.yt) act.push(["era", eraText()]);
  if (state.rt) act.push(["rt", selText("#runtime")]);
  if (state.lang) act.push(["lang", selText("#lang")]);
  if (state.minr) act.push(["minr", `★ ${state.minr}+`]);
  if (state.obscure) act.push(["obscure", "Incl. obscure"]);
  $("#active").innerHTML = act.length
    ? act.map(([k, n]) => `<button class="tag" data-clear="${k}">${n} <b>✕</b></button>`).join("") + `<button class="tag clear" data-clearall>Clear all</button><button class="tag clear" data-share>Copy link to these filters</button>`
    : `<span class="muted">No filters on. You're seeing every film.</span>`;
}
function setMood(id) { const m = MOODS.find(x => x.id === id); state.mood = id; state.genres = [...m.g]; state.gmode = m.mode; state.minr = m.min; }
function clearKey(k) {
  if (k === "mood") Object.assign(state, { mood: "", genres: [], gmode: "any", minr: 0 });
  else if (k.startsWith("genre:")) { state.genres = state.genres.filter(g => g !== k.slice(6)); state.mood = ""; }
  else if (k === "era") state.yf = state.yt = "";
  else if (k === "rt") state.rt = ""; else if (k === "lang") state.lang = "";
  else if (k === "minr") { state.minr = 0; state.mood = ""; } else if (k === "obscure") state.obscure = false;
}
function apply() { renderFilters(); loadMore(true); writeHash(); }

async function loadGenres() {
  try { (await api("/genre/movie/list")).genres.forEach(g => GENRES.set(String(g.id), g.name)); } catch (e) {}
  renderFilters(); syncVault();
}

// Discover query built from every active filter
function params(page) {
  const p = { page, sort_by: state.sort, include_adult: "false" };
  if (state.genres.length) p.with_genres = state.genres.join(state.gmode === "all" ? "," : "|");
  const today = new Date().toISOString().slice(0, 10);
  if (state.yf) p["primary_release_date.gte"] = `${state.yf}-01-01`;
  if (state.yt) p["primary_release_date.lte"] = `${state.yt}-12-31`;
  else if (state.sort.startsWith("primary_release_date")) p["primary_release_date.lte"] = today;
  if (state.rt) p[`with_runtime.${state.rt.slice(0, 3)}`] = state.rt.slice(3);
  if (state.lang) p.with_original_language = state.lang;
  if (state.minr > 0) p["vote_average.gte"] = state.minr;
  const votes = ["vote_average.desc"].includes(state.sort) ? (state.obscure ? 50 : 300) : state.obscure ? 0 : 20;
  if (votes) p["vote_count.gte"] = votes;
  return p;
}
// Search can't filter server-side, so apply the same filters to search results here
function passes(m) {
  const ids = (m.genre_ids || []).map(String);
  if (state.genres.length && !(state.gmode === "all" ? state.genres.every(g => ids.includes(g)) : state.genres.some(g => ids.includes(g)))) return false;
  if (state.minr && m.vote_average < state.minr) return false;
  const y = +(m.release_date || "").slice(0, 4);
  if (state.yf && (!y || y < +state.yf)) return false;
  if (state.yt && (!y || y > +state.yt)) return false;
  if (state.lang && m.original_language !== state.lang) return false;
  return true;
}
function setHeading() {
  if (state.q) return $("#heading").textContent = `Results for "${state.q}"`;
  const g = state.genres.map(i => GENRES.get(i)).filter(Boolean);
  let t = state.mood ? MOODS.find(m => m.id === state.mood).name : g.length ? g.join(state.gmode === "all" ? " & " : " or ") + " films" : state.yf || state.yt || state.lang || state.rt || state.minr ? "Films" : "Popular right now";
  if (eraText()) t += `, ${eraText()}`;
  if (state.lang) t += ` in ${selText("#lang")}`;
  $("#heading").textContent = t;
}

/* ---------- grid + infinite scroll ---------- */
async function loadMore(reset = false) {
  const grid = $("#grid");
  if (reset) { token++; state.loading = false; state.page = 1; state.total = 1; cardIndex = 0; grid.innerHTML = ""; $("#count").textContent = ""; setHeading(); }
  if (state.loading || state.page > state.total) return;
  state.loading = true; const mine = token;
  let added = 0, tries = 0;
  try {
    do {
      const d = state.q ? await api("/search/movie", { query: state.q, page: state.page, include_adult: "false" }) : await api("/discover/movie", params(state.page));
      if (mine !== token) return;
      state.total = Math.min(d.total_pages || 1, 500); state.page++; state.tr = d.total_results || 0;
      let list = d.results || []; if (state.q) list = list.filter(passes);
      list.forEach(remember);
      grid.insertAdjacentHTML("beforeend", list.map(card).join(""));
      added += list.length; tries++;
    } while (state.q && added < 12 && state.page <= state.total && tries < 6);
  } catch (e) { state.loading = false; $("#sentinel").textContent = "Couldn't reach the movie database. Check your API key and connection."; return; }
  $$(".card:not(.seen)").forEach(c => { c.classList.add("seen"); reveal.observe(c); });
  if (!state.q) $("#count").textContent = `${state.tr.toLocaleString()} films`;
  $("#sentinel").textContent = !grid.children.length ? "No films match these filters. Try removing one above."
    : state.page > state.total ? (state.tr > 10000 && !state.q ? `Showing the first 10,000 of ${state.tr.toLocaleString()}. Narrow by year, genre or language to see the rest.` : "That's every film we could find.")
    : "Loading more films…";
  state.loading = false;
}
const card = m => `
  <article class="card" style="--i:${cardIndex++ % 8}">
    <button class="open" data-open="${m.id}">
      <div class="pw"><span class="rate">★ ${(m.vote_average || 0).toFixed(1)}</span>${pimg(m)}</div>
      <h3>${esc(m.title)}</h3><small>${year(m)}</small>
    </button>
    <button class="save ${inVault(m.id) ? "on" : ""}" data-save="${m.id}" aria-label="Save to vault"><span class="h"></span></button>
  </article>`;
const reveal = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); reveal.unobserve(e.target); } }), { threshold: .1 });
new IntersectionObserver(es => { if (es[0].isIntersecting) loadMore(); }, { rootMargin: "700px" }).observe($("#sentinel"));

// 3D tilt + shine that follows the mouse
const gridEl = $("#grid");
gridEl.addEventListener("pointermove", e => {
  if (e.pointerType !== "mouse") return;
  const pw = e.target.closest(".pw"); if (!pw) return;
  const r = pw.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  pw.style.setProperty("--rx", ((.5 - y) * 14) + "deg"); pw.style.setProperty("--ry", ((x - .5) * 14) + "deg");
  pw.style.setProperty("--gx", x * 100 + "%"); pw.style.setProperty("--gy", y * 100 + "%");
});
gridEl.addEventListener("pointerout", e => { const pw = e.target.closest?.(".pw"); if (pw) ["--rx", "--ry"].forEach(v => pw.style.removeProperty(v)); });

/* ---------- movie popup ---------- */
const yt = k => `<iframe src="https://www.youtube-nocookie.com/embed/${k}?autoplay=1&rel=0&modestbranding=1&playsinline=1${location.protocol.startsWith("http") ? "&origin=" + encodeURIComponent(location.origin) : ""}" title="Trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
async function openMovie(id, autoplay = false) {
  const dlg = $("#modal"); curMovie = id; writeHash();
  ["--a0", "--a1", "--a2", "--a3"].forEach(k => dlg.style.removeProperty(k));
  dlg.innerHTML = `<div class="m-body"><p class="loadmsg">Loading…</p></div>`; if (!dlg.open) dlg.showModal(); dlg.scrollTop = 0;
  let m;
  try { m = await api(`/movie/${id}`, { append_to_response: "videos,credits,watch/providers,recommendations" }); }
  catch (e) { dlg.innerHTML = `<button class="close" data-close>Close</button><div class="m-body"><p>Couldn't load this film. Try again.</p></div>`; return; }
  remember(m); palette(m.poster_path).then(p => applyTint(dlg, p));
  const vids = (m.videos?.results || []).filter(v => v.site === "YouTube")
    .sort((a, b) => (b.type === "Trailer") - (a.type === "Trailer") || (b.official === true) - (a.official === true)).slice(0, 6);
  const trailer = vids[0];
  const cast = (m.credits?.cast || []).filter(c => c.profile_path).slice(0, 10);
  const dir = (m.credits?.crew || []).find(c => c.job === "Director")?.name;
  const prov = m["watch/providers"]?.results?.[REGION] || {};
  const stream = [...(prov.flatrate || []), ...(prov.free || [])], rent = [...(prov.rent || []), ...(prov.buy || [])];
  const more = (m.recommendations?.results || []).filter(r => r.poster_path).slice(0, 10); more.forEach(remember);
  const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(m.title + " " + year(m) + " official trailer")}`;
  const top = autoplay && trailer ? yt(trailer.key)
    : (m.backdrop_path ? `<img src="${IMG}w1280${m.backdrop_path}" alt="">` : "") +
      (trailer ? `<button class="play" data-play="${trailer.key}" aria-label="Play trailer"><i class="tri"></i></button>`
               : `<div class="notrailer"><span>No trailer is listed for this film.</span><a href="${search}" target="_blank" rel="noopener">Search on YouTube</a></div>`);
  dlg.innerHTML = `
    <button class="close" data-close>Close</button>
    <div class="m-top" id="mtop">${top}</div>
    <div class="m-body">
      ${trailer ? `<div class="vids">${vids.map((v, i) => `<button class="${i === 0 ? "on" : ""}" data-vid="${v.key}">${esc(v.name.length > 26 ? v.name.slice(0, 25) + "…" : v.name)}</button>`).join("")}
        <a class="ytlink" href="https://www.youtube.com/watch?v=${trailer.key}" target="_blank" rel="noopener">Open on YouTube</a></div>` : ""}
      <div class="m-head">
        <div class="ring" style="--p:${Math.round(m.vote_average * 10)}"><span>${m.vote_average.toFixed(1)}</span></div>
        <div><h2 class="gold-text">${esc(m.title)}</h2>
        <div>${year(m) !== "TBA" ? `<span class="pill">${year(m)}</span>` : ""}${m.runtime ? `<span class="pill">${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m</span>` : ""}${(m.genres || []).map(g => `<span class="pill">${esc(g.name)}</span>`).join("")}</div></div>
      </div>
      <div class="btns"><button class="savebtn ${inVault(m.id) ? "on" : ""}" data-save="${m.id}"><span class="h"></span> Save to vault</button>
      <button data-share>Copy link</button><button data-copy="${esc(m.title)}">Copy title</button></div>
      ${m.tagline ? `<p class="tagline">${esc(m.tagline)}</p>` : ""}
      <p>${esc(m.overview) || "No description yet."}</p>
      ${dir ? `<p class="muted">Directed by ${esc(dir)}</p>` : ""}
      <h4>Where to watch in ${REGION}</h4>
      <div class="provs">${stream.length ? stream.map(p => `<img src="${IMG}w92${p.logo_path}" alt="${esc(p.provider_name)}" title="${esc(p.provider_name)}">`).join("") : `<span class="muted">Not streaming here right now.</span>`}
        ${rent.length ? `<small class="muted">Rent or buy: ${[...new Set(rent.map(p => esc(p.provider_name)))].slice(0, 4).join(", ")}</small>` : ""}</div>
      ${cast.length ? `<h4>Cast</h4><div class="cast">${cast.map(c => `<div><img loading="lazy" src="${IMG}w185${c.profile_path}" alt=""><b>${esc(c.name)}</b><small>${esc(c.character)}</small></div>`).join("")}</div>` : ""}
      ${more.length ? `<h4>If you liked this</h4><div class="similar">${more.map(r => `<button class="open" data-open="${r.id}"><div class="pw">${pimg(r, "w185")}</div><span>${esc(r.title)}</span></button>`).join("")}</div>` : ""}
    </div>`;
}
$("#modal").addEventListener("close", () => { $("#modal").innerHTML = ""; curMovie = null; writeHash(); });

/* ---------- surprise roulette (respects your filters) ---------- */
async function surprise() {
  const ov = $("#roulette"); ov.className = "roulette show";
  ov.innerHTML = `<div class="rwrap"><p class="gold-text">Finding your film…</p><div class="reel"><img id="rimg" alt=""></div><h3 id="rname"></h3></div>`;
  let pool = [];
  try {
    const d = await api("/discover/movie", { ...params(1 + Math.floor(Math.random() * 5)), "vote_count.gte": 200 });
    pool = (d.results || []).filter(m => m.poster_path);
  } catch (e) {}
  if (!pool.length) { ov.className = "roulette"; return toast("No match found. Try loosening a filter."); }
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
      <button class="open" data-open="${m.id}"><div class="pw"><span class="rate">★ ${m.vote_average.toFixed(1)}</span>${pimg(m)}</div>${r.top ? "" : `<small>${esc(m.title)}</small>`}</button>
      <button class="save ${inVault(m.id) ? "on" : ""}" data-save="${m.id}" aria-label="Save to vault"><span class="h"></span></button></div>`).join("");
  }
}

/* ---------- 3-question quiz ---------- */
const QUIZ = [
  { q: "What's the vibe tonight?", key: "mood", opts: MOODS.map(m => [m.id, m.name]) },
  { q: "How long do you have?", key: "rt", opts: [["lte120", "Under 2 hours"], ["gte120", "Over 2 hours"], ["gte150", "All night, epic"], ["", "No limit"]] },
  { q: "Which era feels right?", key: "era", opts: [["2020|2029", "Brand new"], ["2010|2019", "The 2010s"], ["2000|2009", "The 2000s"], ["1990|1999", "Classics, 90s"], ["|", "Surprise me"]] }
];
function quiz(step = 0, ans = {}) {
  const ov = $("#quiz"), s = QUIZ[step]; ov.className = "roulette show";
  ov.innerHTML = `<div class="rwrap qwrap"><small>Question ${step + 1} of 3</small><p class="gold-text">${s.q}</p><div class="qopts">${s.opts.map(([v, n]) => `<button data-qv="${esc(v)}">${n}</button>`).join("")}</div></div>`;
  ov.onclick = e => {
    const b = e.target.closest("[data-qv]");
    if (!b) { if (!e.target.closest(".qwrap")) ov.className = "roulette"; return; }
    ans = { ...ans, [s.key]: b.dataset.qv };
    if (step < 2) return quiz(step + 1, ans);
    setMood(ans.mood); state.rt = ans.rt; [state.yf, state.yt] = ans.era.split("|"); state.q = ""; $("#search").value = "";
    ov.className = "roulette"; apply(); setTimeout(surprise, 250);
  };
}

/* ---------- events ---------- */
document.addEventListener("click", e => {
  const t = e.target, q = s => t.closest(s);
  if (q("[data-rdir]")) { const b = q("[data-rdir]"); return $("#rail-" + b.dataset.rid).scrollBy({ left: b.dataset.rdir * innerWidth * .7, behavior: "smooth" }); }
  if (q("[data-save]")) return toggleVault(q("[data-save]").dataset.save);
  if (q("[data-playmovie]")) { $("#vault").classList.remove("open"); return openMovie(q("[data-playmovie]").dataset.playmovie, true); }
  if (q("[data-open]")) { $("#vault").classList.remove("open"); return openMovie(q("[data-open]").dataset.open); }
  if (q("[data-dot]")) return showHero(+q("[data-dot]").dataset.dot);
  if (q("[data-play]")) return $("#mtop").innerHTML = yt(q("[data-play]").dataset.play);
  if (q("[data-vid]")) { $$("[data-vid]").forEach(b => b.classList.toggle("on", b === q("[data-vid]"))); return $("#mtop").innerHTML = yt(q("[data-vid]").dataset.vid); }
  if (q("[data-share]")) { navigator.clipboard?.writeText(location.href); return toast("Link copied"); }
  if (q("[data-seen]")) return toggleSeen(q("[data-seen]").dataset.seen);
  if (q("[data-vcopy]")) { navigator.clipboard?.writeText(vault.map(v => `${v.title} (${year(v)})`).join("\n")); return toast("List copied"); }
  if (q("[data-copy]")) { navigator.clipboard?.writeText(q("[data-copy]").dataset.copy); return toast("Title copied"); }
  if (q("[data-close]") || t.id === "modal") return $("#modal").close();
  if (q("[data-mood]")) { const id = q("[data-mood]").dataset.mood; state.mood === id ? clearKey("mood") : setMood(id); return apply(); }
  if (q("[data-genre]")) { const g = q("[data-genre]").dataset.genre; state.genres = state.genres.includes(g) ? state.genres.filter(x => x !== g) : [...state.genres, g]; state.mood = ""; return apply(); }
  if (q("[data-gmode]")) { state.gmode = q("[data-gmode]").dataset.gmode; state.mood = ""; return apply(); }
  if (q("[data-era]")) { [state.yf, state.yt] = q("[data-era]").dataset.era.split("|"); return apply(); }
  if (q("[data-clearall]")) { Object.assign(state, { genres: [], gmode: "any", yf: "", yt: "", rt: "", lang: "", minr: 0, obscure: false, mood: "" }); return apply(); }
  if (q("[data-clear]")) { clearKey(q("[data-clear]").dataset.clear); return apply(); }
  if (q("[data-vclose]")) $("#vault").classList.remove("open");
  if (t.closest("#roulette") && !t.closest(".rwrap")) $("#roulette").className = "roulette";
});
const onChange = (sel, fn) => $(sel).addEventListener("change", e => { fn(e.target); apply(); });
onChange("#yf", el => { state.yf = el.value; if (state.yt && state.yf > state.yt) state.yt = state.yf; });
onChange("#yt", el => { state.yt = el.value; if (state.yf && state.yf > state.yt && state.yt) state.yf = state.yt; });
onChange("#runtime", el => state.rt = el.value);
onChange("#lang", el => state.lang = el.value);
onChange("#sort", el => state.sort = el.value);
onChange("#obscure", el => state.obscure = el.checked);
let sliderT;
$("#minr").addEventListener("input", e => {
  state.minr = +e.target.value; state.mood = ""; $("#minrv").textContent = state.minr || "Any";
  clearTimeout(sliderT); sliderT = setTimeout(apply, 300);
});
$("#vaultBtn").onclick = () => $("#vault").classList.toggle("open");
$("#surprise").onclick = surprise;
$("#quizBtn").onclick = () => quiz();
$("#toTop").onclick = () => scrollTo({ top: 0, behavior: "smooth" });
let debounce;
$("#search").oninput = e => { clearTimeout(debounce); debounce = setTimeout(() => { state.q = e.target.value.trim(); loadMore(true); writeHash(); }, 400); };
document.addEventListener("keydown", e => {
  if (e.key === "/" && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $("#search").focus(); }
  if (e.key === "Escape") { $("#vault").classList.remove("open"); $("#roulette").className = "roulette"; $("#quiz").className = "roulette"; }
});

/* ---------- start ---------- */
const firstMovie = readHash();
syncVault(); renderFilters(); loadHero(); loadGenres(); loadMore(true);
if (firstMovie) openMovie(firstMovie);
