/* ==========================================================
   FIX THE PROMPT — single-page controller
   One conversation, one composer. The stage changes what the
   composer asks for; the evaluator runs silently and only the
   reply it produces is shown.
   ========================================================== */
(function () {
  "use strict";

  const E = window.PromptEvaluator;
  const R = window.Replies;
  const STORAGE_KEY = "fix-the-prompt:v2";
  const MAX_ATTEMPTS = 3;
  const ORIGINAL_P1 = "Write a lesson plan.";
  const ORIGINAL_P2 = "Give me exam questions.";

  const STAGES = ["intro", "diagnose", "revise", "revised", "cold", "cold-done", "end", "closed"];
  const STAGE_LABEL = {
    intro: "", diagnose: "Diagnose the gap", revise: "Revise and test", revised: "Revise and test",
    cold: "Fix it cold", "cold-done": "Fix it cold", end: "Before and after", closed: "Before and after"
  };

  const INGREDIENTS = [
    { key: "context", label: "Context", q: "who it’s for?", icon: "ph-users-three", tone: "blue",
      reason: "Never says who it’s for." },
    { key: "task", label: "Task", q: "what exactly to write?", icon: "ph-gear-six", tone: "teal",
      reason: "Never says the topic." },
    { key: "format", label: "Format", q: "what shape the answer takes?", icon: "ph-file-text", tone: "violet",
      reason: "Never says the length or shape." }
  ];

  const TIER = {
    weak: { label: "Weak", sub: "Generic — could suit any class.", icon: "ph-warning-circle", rank: 0 },
    "getting-there": { label: "Getting there", sub: "Closer — one thing still missing.", icon: "ph-trend-up", rank: 1 },
    strong: { label: "Strong", sub: "Specific and ready to use.", icon: "ph-check-circle", rank: 2 }
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // What the assistant says while it works, in two beats
  const WORKING_FIRST = ["Reading your prompt…", "Looking at what you've asked for…", "Taking that in…"];
  const WORKING_THEN = ["Putting that together…", "Writing it up now…", "Drafting that for you…", "Pulling the plan together…"];
  const anyOf = (list) => list[Math.floor(Math.random() * list.length)];

  /* ---------------- State ---------------- */
  function freshState() {
    return {
      stage: "intro",
      gap: { context: null, task: null, format: null },
      attempts: [],
      asides: [],   // messages that were not a rewrite: questions, chat, off-task requests
      reviseDraft: ORIGINAL_P1,
      cold: null,
      coldDraft: "",
      complete: false
    };
  }
  let state = freshState();
  let busy = false; // true while a reply is "thinking"

  const at = (s) => STAGES.indexOf(state.stage) >= STAGES.indexOf(s);
  const lastAttempt = () => state.attempts[state.attempts.length - 1] || null;

  function result() {
    const last = lastAttempt();
    return {
      gapDiagnosis: { ...state.gap },
      gapCorrect: Object.fromEntries(INGREDIENTS.map((i) => [i.key, state.gap[i.key] === "missing"])),
      revisionAttempts: state.attempts.map(({ prompt, tier }) => ({ prompt, tier })),
      finalRevisionPrompt: last ? last.prompt : "",
      finalRevisionTier: last ? last.tier : null,
      coldTransferPrompt: state.cold ? state.cold.prompt : "",
      coldTransferTier: state.cold ? state.cold.tier : null,
      completionStatus: state.complete
    };
  }

  function save() {
    window.FixThePromptResult = result();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable — keep going in memory */ }
  }

  function load() {
    try {
      if (new URLSearchParams(location.search).has("reset")) { localStorage.removeItem(STORAGE_KEY); return; }
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && !saved.complete && STAGES.includes(saved.stage)) state = Object.assign(freshState(), saved);
    } catch (e) { /* ignore */ }
  }

  /* ---------------- Helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const arrow = `<i class="ph-bold ph-arrow-right" aria-hidden="true"></i>`;
  function announce(msg) { const el = $("#live"); el.textContent = ""; setTimeout(() => (el.textContent = msg), 40); }

  function tierBadge(tier) {
    const t = TIER[tier];
    return `<span class="tier tier-${tier}"><i class="ph-fill ${t.icon}" aria-hidden="true"></i>${t.label}</span>`;
  }

  function chips(check) {
    return `<div class="picked" aria-label="What the reply picked up">
      ${INGREDIENTS.map((i) => `<span class="pick ${check[i.key] ? "on" : "off"}">
        <i class="ph-bold ${check[i.key] ? "ph-check" : "ph-minus"}" aria-hidden="true"></i>${i.label}
        <span class="sr-only">${check[i.key] ? "picked up" : "not picked up"}</span></span>`).join("")}
    </div>`;
  }

  /* ==========================================================
     THREAD — derived entirely from state
     ========================================================== */
  /** Off-task exchanges sit between the attempts they were sent between. */
  function asidesAt(phase, after) {
    const list = [];
    state.asides.forEach((a, n) => {
      if (a.phase !== phase || a.after !== after) return;
      list.push({ id: `as-${n}-user`, kind: "user", meta: "You", text: a.prompt });
      list.push({ id: `as-${n}-ai`, kind: "ai", tested: true, aside: true,
        html: `<p class="r-lead">${esc(a.message)}</p>` });
    });
    return list;
  }

  function items() {
    const list = [
      { id: "step-1", kind: "step", art: window.Characters.clip("tade-puzzled"), eyebrow: "The problem", text: "You’ve seen this prompt fail before. This time, you’re the one fixing it." },
      { id: "p1-user", kind: "user", meta: "The prompt", text: ORIGINAL_P1 },
      { id: "p1-ai", kind: "ai", html: R.GENERIC_LESSON, faded: at("revise") }
    ];

    if (at("revise")) {
      list.push({ id: "diag", kind: "card", html: diagnosisCard() });
      list.push({ id: "step-2", kind: "step", eyebrow: "Your turn", text: "Rewrite the prompt below. Say who it’s for, what exactly, and what shape." });
    }

    state.attempts.forEach((a, i) => {
      list.push(...asidesAt("revise", i));
      list.push({ id: `rev-${i}-user`, kind: "user", meta: "Your fix", text: a.prompt });
      list.push({ id: `rev-${i}-ai`, kind: "ai", tested: true, tier: a.tier, note: TIER[a.tier].sub,
        html: R.lesson(a.prompt, a.tier, a.check), after: chips(a.check) });
    });

    if (at("revise")) list.push(...asidesAt("revise", state.attempts.length));

    if (at("cold")) {
      list.push(...asidesAt("cold", 0));
      list.push({ id: "step-3", kind: "step", eyebrow: "New prompt", text: "Now fix this one on your own. One try, no hints." });
      list.push({ id: "p2-user", kind: "user", meta: "The prompt", text: ORIGINAL_P2 });
      list.push({ id: "p2-ai", kind: "ai", html: R.GENERIC_EXAM, faded: !!state.cold });
    }

    if (state.cold) {
      list.push({ id: "cold-user", kind: "user", meta: "Your fix", text: state.cold.prompt });
      // Cold transfer: tier only — no ingredient breakdown.
      list.push({ id: "cold-ai", kind: "ai", tested: true, tier: state.cold.tier,
        html: R.exam(state.cold.prompt, state.cold.tier, state.cold.check) });
    }

    if (at("end")) list.push({ id: "summary", kind: "card", html: summaryCard(), wide: true });
    return list;
  }

  function renderItem(item) {
    const el = document.createElement("div");
    el.dataset.id = item.id;
    if (item.kind === "user") {
      el.className = "msg msg-user";
      el.innerHTML = `${item.meta ? `<span class="msg-meta">${item.meta}</span>` : ""}<div class="bubble">${esc(item.text)}</div>`;
    } else if (item.kind === "ai") {
      el.className = "msg msg-ai" + (item.faded ? " faded" : "");
      el.innerHTML = `
        <span class="avatar" aria-hidden="true"><img src="assets/cast/sage-avatar.png" alt="" /></span>
        <div class="ai-body">
          ${item.tested ? `<div class="think-art">${window.Characters.clip("sage-think")}<p class="think-line" data-think>${anyOf(WORKING_FIRST)}</p></div>` : ""}
          ${item.tier ? `<div class="ai-head">${tierBadge(item.tier)}${item.note ? `<span class="ai-note">${item.note}</span>` : ""}</div>` : ""}
          <div class="reply${item.aside ? " reply-aside" : ""}">${item.html}</div>
          ${item.after || ""}
        </div>`;
    } else if (item.kind === "step") {
      el.className = "step";
      el.innerHTML = `${item.art ? `<div class="step-art">${item.art}</div>` : ""}<span class="step-eyebrow">${item.eyebrow}</span><p>${item.text}</p>`;
    } else if (item.kind === "divider") {
      el.className = "divider";
      el.innerHTML = `<span>${item.text}</span>`;
    } else {
      el.className = "card-item" + (item.wide ? " wide" : "");
      el.innerHTML = item.html;
    }
    return el;
  }

  const host = () => $("#thread-inner");

  /* Append anything new; update fade state on what's already there. */
  function syncThread(animate) {
    const list = items();
    const root = host();
    let fresh = [];
    list.forEach((item) => {
      let el = root.querySelector(`[data-id="${item.id}"]`);
      if (!el) {
        el = renderItem(item);
        root.appendChild(el);
        fresh.push({ el, item });
      } else if (item.kind === "ai") {
        el.classList.toggle("faded", !!item.faded);
      }
    });
    if (!animate) { hasStartedFixing() ? scrollToEnd(false) : scrollToStart(); return Promise.resolve(); }

    // Tested replies "think" first — the evaluation happens out of sight, then the result lands.
    const thinking = fresh.filter((f) => f.item.tested);
    fresh.forEach(({ el, item }) => { if (!item.tested) el.classList.add("enter"); });
    if (!thinking.length) { scrollToEnd(true); return Promise.resolve(); }

    busy = true;
    renderDock();
    thinking.forEach(({ el }) => el.classList.add("thinking"));
    scrollToEnd(true);
    // Second beat: "reading your prompt" gives way to "putting that together"
    const beat = setTimeout(() => {
      thinking.forEach(({ el }) => {
        const line = el.querySelector("[data-think]");
        if (line) line.textContent = anyOf(WORKING_THEN);
      });
    }, 850);
    return new Promise((resolve) => {
      setTimeout(() => {
        clearTimeout(beat);
        thinking.forEach(({ el }) => { el.classList.remove("thinking"); el.classList.add("reveal"); });
        busy = false;
        scrollToEnd(true);
        resolve();
      }, reducedMotion ? 150 : 1900);
    });
  }

  const hasStartedFixing = () => state.attempts.length > 0 || !!state.cold;

  function scrollToStart() {
    const t = $("#thread");
    requestAnimationFrame(() => t.scrollTo({ top: 0, behavior: "auto" }));
  }

  function scrollToEnd(smooth) {
    const t = $("#thread");
    requestAnimationFrame(() => t.scrollTo({ top: t.scrollHeight, behavior: smooth && !reducedMotion ? "smooth" : "auto" }));
  }

  /* ---------------- Cards ---------------- */
  function diagnosisCard() {
    const right = INGREDIENTS.filter((i) => state.gap[i.key] === "missing").length;
    return `
      <div class="note">
        <div class="note-head">
          <h2>All three were missing</h2>
          <span class="note-score">${right}/3</span>
        </div>
        <ul class="diag-reveal">
          ${INGREDIENTS.map((i) => {
            const ok = state.gap[i.key] === "missing";
            return `<li>
              <span class="ic ic-${i.tone}" aria-hidden="true"><i class="ph ${i.icon}"></i></span>
              <b>${i.label}</b><span class="why">${i.reason}</span>
              <i class="ph-bold ${ok ? "ph-check mark-ok" : "ph-x mark-no"}" aria-hidden="true"></i>
              <span class="sr-only">You marked ${ok ? "Missing — correct" : "Present"}</span>
            </li>`;
          }).join("")}
        </ul>
      </div>`;
  }

  function summaryCard() {
    const last = lastAttempt();
    const rt = last ? last.tier : "weak";
    const ct = state.cold ? state.cold.tier : "weak";
    const right = INGREDIENTS.filter((i) => state.gap[i.key] === "missing").length;
    const firstStrong = state.attempts.findIndex((a) => a.tier === "strong");

    let headline;
    if (ct === "strong") {
      headline = "Your cold fix reached Strong.";
    } else if (TIER[ct].rank < TIER[rt].rank) {
      headline = `With the checklist: ${TIER[rt].label}. Without it: ${TIER[ct].label}.`;
    } else {
      headline = `Your cold fix reached ${TIER[ct].label}.`;
    }

    const col = (title, tier, text) => `
      <article class="compare-col">
        <div class="compare-head"><span>${title}</span>${tierBadge(tier)}</div>
        <p class="compare-prompt">${esc(text)}</p>
      </article>`;

    return `
      <div class="summary">
        <div class="summary-art">${window.Characters.clip("trio-cheer")}</div>
        <h2 class="summary-title">${headline}</h2>
        <div class="compare">
          ${col("Original", "weak", ORIGINAL_P1)}
          ${col("Your final revision", rt, last ? last.prompt : "—")}
          ${col("Fixed cold", ct, state.cold ? state.cold.prompt : "—")}
        </div>
        <p class="strands">Diagnosis ${right}/3 · ${firstStrong >= 0 ? `Strong on try ${firstStrong + 1}` : `${state.attempts.length} ${state.attempts.length === 1 ? "try" : "tries"}`} · Cold, one try</p>
        <p class="closing-line">Context, task, format — every time.</p>
      </div>`;
  }

  /* ==========================================================
     DOCK — the one place the learner acts
     ========================================================== */
  const dock = () => $("#dock");

  function renderDock() {
    const d = dock();
    $("#stage-label").textContent = STAGE_LABEL[state.stage];
    document.body.dataset.stage = state.stage;
    const view = DOCK[state.stage];
    const inner = view.html();
    d.innerHTML = inner.includes("dock-bare") ? inner : `<div class="dock-inner">${inner}</div>`;
    d.classList.toggle("busy", busy);
    view.bind && view.bind(d);
  }

  function composer({ id, value, placeholder, label, used, total }) {
    const left = total - used;
    return `
      <div class="composer${busy ? " is-busy" : ""}">
        <label class="sr-only" for="${id}">${label}</label>
        <textarea id="${id}" rows="1" placeholder="${esc(placeholder)}" spellcheck="true" ${busy ? "disabled" : ""}>${esc(value)}</textarea>
        <div class="composer-foot">
          <span class="tries" role="img" aria-label="${left} ${left === 1 ? "try" : "tries"} left">
            ${Array.from({ length: total }, (_, n) => `<i class="${n < used ? "used" : ""}"></i>`).join("")}
          </span>
          <button type="button" class="send" data-action="send" aria-label="Test it" disabled>
            ${busy ? `<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>` : `<i class="ph-bold ph-arrow-up" aria-hidden="true"></i>`}
          </button>
        </div>
      </div>`;
  }

  function bindComposer(root, onDraft, onSend) {
    const ta = $("textarea", root);
    const btn = $('[data-action="send"]', root);
    const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 220) + "px"; };
    const refresh = () => { btn.disabled = busy || !ta.value.trim(); };
    ta.addEventListener("input", () => { onDraft(ta.value); grow(); refresh(); save(); });
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!btn.disabled) onSend(ta.value.trim()); }
    });
    btn.addEventListener("click", () => { if (!btn.disabled) onSend(ta.value.trim()); });
    grow(); refresh();
    if (!busy) setTimeout(() => { ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length); }, 60);
  }

  /* A dock that is only one button: no panel, just the action. */
  function bare(label, name, icon = arrow) {
    return `<div class="dock-bare"><button type="button" class="primary-cta" data-action="${name}">${label} ${icon}</button></div>`;
  }
  const onClick = (d, name, fn) => $(`[data-action="${name}"]`, d).addEventListener("click", fn);

  const DOCK = {
    intro: {
      html: () => bare("Start Fixing", "start"),
      bind: (d) => onClick(d, "start", () => setStage("diagnose"))
    },

    diagnose: {
      html: () => `
        <div class="diag-prompt">
          <span>The prompt</span>
          <p>“${ORIGINAL_P1}”</p>
        </div>
        <p class="diag-q" id="diag-q">Does it say…</p>
        <div class="diag-grid" role="group" aria-labelledby="diag-q">
          ${INGREDIENTS.map((i) => `
            <div class="diag-row">
              <span class="ic ic-${i.tone}" aria-hidden="true"><i class="ph ${i.icon}"></i></span>
              <div class="diag-text" id="lbl-${i.key}"><b>${i.q}</b><small>${i.label}</small></div>
              <div class="seg" role="radiogroup" aria-labelledby="lbl-${i.key}">
                ${["present", "missing"].map((v) => `
                  <button type="button" role="radio" class="seg-btn" data-key="${i.key}" data-val="${v}"
                    aria-checked="${state.gap[i.key] === v}">${v === "present" ? "Yes" : "No"}</button>`).join("")}
              </div>
            </div>`).join("")}
        </div>
        <div class="dock-row end">${`<button type="button" class="primary-cta" data-action="confirm">Confirm ${arrow}</button>`}</div>`,
      bind: (d) => {
        const confirm = $('[data-action="confirm"]', d);
        const refresh = () => {
          d.querySelectorAll(".seg-btn").forEach((b) => b.setAttribute("aria-checked", String(state.gap[b.dataset.key] === b.dataset.val)));
          confirm.disabled = !INGREDIENTS.every((i) => state.gap[i.key]);
        };
        d.querySelectorAll(".seg").forEach((group) => {
          const btns = [...group.querySelectorAll(".seg-btn")];
          btns.forEach((b, idx) => {
            b.tabIndex = state.gap[b.dataset.key] ? (state.gap[b.dataset.key] === b.dataset.val ? 0 : -1) : (idx === 0 ? 0 : -1);
            b.addEventListener("click", () => {
              state.gap[b.dataset.key] = b.dataset.val;
              btns.forEach((x) => (x.tabIndex = x === b ? 0 : -1));
              refresh(); save();
            });
            b.addEventListener("keydown", (e) => {
              if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) return;
              e.preventDefault();
              const next = btns[1 - idx];
              next.focus(); next.click();
            });
          });
        });
        refresh();
        confirm.addEventListener("click", () => {
          if (confirm.disabled) return;
          const right = INGREDIENTS.filter((i) => state.gap[i.key] === "missing").length;
          announce(`All three were missing. You spotted ${right} of 3.`);
          setStage("revise");
        });
      }
    },

    revise: {
      html: () => composer({
        id: "revise-input", value: state.reviseDraft, placeholder: "Rewrite the prompt…",
        label: "Your revised prompt. Up to three tries.", used: state.attempts.length, total: MAX_ATTEMPTS
      }),
      bind: (d) => bindComposer(d, (v) => (state.reviseDraft = v), (prompt) => {
        if (busy || state.attempts.length >= MAX_ATTEMPTS || !prompt) return;
        if (sendAside(prompt, "revise", { job: "lesson", original: ORIGINAL_P1 }, () => (state.reviseDraft = ""))) return;
        const { check, tier } = E.evaluatePrompt(prompt);
        state.attempts.push({ prompt, tier, check });
        const done = tier === "strong" || state.attempts.length >= MAX_ATTEMPTS;
        save();
        syncThread(true).then(() => {
          const left = MAX_ATTEMPTS - state.attempts.length;
          announce(`${TIER[tier].label} reply. ${TIER[tier].sub} ${done ? "" : `${left} ${left === 1 ? "try" : "tries"} left.`}`);
          if (done) setStage("revised"); else renderDock();
        });
      })
    },

    revised: {
      html: () => bare("Next", "next"),
      bind: (d) => onClick(d, "next", () => setStage("cold"))
    },

    cold: {
      html: () => composer({
        id: "cold-input", value: state.coldDraft, placeholder: "Rewrite “Give me exam questions.”",
        label: "Your revised prompt for: Give me exam questions. One try.", used: 0, total: 1
      }),
      bind: (d) => bindComposer(d, (v) => (state.coldDraft = v), (prompt) => {
        if (busy || state.cold || !prompt) return;
        if (sendAside(prompt, "cold", { job: "exam", original: ORIGINAL_P2 }, () => (state.coldDraft = ""))) return;
        const { check, tier } = E.evaluatePrompt(prompt);
        state.cold = { prompt, tier, check };
        save();
        syncThread(true).then(() => {
          announce(`${TIER[tier].label} reply.`);
          setStage("cold-done");
        });
      })
    },

    "cold-done": {
      html: () => bare("See results", "next"),
      bind: (d) => onClick(d, "next", () => setStage("end"))
    },

    end: {
      html: () => bare("Finish", "finish"),
      bind: (d) => onClick(d, "finish", () => {
        state.complete = true;
        setStage("closed");
        try {
          if (window.parent && window.parent !== window) window.parent.postMessage({ type: "fix-the-prompt:complete", result: result() }, "*");
        } catch (e) { /* not embedded */ }
      })
    },

    closed: {
      html: () => `<div class="dock-bare"><button type="button" class="ghost-btn" data-action="replay"><i class="ph ph-arrow-counter-clockwise" aria-hidden="true"></i>Start again</button></div>`,
      bind: (d) => onClick(d, "replay", () => {
        state = freshState();
        save();
        host().innerHTML = "";
        syncThread(false);
        renderDock();
        $("#thread").scrollTo({ top: 0 });
      })
    }
  };

  /**
   * If the message is not a rewrite, answer it and keep the attempt.
   * Returns true when it was handled as an aside.
   */
  function sendAside(prompt, phase, opts, clearDraft) {
    const verdict = window.Intent && window.Intent.check(prompt, opts);
    if (!verdict) return false;
    state.asides.push({
      prompt, phase, kind: verdict.kind, message: verdict.message,
      after: phase === "revise" ? state.attempts.length : 0
    });
    clearDraft();
    save();
    syncThread(true).then(() => {
      announce(verdict.message);
      renderDock();
    });
    return true;
  }

  function setStage(stage) {
    state.stage = stage;
    save();
    syncThread(true).then(() => {
      renderDock();
      const first = $("button:not([disabled]), textarea", dock());
      if (first && !$("textarea", dock())) first.focus({ preventScroll: true });
    });
  }

  /* ---------------- Boot ---------------- */
  $("#replay-walkthrough").addEventListener("click", () => window.Walkthrough.run().then(() => {
    const b = $("button, textarea", dock()); if (b) b.focus({ preventScroll: true });
  }));
  load();
  const resumed = state.stage !== "intro";
  syncThread(false);
  // Clips and images settle after first paint and change the thread's height
  if (hasStartedFixing()) window.addEventListener("load", () => scrollToEnd(false), { once: true });
  renderDock();
  save();

  window.FixThePrompt = {
    resumed,
    // Opener → loading → walkthrough → loading → simulation. A returning learner goes straight in.
    start: async () => {
      const params = new URLSearchParams(location.search);
      if (!resumed && !params.has("nowalk") && window.Walkthrough) {
        await window.Walkthrough.loader();
        await window.Walkthrough.run();
        await window.Walkthrough.loader(1300);
      }
      if (!hasStartedFixing()) scrollToStart();
      const b = $("button, textarea", dock());
      if (b) b.focus({ preventScroll: true });
    },
    reset: () => { localStorage.removeItem(STORAGE_KEY); location.reload(); },
    get state() { return state; },
    get result() { return result(); }
  };
})();
