/* ==========================================================
   Deterministic prompt evaluator — no live LLM.
   Checks for three ingredients: Context, Task, Format.
   Runs silently; the UI only ever shows the resulting reply.
   ========================================================== */
(function (global) {
  "use strict";

  /* ---------- Context: who it's for / what course or level ---------- */
  const AUDIENCE_NOUNS =
    "students?|learners?|pupils?|undergrad(?:uate)?s?|postgrad(?:uate)?s?|graduates?|freshm[ae]n|sophomores?|" +
    "beginners?|novices?|adults?|children|kids|teens?|teenagers?|trainees?|apprentices?|nurses?|" +
    "teachers?|lecturers?|educators?|researchers?|staff|employees|colleagues|cohorts?";

  const CONTEXT_RE = new RegExp(
    "\\b(" + AUDIENCE_NOUNS + "|" +
      "grade\\s*\\d+|\\d+(?:st|nd|rd|th)[- ]grade|year[- ]?\\d+|" +
      "(?:first|second|third|fourth|final|1st|2nd|3rd|4th)[- ]year|" +
      "primary|secondary|high[- ]school|middle[- ]school|elementary|university|college|" +
      "level\\s*\\d+|\\d{3}[- ]level|introductory|intermediate|advanced|" +
      "ks\\d|a[- ]levels?|gcse|mba|msc|bsc|phd|master'?s|doctoral|diploma|" +
      "(?:aged?|ages)\\s*\\d+|\\d+[- ]year[- ]olds?)\\b",
    "i"
  );

  /* ---------- Task: an action verb + a real, specific topic ---------- */
  const VERB_RE =
    /\b(create|write|design|draft|generate|develop|produce|plan|prepare|build|make|give|list|outline|suggest|propose|compose|devise|construct|provide|set|craft|summari[sz]e|explain|put together|come up with)\b/i;

  // Words that sit where a topic should be but say nothing.
  const VAGUE = "it|this|that|them|something|anything|everything|stuff|things?|topics?|subjects?|whatever|any|some|my|our|your|textbook|book|class|course|lesson|students?|the|a|an";
  const TOPIC_RE = new RegExp(
    "\\b(?:on|about|covering|regarding|exploring|introducing|focus(?:ed|ing)? on|topic(?: of)?|related to|dealing with)\\s+" +
      "(?:the\\s+|a\\s+|an\\s+)?(?!(?:" + VAGUE + ")\\b)[a-z0-9][a-z0-9'’-]{2,}",
    "i"
  );

  const SUBJECTS =
    /\b(biology|chemistry|physics|math(?:s|ematics)?|algebra|calculus|geometry|statistics|history|geography|english|literature|poetry|grammar|economics|accounting|finance|marketing|management|business|law|ethics|philosophy|psychology|sociology|anthropology|politic(?:s|al science)|computer science|programming|coding|python|java|data science|nursing|medicine|anatomy|pharmacology|engineering|art|music|drama|french|spanish|arabic|yoruba|igbo|hausa|research methods|photosynthesis|climate|ecology|genetics|evolution)\b/i;

  /* ---------- Format: an explicit shape, length or structure ---------- */
  const NUMBER_WORD = "\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty";
  const COUNT_NOUN =
    "questions?|items?|points?|activities|sections?|parts?|steps?|slides?|bullets?|examples?|tasks?|sentences?|paragraphs?|stages?|phases?|objectives?|outcomes?|columns?|rows?|mcqs?";

  // Note: "outline", "list" and "format" only count when used as a shape, not as a verb or a shrug
  // ("Outline a lesson…" is a task; "any format" is not a format).
  const FORMAT_RE = new RegExp(
    "\\b(numbered|bullet(?:ed)?(?:[- ]points?)?|bullets|table|tabular|headings?|sub-?headings?|" +
      "(?:as|in|into)\\s+(?:an?\\s+)?(?:outline|list)|(?:a|numbered|bulleted|short)\\s+list|outline format|" +
      "format(?:ted)?\\s+(?:as|in|into|like)|structured?\\s+(?:as|in|into|with|like|under)|" +
      "template|step[- ]by[- ]step|rubric|markdown|json|csv|" +
      "one[- ]page|timeline|checklist|word (?:limit|count)|\\d+\\s*words|" +
      "mark (?:allocation|scheme)s?|marks?\\s+(?:for\\s+)?(?:each|per)|answer key|model answers?|multiple[- ]choice|short[- ]answer|" +
      "(?:" + NUMBER_WORD + ")\\s+(?:[a-z'-]+\\s+){0,3}(?:" + COUNT_NOUN + ")|" +
      "\\d+\\s*[- ]?\\s*(?:minutes?|mins?|hours?|hrs?)|" +
      "(?:one|two|three|four|five|six|ninety|forty|fifty|sixty|thirty|forty-five)[- ](?:minute|hour))\\b",
    "i"
  );

  const ORIGINALS = ["write a lesson plan.", "give me exam questions."];

  function normalise(s) {
    return String(s || "").trim().replace(/\s+/g, " ");
  }

  function check(prompt) {
    const p = normalise(prompt);
    const lower = p.toLowerCase();
    if (!p || ORIGINALS.includes(lower) || ORIGINALS.includes(lower + ".")) {
      return { context: false, task: false, format: false };
    }
    const context = CONTEXT_RE.test(p);
    const task = VERB_RE.test(p) && (TOPIC_RE.test(p) || SUBJECTS.test(p));
    const format = FORMAT_RE.test(p);
    return { context, task, format };
  }

  function getTier(c) {
    const count = Number(c.context) + Number(c.task) + Number(c.format);
    if (count <= 1) return "weak";
    if (count === 2) return "getting-there";
    return "strong";
  }

  function evaluatePrompt(prompt) {
    const c = check(prompt);
    return { check: c, tier: getTier(c) };
  }

  /* ---------- light extraction for reply previews ---------- */
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function trimTo(s, n) { s = s.trim(); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; }

  function extractTopic(prompt) {
    const p = normalise(prompt);
    const m = p.match(
      /\b(?:on|about|covering|regarding|exploring|introducing|focus(?:ed|ing)? on|related to)\s+(?:the\s+topic\s+of\s+)?([^.,;:\n]+?)(?=\s+(?:for|to|with|that|which|including|include|and present|and format|in a|in the form|as a|as an|using|so|at)\b|[.,;:\n!?]|$)/i
    );
    if (m && m[1] && m[1].length > 2 && !new RegExp("^(?:" + VAGUE + ")$", "i").test(m[1])) {
      return trimTo(m[1].replace(/^the\s+/i, ""), 46);
    }
    const s = p.match(SUBJECTS);
    return s ? cap(s[1]) : "";
  }

  function extractAudience(prompt) {
    const p = normalise(prompt);
    const m = p.match(new RegExp("\\bfor\\s+((?:[a-z0-9'’-]+\\s+){0,5}(?:" + AUDIENCE_NOUNS + "))\\b", "i"));
    if (m) return trimTo(m[1].replace(/^(?:a|an|the|my|our)\s+/i, ""), 60);
    const c = p.match(CONTEXT_RE);
    return c ? trimTo(c[1], 40) : "";
  }

  function extractDuration(prompt) {
    const m = normalise(prompt).match(/(\d+)\s*[- ]?\s*(minute|min|hour|hr)s?\b/i);
    if (!m) return "";
    const unit = /^h/i.test(m[2]) ? (m[1] === "1" ? "Hour" : "Hours") : "Minutes";
    return m[1] + " " + unit;
  }

  const WORD_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20 };
  function extractCount(prompt) {
    const m = normalise(prompt).match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)\s+(?:[a-z'-]+\s+){0,3}(?:questions?|items?|mcqs?)\b/i);
    if (!m) return 0;
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : WORD_NUM[m[1].toLowerCase()];
    return Math.max(1, Math.min(n || 0, 12));
  }

  global.PromptEvaluator = {
    check, getTier, evaluatePrompt, extractTopic, extractAudience, extractDuration, extractCount, cap
  };
})(window);
