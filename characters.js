/* ==========================================================
   Characters — hand-drawn cast, generated on Higgsfield and
   animated as looping clips with transparent backgrounds.
     tade  — the lecturer (orange): walk, puzzled
     sage  — the AI helper (blue, glasses): think
     kemi  — the fixer (green, pencil): talk
     trio  — all three: wave, cheer
   Each clip ships as HEVC-with-alpha (.mov, Safari) and VP9-with-alpha
   (.webm, everyone else), plus a poster frame used for reduced motion.
   ========================================================== */
(function (global) {
  "use strict";

  const BASE = "assets/cast/";
  const reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** clip("sage-think", { cls: "…" }) → markup for a looping, silent, decorative clip */
  function clip(name, opts = {}) {
    const cls = `cast cast-${name} ${opts.cls || ""}`.trim();
    if (reduced) return `<img class="${cls}" src="${BASE}${name}.png" alt="" aria-hidden="true" />`;
    return `
      <video class="${cls}" autoplay loop muted playsinline disablepictureinpicture preload="auto"
        poster="${BASE}${name}.png" aria-hidden="true" tabindex="-1">
        <source src="${BASE}${name}.mov" type='video/quicktime; codecs="hvc1"' />
        <source src="${BASE}${name}.webm" type="video/webm" />
      </video>`;
  }

  global.Characters = { clip };
})(window);
