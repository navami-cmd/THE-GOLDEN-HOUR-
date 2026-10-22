// 👇 PASTE YOUR TMDB API KEY (v3) HERE
const KEY = "3ecb15e92ff4f2224b44b19eb3eb8648";

const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/";
const $ = s => document.querySelector(s);

const state = { genre: "", sort: "popularity.desc", q: "", page: 1, total: 1, loading: false, hero: 0 };
let heroList = [], heroTimer, cardIndex = 0;

const api = (path, params = {}) =>
  fetch(`${API}${path}?api_key=${KEY}&language=en-US&${new URLSearchParams(params)}`).then(r => r.json());

/* ---------- NAV ---------- */
window.addEventListener("scroll", () => $("#nav").classList.toggle("solid", scrollY > 60));

/* ---------- HERO ---------- */
async function loadHero() {
  const d = await api("/trending/movie/week");
  heroList = (d.results || []).filter(m => m.backdrop_path).slice(0, 6);
  if (!heroList.length) { $("#hero").innerHTML = `<div class="info"><h1>Add your TMDB key</h1><p>Open script.js and paste your API key at the top.</p></div>`; return; }
  showHero(0);
}
function showHero(i) {
  clearInterval(heroTimer);
  state.hero = i;
  const m = heroList[i], h = $("#hero");
  const old = h.querySelector(".bg"); if (old) { old.classList.add("out"); setTimeout(() => old.remove(), 1000); }
  const img = new Image();
  img.className = "bg"; img.alt = ""; img.src = IMG + "original" + m.backdrop_path;
  h.prepend(img);
  h.querySelector(".info")?.remove(); h.querySelector(".dots")?.remove();
  h.insertAdjacentHTML("beforeend", `
    <div class="info">
      <div><span class="pill star">★ ${m.vote_average.toFixed(1)}</span><span class="pill">${(m.release_date || "").slice(0, 4)}</span><span class="pill">Trending this week</span></div>
      <h1>${m.title}</h1><p>${m.overview}</p>
      <div class="btns"><button class="primary" data-open="${m.id}">▶ Watch trailer</button><button data-open="${m.id}">More info</button></div>
    </div>
    <div class="dots">${heroList.map((_, k) => `<i class="${k === i ? "on" : ""}" data-dot="${k}"></i>`).join("")}</div>`);
  heroTimer = setInterval(() => showHero((state.hero + 1) % heroList.length), 7000);
}

/* ---------- GENRES ---------- */
async function loadGenres() {
  const d = await api("/genre/movie/list");
  const list = [{ id: "", name: "All" }, ...(d.genres || [])];
  $("#genres").innerHTML = list.map(g => `<button class="${g.id === state.genre ? "on" : ""}" data-genre="${g.id}">${g.name}</button>`).join("");
}

/* ---------- GRID + INFINITE SCROLL ---------- */
async function loadMore(reset = false) {
  if (state.loading) return;
  if (reset) { state.page = 1; state.total = 1; cardIndex = 0; $("#grid").innerHTML = ""; }
  if (state.page > state.total) return;
  state.loading = true;
  const params = { page: state.page };
  let path = "/discover/movie";
  if (state.q) { path = "/search/movie"; params.query = state.q; }
  else {
    params.sort_by = state.sort;
    if (state.genre) params.with_genres = state.genre;
    if (state.sort === "vote_average.desc") params["vote_count.gte"] = 500;
    if (state.sort === "primary_release_date.desc") params["primary_release_date.lte"] = new Date().toISOString().slice(0, 10);
  }
  const d = await api(path, params);
  state.total = Math.min(d.total_pages || 1, 500);
  state.page++;
  const movies = (d.results || []).filter(m => m.poster_path);
  $("#grid").insertAdjacentHTML("beforeend", movies.map(card).join(""));
  document.querySelectorAll(".card:not(.in):not(.seen)").forEach(c => { c.classList.add("seen"); reveal.observe(c); });
  $("#sentinel").textContent = state.page > state.total || !movies.length && state.page === 2 ? (movies.length ? "That's everything!" : "No movies found. Try another search.") : "Loading more movies…";
  state.loading = false;
}
const card = m => `
  <button class="card" style="--i:${cardIndex++ % 8}" data-open="${m.id}">
    <div class="pw"><span class="rate">★ ${m.vote_average.toFixed(1)}</span><img loading="lazy" src="${IMG}w342${m.poster_path}" alt="${m.title}"></div>
    <h3>${m.title}</h3><small>${(m.release_date || "").slice(0, 4) || "TBA"}</small>
  </button>`;

const reveal = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add("in"); reveal.unobserve(e.target); }
}), { threshold: .1 });
new IntersectionObserver(es => { if (es[0].isIntersecting) loadMore(); }, { rootMargin: "600px" }).observe($("#sentinel"));

function setHeading() {
  const g = document.querySelector(".chips .on")?.textContent;
  $("#heading").textContent = state.q ? `Results for "${state.q}"` : g && g !== "All" ? `${g} movies` : "Popular right now";
}

/* ---------- MODAL ---------- */
async function openMovie(id) {
  const dlg = $("#modal");
  dlg.innerHTML = `<div class="m-body">Loading…</div>`; dlg.showModal();
  const m = await api(`/movie/${id}`, { append_to_response: "videos,credits" });
  const trailer = (m.videos?.results || []).find(v => v.site === "YouTube" && v.type === "Trailer") || (m.videos?.results || [])[0];
  const cast = (m.credits?.cast || []).slice(0, 6).map(c => c.name).join(", ");
  const dir = (m.credits?.crew || []).find(c => c.job === "Director")?.name;
  dlg.innerHTML = `
    <button class="close" data-close>✕ Close</button>
    <div class="m-top" id="mtop">
      ${m.backdrop_path ? `<img src="${IMG}w1280${m.backdrop_path}" alt="">` : ""}
      ${trailer ? `<button class="play" data-play="${trailer.key}" aria-label="Play trailer">▶</button>` : ""}
    </div>
    <div class="m-body">
      <h2>${m.title}</h2>
      <div><span class="pill star">★ ${m.vote_average.toFixed(1)}</span><span class="pill">${(m.release_date || "").slice(0, 4)}</span>${m.runtime ? `<span class="pill">${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m</span>` : ""}${(m.genres || []).map(g => `<span class="pill">${g.name}</span>`).join("")}</div>
      ${m.tagline ? `<p><i>${m.tagline}</i></p>` : ""}
      <p>${m.overview || "No description yet."}</p>
      ${dir ? `<p class="muted">Directed by ${dir}</p>` : ""}
      ${cast ? `<p class="muted">Starring ${cast}</p>` : ""}
    </div>`;
}
$("#modal").addEventListener("close", () => $("#modal").innerHTML = "");

/* ---------- EVENTS ---------- */
document.addEventListener("click", e => {
  const t = e.target;
  const open = t.closest("[data-open]"), dot = t.closest("[data-dot]"), g = t.closest("[data-genre]"), play = t.closest("[data-play]");
  if (open) openMovie(open.dataset.open);
  else if (dot) showHero(+dot.dataset.dot);
  else if (play) $("#mtop").innerHTML = `<iframe src="https://www.youtube.com/embed/${play.dataset.play}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  else if (t.closest("[data-close]") || t.id === "modal") $("#modal").close();
  else if (g) {
    state.genre = g.dataset.genre; state.q = ""; $("#search").value = "";
    document.querySelectorAll("[data-genre]").forEach(b => b.classList.toggle("on", b === g));
    setHeading(); loadMore(true);
  }
});
$("#sort").onchange = e => { state.sort = e.target.value; loadMore(true); };
let debounce;
$("#search").oninput = e => {
  clearTimeout(debounce);
  debounce = setTimeout(() => { state.q = e.target.value.trim(); setHeading(); loadMore(true); }, 400);
};

/* ---------- START ---------- */
loadHero(); loadGenres(); loadMore(true);