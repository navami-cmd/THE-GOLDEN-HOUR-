// Cinematic title card, 5 seconds total. Click to skip.
(function () {
  const intro = document.getElementById("intro");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { intro.remove(); return; }
  document.body.classList.add("lock");
  const tc = document.getElementById("tc"), pct = document.getElementById("pct"), t0 = performance.now(), RUN = 3400;
  const pad = n => String(n).padStart(2, "0");
  (function tick(now) {
    const e = Math.min(now - t0, RUN);
    const s = Math.floor(e / 1000), f = Math.floor((e % 1000) / 1000 * 24);
    tc.textContent = `00:00:${pad(s)}:${pad(f)}`;
    pct.textContent = Math.round(e / RUN * 100) + "%";
    if (e < RUN && intro.isConnected) requestAnimationFrame(tick);
  })(t0);
  let closed = false;
  const timers = [setTimeout(() => intro.classList.add("reveal"), 1400), setTimeout(close, 3400)];
  function close() {
    if (closed) return;
    closed = true; timers.forEach(clearTimeout);
    intro.classList.add("leave");                         // title fades, gold seam flashes
    setTimeout(() => intro.classList.add("open"), 350);   // shutter splits onto the galaxy
    setTimeout(() => { intro.remove(); document.body.classList.remove("lock"); }, 1500);
  }
  intro.addEventListener("click", close);
})();
