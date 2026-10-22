(function () {
  const intro = document.getElementById("intro");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { intro.remove(); return; }
  document.body.classList.add("lock");
  let closed = false;
  setTimeout(() => intro.classList.add("reveal"), 3800);   // record fades, clock + name appear
  function close() {
    if (closed) return;
    closed = true;
    intro.classList.add("done");
    document.body.classList.remove("lock");
    setTimeout(() => intro.remove(), 1500);
  }
  intro.addEventListener("click", close);
  setTimeout(close, 7400);
})();