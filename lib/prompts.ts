// The take-home prompts from the talk, plus a starter AGENTS.md. Same text as PROMPTS.md in the repo.

export const prompts: { when: string; prompt: string }[] = [
  {
    when: "Starting out",
    prompt:
      "Read this project and draft an AGENTS.md: what it is, how to run it, and the rules. Mark anything you’re unsure about.",
  },
  {
    when: "After some work",
    prompt: "Update the roadmap and the notebook with what we just did, and log any decision we made.",
  },
  {
    when: "A decision changes",
    prompt: "Mark the old decision as superseded and add the new one, with today’s date and the reason.",
  },
  {
    when: "Every so often",
    prompt: "Check the notes for anything stale, duplicated or contradictory. Don’t fix it; list it for me.",
  },
  { when: "A new chat", prompt: "Read the notes and tell me where we are." },
];

export const template = `# <Project name>

## What this is
<One or two sentences: the question this project answers.>

## How to run
<The one command that runs it.>

## Rules
- <A rule that must never be broken, e.g. "Random seed is 0. Never change it.">
- <Where results go.>

## Notes
- context/roadmap.md: where we are. "Now" at the top.
- context/decisions.md: dated decisions. When one changes, mark the old one
  superseded. Never delete it.
- context/notebook/: one dated entry per work session.

After each step, update the roadmap and the notebook, and log any decision.
`;
