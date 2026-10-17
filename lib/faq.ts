export const FAQ = [
  {
    q: "Why don't you score the models?",
    a: "A score turns hundreds of design decisions into one number, and that number can't tell you whether you'd like the result. You can see things in a build that no benchmark measures: a toggle that doesn't toggle, a layout that falls apart on a phone, a game that works but isn't fun. So we show the builds and let you decide.",
  },
  {
    q: "Which settings did each model use?",
    a: "Claude Opus 5.5 and Claude Fable 5.1 ran in Claude Code with max effort. GPT-6 Astra and GPT-6.1 Sol ran in Codex CLI with extra high reasoning effort. Each started in an empty folder with user customisations switched off. The exact commands are on the How we test page.",
  },
  {
    q: "Did you fix or retouch anything?",
    a: "No. Each build is published exactly as the model delivered it. If something is broken, it stays broken, and the errors the browser reported during recording are listed under it.",
  },
  {
    q: "Why only one attempt per model?",
    a: "Because one attempt is what you get when you ask a model for something. Showing the best of five would make every model look better than it usually is. The trade-off is variance: a second run could come out differently, and we say so.",
  },
  {
    q: "Why these four briefs?",
    a: "They cover the work developers most often hand to a model: a marketing website, a product interface, a simulation and a game. Each brief fixes the content, so the differences come from execution rather than from what each model chose to make.",
  },
  {
    q: "Can I try the builds myself?",
    a: "Yes. Every build has an Open live button that runs the model's untouched files in a sandbox. The prompts are published with a copy button if you want to run them on your own setup.",
  },
  {
    q: "Why does the video look different from the live build?",
    a: "The simulation and game videos are rendered frame by frame on a controlled clock, with the same seeded randomness and the same scripted input for every model, so they're perfectly smooth and comparable. When you play live, timing and randomness are real, so it won't be frame-for-frame identical.",
  },
  {
    q: "Are you paid by Anthropic, OpenAI or anyone else?",
    a: "No. The site is independent and not affiliated with any model vendor.",
  },
  {
    q: "Will you add Gemini, Grok and other models?",
    a: "Yes, in future rounds. Subscribe on the home page and you'll get one email when the next round is live.",
  },
  {
    q: "How do I suggest a brief or report a problem?",
    a: "Use the contact page. We read everything and reply within two business days.",
  },
];
