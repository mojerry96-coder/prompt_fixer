/* ==========================================================
   OPENER — logo, then title, then Begin. ~2.5s, skippable.
   ========================================================== */
(function () {
  "use strict";

  const intro = document.getElementById("intro");
  const beginBtn = intro.querySelector(".intro-begin");
  const skipBtn = intro.querySelector(".intro-skip");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const params = new URLSearchParams(location.search);
  const timers = [];
  let finished = false;

  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const add = (...c) => intro.classList.add(...c);

  function showBegin() {
    add("st-logo", "st-title", "st-begin");
    beginBtn.focus({ preventScroll: true });
  }

  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    window.FixThePrompt && window.FixThePrompt.start();
    add("out");
    setTimeout(() => { add("gone"); intro.setAttribute("aria-hidden", "true"); }, reduced ? 0 : 650);
  }

  beginBtn.addEventListener("click", finish);
  skipBtn.addEventListener("click", showBegin);
  document.addEventListener("keydown", (e) => {
    if (finished || e.key !== "Escape") return;
    e.preventDefault();
    showBegin();
  });

  // Dev link, or returning mid-session: bypass the opener entirely
  const resumed = window.FixThePrompt && window.FixThePrompt.resumed;
  if (params.has("skipintro") || resumed) {
    finish();
    intro.classList.add("gone");
    return;
  }

  if (reduced) { showBegin(); return; }
  at(250, () => add("st-logo"));
  at(1500, () => add("st-title"));
  at(2500, showBegin);
})();
