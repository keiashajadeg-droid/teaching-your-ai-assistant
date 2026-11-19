"""Turn the saved Claude Code chats into replay data for the demo app.

Each scene: starting files, then per prompt a list of events (text, tool line, file write/edit).
File contents are rebuilt by replaying the Write/Edit calls in order, then checked against the real folders.
"""
import json, re, sys
from pathlib import Path

# usage: python data/extract.py data/scenes.json   (expects the demo folders in ~/Desktop/talk)
PROJ = Path.home() / ".claude" / "projects"
TALK = Path.home() / "Desktop" / "talk"
PREFIX = re.sub(r"[:\\/]", "-", str(TALK)) + "-"  # how Claude Code names a folder's chat logs
HOME = re.escape(str(Path.home())).replace(r"\\", r"[/\\]+")
TALK_RE = re.escape(str(TALK)).replace(r"\\", r"[/\\]+")
OUT = Path(sys.argv[1])

SKIP_TOOLS = {"mcp__ccd_turn__update_plan", "mcp__ccd_turn__wrap_up"}


def load(folder):
    f = next((PROJ / folder).glob("*.jsonl"))
    return [json.loads(l) for l in open(f, encoding="utf-8")]


def rel(path, root):
    p = path.replace("\\", "/")
    r = str(root).replace("\\", "/")
    return p[len(r) + 1:] if p.lower().startswith(r.lower()) else p


def short_cmd(cmd, root):
    first = cmd.strip().splitlines()[0]
    first = re.sub(r'^cd "[^"]*" && ', "", first)
    return first if len(first) <= 90 else first[:87] + "…"


def read_tree(root, skip=()):
    files = {}
    for p in sorted(root.rglob("*")):
        if p.is_dir() or any(s in p.parts for s in (".venv", ".git", "__pycache__")) or p.name == "uv.lock":
            continue
        r = p.relative_to(root).as_posix()
        if r in skip:
            continue
        files[r] = p.read_text(encoding="utf-8") if p.suffix in {".md", ".py", ".toml", ".csv", ".ipynb"} else None
    return files


def turns(msgs):
    """Group into [(prompt, [assistant content blocks])]."""
    out = []
    for m in msgs:
        c = m.get("message", {}).get("content")
        if m.get("type") == "user" and isinstance(c, str):
            out.append((c.strip().lstrip("* ").strip(), []))
        elif m.get("type") == "assistant" and isinstance(c, list) and out:
            out[-1][1].extend(c)
    return out


def events_for(blocks, root, state, results_queue=None):
    ev = []
    ran = False
    for b in blocks:
        if b.get("type") == "text" and b["text"].strip():
            ev.append({"kind": "text", "text": b["text"].strip()})
        elif b.get("type") == "tool_use" and b["name"] not in SKIP_TOOLS:
            i = b["input"]
            if b["name"] == "Write":
                path = rel(i["file_path"], root)
                state[path] = i["content"]
                ev.append({"kind": "write", "path": path, "content": i["content"]})
            elif b["name"] == "Edit":
                path = rel(i["file_path"], root)
                old = state[path]
                if i["old_string"] not in old:
                    raise SystemExit(f"edit did not apply: {path}")
                new = old.replace(i["old_string"], i["new_string"]) if i.get("replace_all") else old.replace(i["old_string"], i["new_string"], 1)
                state[path] = new
                ev.append({"kind": "edit", "path": path, "content": new})
            elif b["name"] == "Read":
                ev.append({"kind": "tool", "text": f"Read {rel(i['file_path'], root)}", "reads": [rel(i["file_path"], root)]})
            elif b["name"] == "Bash":
                cmd = i["command"]
                reads = [f for f in state if state[f] is not None and (f in cmd or ("context/notebook/*" in cmd and f.startswith("context/notebook/")))]
                ev.append({"kind": "tool", "text": "$ " + short_cmd(cmd, root), "reads": reads})
                if results_queue and not ran and "run.py" in cmd and "python run.py" in cmd:
                    ran = True
                    added = results_queue.pop(0)
                    for path, content in added:
                        state[path] = content
                    ev.append({"kind": "added", "files": {p: c for p, c in added}})
            else:
                ev.append({"kind": "tool", "text": b["name"]})
    return ev


def demo():
    root = TALK / "rehearsal"
    final = read_tree(root)
    stamps = sorted({Path(p).stem for p in final if p.startswith("results/")})
    queue = [[(f"results/{s}.csv", final[f"results/{s}.csv"]), (f"results/{s}.png", None)] for s in stamps]
    start = {"AGENTS.md": final["AGENTS.md"]}
    state = dict(start)
    steps = []
    for prompt, blocks in turns(load(PREFIX + "rehearsal")):
        if prompt.lower().startswith("what are the rules"):
            continue
        steps.append({"prompt": prompt, "events": events_for(blocks, root, state, queue)})
    for path, content in final.items():
        if content is not None and state.get(path) != content:
            raise SystemExit(f"rebuild mismatch: {path}")
    return {"folder": "classifier-benchmark", "start": start, "steps": steps}


def one_chat(folder, project, skip=()):
    root = TALK / folder
    files = read_tree(root, skip)
    state = dict(files)
    (prompt, blocks), = turns(load(project))
    return {"folder": folder, "start": files, "steps": [{"prompt": prompt, "events": events_for(blocks, root, state)}]}


data = {
    "demo": demo(),
    "withNotes": one_chat("with-notes", PREFIX + "with-notes"),
    "noNotes": one_chat("no-notes", PREFIX + "no-notes"),
    "messy": one_chat("03-messy-context", PREFIX + "03-messy-context"),
}
def clean(x):
    if isinstance(x, str):
        x = re.sub(TALK_RE + r"""[/\\]+[^/\\\s"']+[/\\]?""", "", x)
        return re.sub(HOME, "~", x)
    if isinstance(x, list):
        return [clean(v) for v in x]
    if isinstance(x, dict):
        return {k: clean(v) for k, v in x.items()}
    return x


data = clean(data)
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
for k, v in data.items():
    print(k, len(v["start"]), "files,", [len(s["events"]) for s in v["steps"]], "events")
