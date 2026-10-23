// Gold record spins ~2s, then GOLDEN HOUR arrives with shimmer. 5 seconds total. Click to skip.
(function () {
  const intro = document.getElementById("intro");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { intro.remove(); return; }
  document.body.classList.add("lock");
  const tc = document.getElementById("tc"), pct = document.getElementById("pct"), wrap = intro.querySelector(".titlewrap"), t0 = performance.now(), RUN = 3600;
  const pad = n => String(n).padStart(2, "0");
  (function tick(now) {
    const e = Math.min(now - t0, RUN), s = Math.floor(e / 1000), f = Math.floor((e % 1000) / 1000 * 24);
    tc.textContent = `00:00:${pad(s)}:${pad(f)}`; pct.textContent = Math.round(e / RUN * 100) + "%";
    if (e < RUN && intro.isConnected) requestAnimationFrame(tick);
  })(t0);

  function reveal() {
    intro.classList.add("reveal");
    for (let i = 0; i < 34; i++) {                      // fine gold dust around the title
      const d = document.createElement("i"); d.className = "dust";
      d.style.cssText = `--x:${Math.random() * 100}%;--y:${Math.random() * 100}%;--s:${1.5 + Math.random() * 3}px;--d:${1.2 + Math.random() * 1.2}s;--dl:${1 + Math.random() * 1.6}s;--mx:${(Math.random() - .5) * 50}px;--my:${-20 - Math.random() * 50}px`;
      wrap.appendChild(d);
    }
  }
  let closed = false;
  const timers = [setTimeout(reveal, 2000), setTimeout(close, 3600)];
  function close() {
    if (closed) return;
    closed = true; timers.forEach(clearTimeout);
    intro.classList.add("leave");
    setTimeout(() => intro.classList.add("open"), 350);
    setTimeout(() => { intro.remove(); document.body.classList.remove("lock"); }, 1400);
  }
  intro.addEventListener("click", close);
})();
