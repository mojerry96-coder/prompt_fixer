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

  function lesson(prompt, tier, check) {
    if (tier === "weak") return GENERIC_LESSON;
    const x = pick(prompt);

    if (tier === "strong") {
      const title = `Lesson plan: ${esc(E.cap(x.topic) || "your topic")}${x.duration ? ` · ${esc(x.duration)}` : ""}`;
      return heading(title, x.audience ? esc(E.cap(x.audience)) : "") + outline([
        ["Learning outcomes", `Students can explain the key ideas of ${esc(x.topicLower)} and why they matter.`],
        ["Starter (5 min)", `Think–pair–share: what do they already know about ${esc(x.topicLower)}?`],
        ["Main teaching", "Short explanation, one worked example, then a guided group task."],
        ["Check for understanding", "Three quick questions, answered on mini-whiteboards."],
        ["Plenary", "One-minute written reflection: one thing learned, one question left."]
      ]);
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
