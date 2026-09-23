/* ==========================================================
   Intent check — is this actually a rewritten prompt?
   Runs before the grader. When the learner sends something that
   is not a rewrite (a question, a greeting, the original prompt
   untouched, or a request for something else entirely), the
   assistant answers in character and the attempt is not used up.
   It never says which ingredient is missing.
   ========================================================== */
(function (global) {
  "use strict";

  const norm = (s) => String(s || "").toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
  const bare = (s) => norm(s).replace(/[.!?,;:"']/g, "");

  const WORDS = /[a-z']{2,}/g;

  // Deliverables that belong to a different job from the one being fixed
  const ELSEWHERE = "email|e-mail|letter|memo|essay|poem|story|report|cv|resume|résumé|song|recipe|code|script|app|website|tweet|blog post|newsletter|press release|speech|proposal|cover letter|itinerary|meal plan|workout|slide deck|slides|presentation|budget|invoice|rota|article|summary|summari[sz]e|translate|translation|caption|subtitle|joke";
  const OTHER_TASKS = {
    lesson: new RegExp("\\b(" + ELSEWHERE + "|timetable|exam|quiz|test paper|mcqs?|questions?)\\b"),
    exam: new RegExp("\\b(" + ELSEWHERE + "|lesson plan|lesson)\\b")
  };
  // …but these words are normal inside the job itself
  const OWN_TASK = {
    lesson: /\b(lesson|plan|teach|teaching|class|classes|lecture|session|seminar|tutorial|scheme of work|syllabus|unit|module|curriculum|starter|plenary|students?|pupils?|learners?)\b/,
    exam: /\b(exam|question|questions|quiz|test|assessment|paper|mcq|mcqs|marks?|mark scheme|answer key)\b/
  };

  const ASKING = [
    /\b(what|which|how)\b[^?]*\b(should|do|can|would) (i|we)\b/,
    /\b(help me|help please|any help|give me a hint|hint please|tell me what|show me what|what do you think)\b/,
    /^(help|hint|hints|i need help|not sure|no idea|i don'?t know|idk|dunno)\b/,
    /\bwhat('s| is)? (missing|wrong|the answer)\b/,
    /\b(is|was) (this|that|it) (right|correct|ok|okay|good|fine|enough)\b/,
    /\b(give|tell) me the answer\b/,
    /\b(are|am) (you|i) (sure|right|correct)\b/,
    /\bcan you (help|tell|show) me\b/
  ];

  const CHATTY = [
    /^(hi|hii+|hey+|hello|yo|sup|good (morning|afternoon|evening)|greetings)\b/,
    /^(ok|okay|k|kk|cool|nice|great|fine|sure|alright|right|yes|no|yeah|nah|done|next|continue|start|go)\b/,
    /^(thanks|thank you|ty|cheers|please|sorry)\b/,
    /^(test|testing|hmm+|erm|uh+|lol|haha)\b/,
    /^(this|that|it) (is|was|feels) (hard|difficult|confusing|easy|tricky|unclear)\b/,
    /^i (don'?t|do not) (get|understand) (this|it)\b/
  ];

  const MESSAGES = {
    unchanged: {
      lesson: "That's the prompt we started with, word for word. Rewrite it in your own words, then send it again.",
      exam: "That's the prompt as it came, word for word. Rewrite it in your own words, then send it again."
    },
    unreadable: {
      lesson: "I can't read that as a prompt. Write it as an instruction, the way you'd type it into an AI tool.",
      exam: "I can't read that as a prompt. Write it as an instruction, the way you'd type it into an AI tool."
    },
    chatty: {
      lesson: "Nothing to work with yet. Type the prompt you'd send to an AI, and I'll answer it.",
      exam: "Nothing to work with yet. Type the prompt you'd send to an AI, and I'll answer it."
    },
    asking: {
      lesson: "I can't tell you what to write — that's the part you're practising. Send me your rewritten prompt and I'll answer it as it stands.",
      exam: "I can't tell you what to write — that's the part you're practising. Send me your rewritten prompt and I'll answer it as it stands."
    },
    other: {
      lesson: "That's a different request. The prompt we're fixing here is “Write a lesson plan.” — rewrite that one.",
      exam: "That's a different request. The prompt we're fixing here is “Give me exam questions.” — rewrite that one."
    }
  };

  /**
   * check("help me", { job: "lesson", original: "Write a lesson plan." })
   * → { kind: "asking", message: "…" }, or null when it is a genuine rewrite.
   */
  function check(text, opts) {
    const job = (opts && opts.job) === "exam" ? "exam" : "lesson";
    const original = (opts && opts.original) || "";
    const t = norm(text);
    const flat = bare(text);
    if (!t) return { kind: "unreadable", message: MESSAGES.unreadable[job] };

    if (flat === bare(original)) return { kind: "unchanged", message: MESSAGES.unchanged[job] };

    // Talking to me, rather than writing a prompt — checked before the
    // readability gate, since these are short by nature
    if (CHATTY.some((re) => re.test(t))) return { kind: "chatty", message: MESSAGES.chatty[job] };
    if (ASKING.some((re) => re.test(t))) return { kind: "asking", message: MESSAGES.asking[job] };

    const words = t.match(WORDS) || [];
    const readable = words.filter((w) => /[aeiouy]/.test(w));
    if (words.length < 3 || readable.length < 2 || t.replace(/[^a-z ]/g, "").length < t.length * 0.55) {
      return { kind: "unreadable", message: MESSAGES.unreadable[job] };
    }

    // A genuine request, but not for the thing we're fixing: either a bare
    // question, or another deliverable altogether
    const bareQuestion = /^(what|how|why|when|who|where|which|does|do|is|are|can)\b/.test(t) || /\?\s*$/.test(t);
    const otherThing = OTHER_TASKS[job].test(t);
    if ((bareQuestion || otherThing) && !OWN_TASK[job].test(t)) {
      return { kind: "other", message: MESSAGES.other[job] };
    }
    return null;
  }

  global.Intent = { check };
})(window);
