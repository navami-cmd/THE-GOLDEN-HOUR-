// Total length: 5 seconds (reveal 1.9s, close 3.6s, doors done by ~5.0s)
(function () {
  const intro = document.getElementById("intro");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { intro.remove(); return; }
  document.body.classList.add("lock");
  let closed = false;
  const timers = [setTimeout(() => intro.classList.add("reveal"), 1900), setTimeout(close, 3600)];
  function close() {
    if (closed) return;
    closed = true; timers.forEach(clearTimeout);
    intro.classList.add("leave");
    setTimeout(() => intro.classList.add("open"), 300);
    setTimeout(() => { intro.remove(); document.body.classList.remove("lock"); }, 1400);
  }
  intro.addEventListener("click", close);
})();
