# Take-home prompts

From the talk *Teaching Your AI Assistant About Your Project*. They work with any coding assistant that reads an `AGENTS.md` file.

| When | Prompt |
|------|--------|
| Starting out | “Read this project and draft an AGENTS.md: what it is, how to run it, and the rules. Mark anything you’re unsure about.” |
| After some work | “Update the roadmap and the notebook with what we just did, and log any decision we made.” |
| A decision changes | “Mark the old decision as superseded and add the new one, with today’s date and the reason.” |
| Every so often | “Check the notes for anything stale, duplicated or contradictory. Don’t fix it; list it for me.” |
| A new chat | “Read the notes and tell me where we are.” |

## A starter AGENTS.md

Put this in the top folder of your project and fill in the brackets.

```markdown
# <Project name>

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
```

## The folder

```
my-project/
├── AGENTS.md            What is this? How do I run it?
├── context/
│   ├── roadmap.md       Where are we now?
│   ├── decisions.md     Why did we choose this?
│   ├── notebook/        What happened, failures too?
│   └── references.md    Where did this come from?
├── src/
└── results/
```

One question per file. Keep it small, and check what the assistant writes.

## Habits

- Put “Now” at the top of the roadmap.
- Date every notebook entry.
- When a decision changes, mark the old one superseded. Don’t delete it.
- One answer per question, in one file.
- Read what the assistant writes before you trust it.
