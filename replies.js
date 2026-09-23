/* ==========================================================
   Simulated AI replies — deterministic templates per tier.
   The evaluator decides the tier; these only draw the result.
   ========================================================== */
(function (global) {
  "use strict";

  const E = global.PromptEvaluator;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lc = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

  function pick(prompt) {
    const topic = E.extractTopic(prompt);
    return {
      topic,
      topicLower: topic ? lc(topic) : "the topic",
      audience: E.extractAudience(prompt),
      duration: E.extractDuration(prompt),
      count: E.extractCount(prompt)
    };
  }

  const heading = (title, sub, missing) => `
    <h3 class="r-title">${title}</h3>
    ${sub ? `<p class="r-sub${missing ? " r-missing" : ""}">${sub}</p>` : ""}`;

  const outline = (rows, faint) => `
    <ol class="r-outline${faint ? " faint" : ""}">
      ${rows.map(([b, t]) => `<li><b>${b}</b><span>${t}</span></li>`).join("")}
    </ol>`;

  /* ---------------- Lesson plan (the starting prompt) ---------------- */
  // Kept short on purpose: a glance should show it's generic, not a wall of prose.
  const row = (tone, icon, b, t) => `<li><span class="ic ic-${tone}" aria-hidden="true"><i class="ph ${icon}"></i></span><b>${b}</b><span>${t}</span></li>`;
  const GENERIC_LESSON = `
    <h3 class="r-title">Lesson Plan</h3>
    <ul class="r-rows">
      ${row("blue", "ph-target", "Objectives", "Understand the key concepts")}
      ${row("teal", "ph-list-checks", "Activities", "Introduction, discussion, group work")}
      ${row("violet", "ph-chart-bar", "Assessment", "Questions or a quiz")}
      ${row("blue", "ph-book-open", "Resources", "Textbooks and slides")}
    </ul>`;

  /* ---- Strong lesson plans -------------------------------------------------
     Both the shape of the plan and its activities come from the prompt, so two
     different topics never get the same plan and one prompt always gets the
     same one. Kept to five short lines: the point is the prompt, not the plan. */

  const FAMILY = [
    ["science", /\b(biolog|chemis|physic|photosynth|genetic|ecolog|ecosystem|climate|evolution|cell|molecul|energy|experiment|scien)/i],
    ["maths", /\b(math|algebra|calculus|geometr|statistic|probability|trigonometr|equation|fraction|\\bnumbers?\\b)/i],
    ["language", /\b(english|grammar|writing|essay|literature|poetry|poem|french|spanish|yoruba|igbo|hausa|arabic|language|reading|phonic|vocabular)/i],
    ["humanities", /\b(history|geograph|civic|religio|philosoph|sociolog|anthropolog|politic|culture|governance|colonial|empire)/i],
    ["business", /\b(econom|account|finance|marketing|management|business|entrepreneur|supply|demand|budget)/i],
    ["health", /\b(nurs|medicine|medical|pharmacolog|anatomy|patient|clinical|health|hygiene|first aid|disease)/i],
    ["computing", /\b(comput|programm|coding|python|java|software|algorithm|data science|database|machine learning|artificial intelligence|cyber)/i],
    ["arts", /\b(art|music|drama|theatre|dance|design|painting|sculpt|film|photograph)/i],
    ["law", /\b(law|legal|ethic|justice|constitution|policy|rights)/i]
  ];

  const ACTIVITIES = {
    science: {
      outcome: (t) => `Students can explain how ${t} works and why it matters.`,
      hook: (t) => `Quick demonstration of ${t} — students predict what will happen.`,
      recap: (t) => `Two questions on last week's work, then a first look at ${t}.`,
      explain: (t) => `Board walk-through of ${t} with one labelled diagram.`,
      practise: (t) => `Pairs label a diagram of ${t} and correct two planted errors.`,
      apply: (t) => `Groups predict what changes if one condition in ${t} is altered.`,
      check: (t) => `Three quick questions on ${t} on mini-whiteboards.`,
      close: (t) => `Each student writes one sentence explaining ${t} to a friend.`
    },
    maths: {
      outcome: (t) => `Students can work through ${t} problems and explain each step.`,
      hook: (t) => `Warm-up: one ${t} problem on the board, solved together.`,
      recap: (t) => `Three quick recall questions, then the first ${t} example.`,
      explain: (t) => `Worked example, step by step, with the common slips named.`,
      practise: (t) => `Five graded ${t} questions, easiest first.`,
      apply: (t) => `Pairs write their own ${t} problem and swap to solve.`,
      check: (t) => `Two exit questions: one routine, one that needs reasoning.`,
      close: (t) => `Students note the step in ${t} they still find hardest.`
    },
    language: {
      outcome: (t) => `Students can use ${t} accurately in their own writing.`,
      hook: (t) => `Read a short passage aloud and spot ${t} in it.`,
      recap: (t) => `Quick recall of last lesson, then today's focus on ${t}.`,
      explain: (t) => `Model one clear example of ${t}, thinking aloud while writing.`,
      practise: (t) => `Students rewrite three weak sentences using ${t}.`,
      apply: (t) => `Pairs draft a short paragraph using ${t}, then swap for feedback.`,
      check: (t) => `Cold-call three students for an example of ${t}.`,
      close: (t) => `Each student reads out one sentence they are proud of.`
    },
    humanities: {
      outcome: (t) => `Students can describe ${t} and give evidence for their view.`,
      hook: (t) => `Show one source on ${t} and ask what it suggests.`,
      recap: (t) => `Timeline recap, then where ${t} fits into it.`,
      explain: (t) => `Short explanation of ${t} with two contrasting viewpoints.`,
      practise: (t) => `Students sort five statements about ${t} into fact and opinion.`,
      apply: (t) => `Groups argue one side of a question on ${t}, using evidence.`,
      check: (t) => `Three questions on ${t}, answered in one line each.`,
      close: (t) => `Students write down the strongest point they heard today.`
    },
    business: {
      outcome: (t) => `Students can apply ${t} to a realistic business decision.`,
      hook: (t) => `A real headline about ${t} — what would you do?`,
      recap: (t) => `Recall the key terms, then introduce ${t}.`,
      explain: (t) => `Explain ${t} with one worked figure on the board.`,
      practise: (t) => `Students complete a short ${t} calculation or table.`,
      apply: (t) => `Groups advise a small business on ${t} and justify the call.`,
      check: (t) => `Two questions: one definition, one application of ${t}.`,
      close: (t) => `Each student names one decision ${t} would change.`
    },
    health: {
      outcome: (t) => `Students can carry out ${t} correctly and explain each step.`,
      hook: (t) => `A short case: a patient scenario involving ${t}.`,
      recap: (t) => `Recall the safety points, then today's focus on ${t}.`,
      explain: (t) => `Demonstrate ${t} step by step, naming each check.`,
      practise: (t) => `Students practise ${t} in pairs against a checklist.`,
      apply: (t) => `Groups decide what to do when the case changes mid-way.`,
      check: (t) => `Spot-check three steps of ${t} at random.`,
      close: (t) => `Each student names the step most easily missed.`
    },
    computing: {
      outcome: (t) => `Students can use ${t} to solve a small, defined problem.`,
      hook: (t) => `Show a short piece of broken code involving ${t} — what's wrong?`,
      recap: (t) => `Quick recall of the basics, then today's work on ${t}.`,
      explain: (t) => `Live-code one clear example of ${t}, narrating each line.`,
      practise: (t) => `Students complete a partly written ${t} exercise.`,
      apply: (t) => `Pairs extend the example to handle one new case.`,
      check: (t) => `Trace a short ${t} example by hand and predict the output.`,
      close: (t) => `Students write one line on what ${t} is useful for.`
    },
    arts: {
      outcome: (t) => `Students can use ${t} in a piece of their own work.`,
      hook: (t) => `Show two contrasting examples of ${t} — which works, and why?`,
      recap: (t) => `Recall last week's techniques, then today's focus on ${t}.`,
      explain: (t) => `Demonstrate ${t} in front of the class, talking through the choices.`,
      practise: (t) => `Students try ${t} in a short, low-stakes exercise.`,
      apply: (t) => `Students apply ${t} to their own piece, then show one peer.`,
      check: (t) => `Gallery walk: name one thing that works in each piece.`,
      close: (t) => `Each student notes what they would change next time.`
    },
    law: {
      outcome: (t) => `Students can apply ${t} to a straightforward scenario.`,
      hook: (t) => `A short scenario raising a question about ${t}.`,
      recap: (t) => `Recall the key principles, then today's focus on ${t}.`,
      explain: (t) => `Set out the rule on ${t} with one leading example.`,
      practise: (t) => `Students match four scenarios to the right principle.`,
      apply: (t) => `Groups argue both sides of a case involving ${t}.`,
      check: (t) => `Two questions: state the rule, then apply it.`,
      close: (t) => `Each student writes the test in their own words.`
    },
    general: {
      outcome: (t) => `Students can explain the key ideas of ${t} and why they matter.`,
      hook: (t) => `Think–pair–share: what do they already know about ${t}?`,
      recap: (t) => `Quick recall of last lesson, then an introduction to ${t}.`,
      explain: (t) => `Short explanation of ${t} with one clear worked example.`,
      practise: (t) => `Students work through a short task on ${t} in pairs.`,
      apply: (t) => `Groups apply ${t} to a situation of their own choosing.`,
      check: (t) => `Three quick questions on ${t} to check understanding.`,
      close: (t) => `One-minute reflection: one thing learned, one question left.`
    }
  };

  const SHAPES = [
    { weights: [1, 1.2, 2.4, 2.2, 1], rows: [["Learning outcome", "outcome"], ["Starter", "hook"], ["Main teaching", "explain"], ["Practice", "practise"], ["Plenary", "close"]] },
    { weights: [1, 2.4, 2.2, 1.6, 0.8], rows: [["Hook", "hook"], ["Explain", "explain"], ["Guided practice", "practise"], ["Apply", "apply"], ["Exit ticket", "check"]] },
    { weights: [1, 2.4, 2.6, 1.2, 0.8], rows: [["Recap", "recap"], ["Demonstration", "explain"], ["Group task", "apply"], ["Check for understanding", "check"], ["Wrap-up", "close"]] },
    { weights: [0.8, 1.2, 2.4, 2.4, 1.2], rows: [["Outcome", "outcome"], ["Discussion opener", "hook"], ["Worked example", "explain"], ["Independent task", "practise"], ["Review", "check"]] }
  ];

  const familyOf = (prompt) => (FAMILY.find(([, re]) => re.test(prompt)) || ["general"])[0];

  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  /** Split the stated lesson length across the sections, in whole minutes. */
  function minutes(total, weights) {
    const sum = weights.reduce((a, b) => a + b, 0);
    const mins = weights.map((w) => Math.max(2, Math.round(total * w / sum)));
    let drift = mins.reduce((a, b) => a + b, 0) - total;
    for (let i = mins.length - 1; drift > 0 && i >= 0; i--) {
      const take = Math.min(drift, mins[i] - 2);
      mins[i] -= take; drift -= take;
    }
    if (drift < 0) mins[2] -= drift;
    return mins;
  }

  function lesson(prompt, tier, check) {
    if (tier === "weak") return GENERIC_LESSON;
    const x = pick(prompt);

    if (tier === "strong") {
      // Match on the subject itself — format words like "numbered" are not a subject
      const fam = ACTIVITIES[familyOf(`${x.topic} ${x.audience}`)];
      const shape = SHAPES[hash(prompt) % SHAPES.length];
      const stated = parseInt(x.duration, 10);
      const total = stated ? (/hour/i.test(x.duration) ? stated * 60 : stated) : 0;
      const mins = total ? minutes(total, shape.weights) : null;
      const t = esc(x.topicLower);
      const title = `Lesson plan: ${esc(E.cap(x.topic) || "your topic")}${x.duration ? ` · ${esc(x.duration)}` : ""}`;
      return heading(title, x.audience ? esc(E.cap(x.audience)) : "") + `
        <ol class="r-outline">
          ${shape.rows.map(([label, kind], i) => `<li><b>${label}${mins ? ` · ${mins[i]} min` : ""}</b><span>${fam[kind](t)}</span></li>`).join("")}
        </ol>`;
    }

    // getting-there: the reply shows which ingredient is still absent, without naming the rule
    if (!check.format) {
      return heading(`Lesson plan${x.topic ? `: ${esc(E.cap(x.topic))}` : ""}`, x.audience ? esc(E.cap(x.audience)) : "") + `
        <p class="r-fade">Start with a discussion, explain the main ideas, then perhaps an activity of some kind…</p>`;
    }
    if (!check.context) {
      return heading(`Lesson plan${x.topic ? `: ${esc(E.cap(x.topic))}` : ""}${x.duration ? ` · ${esc(x.duration)}` : ""}`, "Pitched at a general audience", true) + outline([
        ["Objectives", `Understand the basics of ${esc(x.topicLower)}.`],
        ["Introduction", "A general overview suitable for any learner."],
        ["Activity", "A discussion or worksheet."],
        ["Wrap-up", "Review the key points."]
      ], true);
    }
    return heading(`Lesson plan${x.duration ? ` · ${esc(x.duration)}` : ""}`, x.audience ? esc(E.cap(x.audience)) : "") + outline([
      ["Objectives", "Topic not given, so objectives stay general."],
      ["Starter", "An icebreaker to engage the group."],
      ["Main activity", "Content to be decided."],
      ["Plenary", "A short reflection."]
    ], true);
  }

  /* ---------------- Exam questions (the cold-transfer prompt) ---------------- */
  const GENERIC_EXAM = `
    <h3 class="r-title">Exam Questions</h3>
    <ol class="r-plain faint">
      <li>Explain the main concepts of the topic.</li>
      <li>Discuss why this subject matters.</li>
      <li>Give examples to support your answer.</li>
    </ol>`;

  const STRONG_QUESTIONS = [
    (t) => [`Define ${t} and explain, with one example, why it matters in practice.`, 4],
    (t) => [`Compare two approaches to ${t}. Which would you recommend, and why?`, 8],
    (t) => [`Describe a common misconception about ${t} and how you would correct it.`, 6],
    (t) => [`Apply ${t} to a short scenario of your choice, showing each step of your reasoning.`, 10],
    (t) => [`Evaluate one limitation of current thinking on ${t}.`, 7],
    (t) => [`Summarise the key terms of ${t} in no more than 100 words.`, 5]
  ];

  function exam(prompt, tier, check) {
    if (tier === "weak") return GENERIC_EXAM;
    const x = pick(prompt);
    const n = Math.min(x.count || 5, STRONG_QUESTIONS.length);
    const t = esc(x.topicLower);

    if (tier === "strong") {
      const qs = STRONG_QUESTIONS.slice(0, n).map((f) => f(t));
      const total = qs.reduce((a, q) => a + q[1], 0);
      return heading(`Exam questions: ${esc(E.cap(x.topic) || "your topic")}`, x.audience ? `${esc(E.cap(x.audience))} · ${total} marks` : `${total} marks`) + `
        <ol class="r-questions">
          ${qs.map(([q, m]) => `<li><span>${q}</span><em>${m} marks</em></li>`).join("")}
        </ol>`;
    }

    if (!check.format) {
      return heading(`Exam questions${x.topic ? `: ${esc(E.cap(x.topic))}` : ""}`, x.audience ? esc(E.cap(x.audience)) : "") + `
        <p class="r-fade">You could ask students to define ${t}, discuss why it matters, or apply it to a case…</p>`;
    }
    if (!check.context) {
      return heading(`Exam questions${x.topic ? `: ${esc(E.cap(x.topic))}` : ""}`, "Level not specified", true) + `
        <ol class="r-plain faint">
          <li>What is ${t}?</li>
          <li>List the main features of ${t}.</li>
          <li>Why is ${t} important?</li>
        </ol>`;
    }
    return heading("Exam questions", x.audience ? esc(E.cap(x.audience)) : "") + `
      <ol class="r-plain faint">
        <li>Explain a key concept from your course.</li>
        <li>Discuss a topic you have studied this term.</li>
        <li>Describe one theory and give an example.</li>
      </ol>`;
  }

  global.Replies = { lesson, exam, GENERIC_LESSON, GENERIC_EXAM };
})(window);
