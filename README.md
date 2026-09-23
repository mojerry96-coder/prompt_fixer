# Fix the Prompt

An interactive simulation for **Module 2 — AI Literacy for Teaching and Research, Unit 2.2**. Learners take a prompt that gets a weak answer from AI, work out what it's missing (context, task, format), rewrite it, and then fix a new prompt on their own.

It runs as a static web page: no build step and no server-side code.

## Run it locally

```bash
python3 -m http.server 5391
```

Then open <http://localhost:5391>. Add `?reset` to the URL to clear saved progress, `?skipintro` to skip the opener, or `?nowalk` to skip the walkthrough.

## Flow

1. **Opener:** the three partner logos (Ekiti State, MIVA, Tunji Olowolafe Foundation) arrive one at a time at the centre of the screen and settle into a line, then the title and **Begin**.
2. **Loading screen**, then a **walkthrough** of about 55 seconds. It plays the real interface by itself with captions and a Nigerian English voiceover. It uses a different example ("Plan a meeting about exam timetables.") so it never gives away the lesson-plan answers. The learner can skip it or replay it from the top bar.
3. **The problem:** "Write a lesson plan." and its generic result.
4. **Diagnose:** Yes / No for who it's for, what exactly, and what shape. After Confirm, the answers are revealed.
5. **Revise and test:** up to three tries, each graded **Weak**, **Getting there** or **Strong**.
6. **Fix it cold:** "Give me exam questions.", with one try and no hints.
7. **Before and after:** the three prompts side by side, the three result strands, and the closing line.

Progress is saved in the browser's `localStorage`, so a learner who reloads carries on where they left off. When embedded, **Finish** posts the result to the parent window as `{ type: "fix-the-prompt:complete", result }`.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page shell. Bump `?v=` on the asset links after changing files, so browsers don't serve stale copies. |
| `app.js` | The simulation: one state object, with the conversation built from it. |
| `evaluator.js` | Rule-based grader. It checks for context, task and format (no live AI) and returns Weak, Getting there or Strong. |
| `replies.js` | The simulated AI replies for each tier. A Strong prompt gets a short lesson plan whose shape and activities come from the prompt's own subject, so no two topics get the same plan. |
| `walkthrough.js` | Loading screen and the scripted walkthrough. |
| `characters.js` | Inserts the character clips. |
| `intro.js`, `intro.css` | The opener. |
| `styles.css` | All other styles. |
| `assets/cast/` | Character clips: `.webm` (VP9 with alpha), `.mov` (HEVC with alpha, for Safari) and `.png` poster frames. |
| `assets/vo/` | Walkthrough voiceover, `vo1`–`vo6`. |
| `assets/logos/` | Partner logos used by the opener. |

## Assets

- **Characters:** Tade (lecturer), Sage (AI helper) and Kemi (fixer). The images were made with GPT Image 2.5 and animated with MiniMax H3 Max, both on Higgsfield. Each clip starts and ends on the same frame so it loops cleanly. `assets/cast/key.py` removes the white background and exports the transparent WebM, MOV and poster files. It reads the raw clips from `assets/cast/src/`, which is not in the repo.
- **Voiceover:** ElevenLabs, voice "Ifeoma Odumodu — Nigerian Narrator", model `eleven_multilingual_v2`.
- **Reduced motion:** viewers with reduced motion turned on see the still poster frames instead of the clips.

## Known limitations

- Safari should play the HEVC-with-alpha `.mov` clips, but transparency there has not been checked yet.
- Browsers only allow the narration to play after a click. The **Begin** button provides it; without it, the walkthrough runs silently with captions.
