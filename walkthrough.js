/* ==========================================================
   Loading screen + walkthrough
   The walkthrough plays the real interface by itself, with a
   different example ("Plan a meeting…") so it shows *how* to
   play without giving away the lesson-plan answers.
   ========================================================== */
(function (global) {
  "use strict";

  const C = global.Characters;
  const reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 200) : ms));
  const VO_BASE = "assets/vo/";

  /* ---------------- Loading screen: Tade walking on the spot ---------------- */
  function loader(ms = 1700) {
    const el = document.createElement("div");
    el.className = "scene-loader";
    el.setAttribute("role", "status");
    el.innerHTML = `${C.clip("tade-walk")}<span class="sr-only">Loading</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("in"));
    return wait(ms).then(() => {
      el.classList.remove("in");
      return wait(420);
    }).then(() => el.remove());
  }

  /* ---------------- Walkthrough scenes ---------------- */
  const DEMO_PROMPT = "Plan a meeting about exam timetables.";
  const DEMO_FIX = "Plan a 30-minute meeting for the Year 2 teaching team about exam timetables, as an agenda with timings.";

  const row = (tone, icon, b, t) => `<li><span class="ic ic-${tone}" aria-hidden="true"><i class="ph ${icon}"></i></span><b>${b}</b><span>${t}</span></li>`;
  const avatar = () => document.querySelector(".topbar .brand")?.innerHTML.includes("<img")
    ? `<span class="avatar" aria-hidden="true"><img src="assets/miva-mark.png" alt="" /></span>`
    : `<span class="avatar" aria-hidden="true"><span class="mark-fp">FP</span></span>`;

  const GENERIC_AGENDA = `
    <div class="reply">
      <p class="r-lead">Here is a meeting agenda you can adapt to your needs.</p>
      <h3 class="r-title">Meeting Agenda</h3>
      <ul class="r-rows">
        ${row("blue", "ph-users-three", "Welcome", "Introductions")}
        ${row("teal", "ph-megaphone", "Updates", "General updates")}
        ${row("violet", "ph-chats-circle", "Discussion", "Open discussion")}
        ${row("blue", "ph-dots-three", "Other", "Anything else")}
      </ul>
    </div>`;

  const STRONG_AGENDA = `
    <div class="ai-head"><span class="tier tier-strong"><i class="ph-fill ph-check-circle" aria-hidden="true"></i>Strong</span><span class="ai-note">Specific and ready to use.</span></div>
    <div class="reply">
      <p class="r-lead">Here's the 30-minute agenda you asked for, for the Year 2 teaching team.</p>
      <h3 class="r-title">Exam timetables · 30 minutes</h3>
      <p class="r-sub">Year 2 teaching team</p>
      <ol class="r-outline">
        <li><b>Welcome and aims</b><span>2 min</span></li>
        <li><b>Walk through the draft timetable</b><span>10 min</span></li>
        <li><b>Clashes and fixes</b><span>12 min</span></li>
        <li><b>Actions and owners</b><span>6 min</span></li>
      </ol>
    </div>`;

  const DIAG_ROWS = [
    ["context", "who it’s for?", "Context", "ph-users-three", "blue"],
    ["task", "what exactly to write?", "Task", "ph-gear-six", "teal"],
    ["format", "what shape the answer takes?", "Format", "ph-file-text", "violet"]
  ];

  const SCENES = [
    {
      vo: "vo1.mp3", min: 7900,
      caption: "Welcome. In this simulation, you’ll take a prompt that gets a weak answer from AI, and fix it.",
      html: () => `<div class="wt-hero">${C.clip("trio-wave")}</div>`
    },
    {
      vo: "vo2.mp3", min: 11000,
      caption: "Here’s an example. Someone typed: “Plan a meeting about exam timetables.” The reply is generic. It could be for any team, and any meeting.",
      html: () => `
        <div class="wt-thread">
          <div class="step"><span class="step-eyebrow">Example</span></div>
          <div class="msg msg-user"><span class="msg-meta">The prompt</span><div class="bubble">${DEMO_PROMPT}</div></div>
          <div class="msg msg-ai wt-later" data-show="3600">${avatar()}<div class="ai-body">${GENERIC_AGENDA}</div></div>
        </div>`,
      run: async (s) => { await wait(3600); s.show("[data-show]"); }
    },
    {
      vo: "vo3.mp3", min: 13400,
      caption: "First, check what the prompt is missing. Does it say who it’s for? What exactly is needed? What shape the answer should take? Choose yes or no for each, then confirm.",
      html: () => `
        <div class="dock-inner wt-panel">
          <div class="diag-prompt"><span>The prompt</span><p>“${DEMO_PROMPT}”</p></div>
          <p class="diag-q">Does it say…</p>
          <div class="diag-grid">
            ${DIAG_ROWS.map(([k, q, label, icon, tone]) => `
              <div class="diag-row">
                <span class="ic ic-${tone}" aria-hidden="true"><i class="ph ${icon}"></i></span>
                <div class="diag-text"><b>${q}</b><small>${label}</small></div>
                <div class="seg">
                  <button type="button" tabindex="-1" class="seg-btn" data-k="${k}-yes" aria-checked="false">Yes</button>
                  <button type="button" tabindex="-1" class="seg-btn" data-k="${k}-no" aria-checked="false">No</button>
                </div>
              </div>`).join("")}
          </div>
          <div class="dock-row end"><button type="button" tabindex="-1" class="primary-cta" data-k="confirm" disabled>Confirm <i class="ph-bold ph-arrow-right" aria-hidden="true"></i></button></div>
        </div>`,
      // A mixed answer on purpose: the demo never hints that all three are missing in the real task.
      run: async (s) => {
        await wait(3200); await s.tap('[data-k="context-no"]');
        await wait(1600); await s.tap('[data-k="task-yes"]');
        await wait(1700); await s.tap('[data-k="format-no"]');
        s.q('[data-k="confirm"]').disabled = false;
        await wait(2000); await s.tap('[data-k="confirm"]', true);
      }
    },
    {
      vo: "vo4.mp3", min: 9800,
      caption: "Next, rewrite the prompt and send it. The AI replies straight away, and you’ll see how strong your prompt is.",
      html: () => `
        <div class="wt-thread">
          <div class="msg msg-user wt-later" data-show="sent"><span class="msg-meta">Your fix</span><div class="bubble">${DEMO_FIX}</div></div>
          <div class="msg msg-ai wt-later" data-show="thinking">
            ${avatar()}
            <div class="ai-body"><div class="wt-think">${C.clip("sage-think")}<p class="think-line">Putting that together…</p></div></div>
          </div>
          <div class="msg msg-ai wt-later" data-show="reply">${avatar()}<div class="ai-body">${STRONG_AGENDA}</div></div>
          <div class="composer wt-composer" data-show="composer">
            <textarea tabindex="-1" rows="2" readonly aria-hidden="true"></textarea>
            <div class="composer-foot">
              <span class="tries" aria-hidden="true"><i></i><i></i><i></i></span>
              <button type="button" tabindex="-1" class="send" data-k="send" disabled><i class="ph-bold ph-arrow-up" aria-hidden="true"></i></button>
            </div>
          </div>
        </div>`,
      run: async (s) => {
        await wait(500);
        await s.type("textarea", DEMO_FIX, 3600);
        s.q('[data-k="send"]').disabled = false;
        await s.tap('[data-k="send"]', true);
        s.hide('[data-show="composer"]');
        s.show('[data-show="sent"]');
        s.show('[data-show="thinking"]');
        await wait(1900);
        s.hide('[data-show="thinking"]');
        s.cursorOff();
        s.show('[data-show="reply"]');
      }
    },
    {
      vo: "vo5.mp3", min: 7700,
      caption: "You have three tries to get it right. After that, there’s one new prompt to fix on your own, with no hints.",
      html: () => `
        <div class="wt-tries">
          <div class="wt-dots" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="wt-cold wt-later" data-show="cold">
            <span class="step-eyebrow">New prompt</span>
            <div class="wt-dots one" aria-hidden="true"><i></i></div>
          </div>
        </div>`,
      run: async (s) => {
        const dots = [...s.root.querySelectorAll(".wt-dots:not(.one) i")];
        for (const d of dots) { await wait(700); d.classList.add("used"); }
        await wait(1400);
        s.show('[data-show="cold"]');
      }
    },
    {
      vo: "vo6.mp3", min: 4400, end: true,
      caption: "There’s no timer, so take your time. Ready? Let’s begin.",
      html: () => `<div class="wt-hero">${C.clip("trio-cheer")}<button type="button" class="primary-cta wt-begin" data-k="begin">Let’s begin <i class="ph-bold ph-arrow-right" aria-hidden="true"></i></button></div>`
    }
  ];

  /* ---------------- Player ---------------- */
  function run() {
    return new Promise((resolve) => {
      const el = document.createElement("div");
      el.className = "wt";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      el.setAttribute("aria-label", "How it works");
      el.innerHTML = `
        <div class="wt-top">
          <span class="step-eyebrow">How it works</span>
          <div class="wt-controls">
            <button type="button" class="icon-btn" data-k="mute" aria-pressed="false" aria-label="Mute narration"><i class="ph ph-speaker-high" aria-hidden="true"></i></button>
            <button type="button" class="ghost-btn" data-k="skip">Skip <i class="ph-bold ph-skip-forward" aria-hidden="true"></i></button>
          </div>
        </div>
        <div class="wt-stage"></div>
        <div class="wt-bottom">
          <div class="wt-host">${C.clip("kemi-talk")}</div>
          <p class="wt-caption" aria-live="polite"></p>
        </div>
        <div class="wt-progress" aria-hidden="true"><i></i></div>
        <div class="wt-cursor" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28"><path d="M5 3l14 8-6 1.6L10 19z" fill="#fff" stroke="#1C2B6B" stroke-width="1.8" stroke-linejoin="round"/></svg>
        </div>`;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add("in"));

      const stage = el.querySelector(".wt-stage");
      const caption = el.querySelector(".wt-caption");
      const host = el.querySelector(".wt-host .cast");
      const talk = (on) => { if (host && host.play) { if (on) host.play().catch(() => {}); else host.pause(); } };
      const cursor = el.querySelector(".wt-cursor");
      const bar = el.querySelector(".wt-progress i");
      const audio = new Audio();
      let muted = false, done = false;

      const finish = () => {
        if (done) return;
        done = true;
        audio.pause();
        el.classList.remove("in");
        setTimeout(() => { el.remove(); resolve(); }, reduced ? 0 : 420);
      };

      el.querySelector('[data-k="skip"]').addEventListener("click", finish);
      const muteBtn = el.querySelector('[data-k="mute"]');
      muteBtn.addEventListener("click", () => {
        muted = !muted;
        audio.muted = muted;
        muteBtn.setAttribute("aria-pressed", String(muted));
        muteBtn.setAttribute("aria-label", muted ? "Unmute narration" : "Mute narration");
        muteBtn.innerHTML = `<i class="ph ${muted ? "ph-speaker-slash" : "ph-speaker-high"}" aria-hidden="true"></i>`;
      });
      el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); finish(); } });

      // Scene helpers
      const helpers = (root) => ({
        root,
        q: (sel) => root.querySelector(sel),
        show: (sel) => root.querySelector(sel)?.classList.add("shown"),
        cursorOff: () => cursor.classList.remove("on"),
        hide: (sel) => root.querySelector(sel)?.classList.add("gone"),
        async tap(sel, primary) {
          const target = root.querySelector(sel);
          if (!target || done) return;
          const r = target.getBoundingClientRect(), o = el.getBoundingClientRect();
          cursor.classList.add("on");
          cursor.style.transform = `translate(${r.left - o.left + r.width / 2 - 6}px, ${r.top - o.top + r.height / 2 - 4}px)`;
          await wait(650);
          cursor.classList.add("press");
          target.classList.add("pressed");
          if (!primary) {
            target.parentElement.querySelectorAll(".seg-btn").forEach((b) => b.setAttribute("aria-checked", String(b === target)));
          }
          await wait(220);
          cursor.classList.remove("press");
          target.classList.remove("pressed");
        },
        async type(sel, text, ms) {
          const ta = root.querySelector(sel);
          const step = ms / text.length;
          for (let i = 1; i <= text.length && !done; i++) { ta.value = text.slice(0, i); await wait(step); }
        }
      });

      function playVO(file) {
        return new Promise((res) => {
          audio.src = VO_BASE + file;
          audio.muted = muted;
          audio.onended = res;
          audio.onerror = res;
          const p = audio.play();
          if (p && p.catch) p.catch(res); // autoplay blocked or file missing: carry on silently
        });
      }

      async function scene(i) {
        if (done) return;
        const sc = SCENES[i];
        stage.classList.remove("enter");
        stage.innerHTML = sc.html();
        void stage.offsetWidth;
        stage.classList.add("enter");
        cursor.classList.remove("on");
        caption.textContent = sc.caption;
        talk(true);
        bar.style.width = `${((i + 1) / SCENES.length) * 100}%`;

        const beginBtn = stage.querySelector('[data-k="begin"]');
        if (beginBtn) { beginBtn.addEventListener("click", finish); beginBtn.focus({ preventScroll: true }); }

        const started = performance.now();
        const vo = playVO(sc.vo).then(() => talk(false));
        const actions = sc.run ? sc.run(helpers(stage)) : Promise.resolve();
        await Promise.all([vo, actions]);
        const left = sc.min - (performance.now() - started);
        if (left > 0) await wait(left);
        talk(false);
        if (sc.end) return; // wait for "Let's begin"
        await wait(600);
        if (i + 1 < SCENES.length) scene(i + 1);
      }

      el.querySelector('[data-k="skip"]').focus({ preventScroll: true });
      scene(0);
    });
  }

  global.Walkthrough = { run, loader };
})(window);
