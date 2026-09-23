/* ==========================================================
   OPENER — each logo arrives on its own at the centre, then
   settles into the line. ~4.5s, skippable.
   ========================================================== */
(function () {
  "use strict";

  const intro = document.getElementById("intro");
  const row = intro.querySelector(".intro-logos");
  const logos = [...intro.querySelectorAll(".intro-logo")];
  const beginBtn = intro.querySelector(".intro-begin");
  const skipBtn = intro.querySelector(".intro-skip");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const params = new URLSearchParams(location.search);
  const timers = [];
  let finished = false;

  const at = (ms, fn) => timers.push(setTimeout(fn, ms));

  /** Offset that parks a logo at the centre of the row until it settles. */
  function measure() {
    // Layout positions only — getBoundingClientRect would include the entry scale
    const mid = row.offsetLeft + row.offsetWidth / 2;
    logos.forEach((el) => {
      if (el.classList.contains("set")) return;
      el.style.setProperty("--cx", `${mid - (el.offsetLeft + el.offsetWidth / 2)}px`);
    });
  }

  function showBegin() {
    timers.forEach(clearTimeout);
    logos.forEach((el) => el.classList.add("in", "set"));
    intro.classList.add("st-line", "st-title", "st-begin");
    beginBtn.focus({ preventScroll: true });
  }

  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    window.FixThePrompt && window.FixThePrompt.start();
    intro.classList.add("out");
    setTimeout(() => { intro.classList.add("gone"); intro.setAttribute("aria-hidden", "true"); }, reduced ? 0 : 700);
  }

  beginBtn.addEventListener("click", finish);
  skipBtn.addEventListener("click", showBegin);
  document.addEventListener("keydown", (e) => {
    if (finished || e.key !== "Escape") return;
    e.preventDefault();
    showBegin();
  });
  window.addEventListener("resize", measure);

  // Dev link, or returning mid-session: bypass the opener entirely
  const resumed = window.FixThePrompt && window.FixThePrompt.resumed;
  if (params.has("skipintro") || resumed) {
    finish();
    intro.classList.add("gone");
    return;
  }

  if (reduced) { showBegin(); return; }

  // One logo at a time: arrive at the centre, hold, then slide into its slot.
  function play() {
    if (finished) return;
    measure();
    const ENTER = 350, GAP = 1050, HOLD = 800;
    logos.forEach((el, i) => {
      at(ENTER + i * GAP, () => { measure(); el.classList.add("in"); });
      at(ENTER + i * GAP + HOLD, () => el.classList.add("set"));
    });
    const settled = ENTER + (logos.length - 1) * GAP + HOLD;
    at(settled + 500, () => intro.classList.add("st-line"));
    at(settled + 750, () => intro.classList.add("st-title"));
    at(settled + 1400, () => { intro.classList.add("st-begin"); beginBtn.focus({ preventScroll: true }); });
  }

  // The logos must be laid out before the centre offsets mean anything.
  const imgs = [...intro.querySelectorAll(".intro-logo img")];
  Promise.all(imgs.map((img) => img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })))
    .then(() => requestAnimationFrame(play));
})();
