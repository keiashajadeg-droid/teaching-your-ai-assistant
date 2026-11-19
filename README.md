# Teaching Your AI Assistant About Your Project

Companion to a NITheCS micro-school talk (20 November 2026) by Keiasha Gounden, UKZN Quantum Research Group.

**[Take-home prompts and a starter AGENTS.md → PROMPTS.md](PROMPTS.md)**

## The replay app

A small web page that replays real Claude Code chats on a toy project (three classifiers on moons, circles and blobs), so you can watch the project's context notes change:

1. **Build it:** four prompts that only ask for code. Because `AGENTS.md` says “after each step, update the roadmap and the notebook, and log any decision”, the assistant keeps `context/` up to date by itself.
2. **Fresh chat:** the same question in a brand-new chat, in a copy with notes and a copy without. The tree marks which files the assistant read.
3. **Messy notes:** the same project with stale, duplicated and contradictory notes.

Nothing runs live. The replies and file changes come from saved chat logs from 19 November 2026 and are shown as they happened, just faster. `data/extract.py` turns the logs into `data/scenes.json`, and checks that replaying the edits gives exactly the files the real run produced.

### Run it locally

```
npm install
npm run dev        # http://localhost:3000
```

Or build the static site and serve it (works offline):

```
npm run build
npm start          # serves out/ on http://localhost:3000
```

Keys: **Space** or **→** sends the next prompt, or skips to the end of the current reply. The numbered buttons jump to the end of a step.
