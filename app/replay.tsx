"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chats, timeline, viewAt, newLines, plotUrl, type Chat, type Item, type View } from "@/lib/replay";
import { prompts, template } from "@/lib/prompts";

type ChatId = keyof typeof chats;
type SceneId = "demo" | "fresh" | "messy" | "prompts";

const SCENES: { id: SceneId; label: string; blurb: string }[] = [
  { id: "demo", label: "1 · Build it", blurb: "Four prompts that only ask for code. Watch the notes appear in the folder." },
  { id: "fresh", label: "2 · Fresh chat", blurb: "Same code, same results, a brand-new chat. One copy has notes, one doesn’t." },
  { id: "messy", label: "3 · Messy notes", blurb: "The same project with stale, duplicated and contradictory notes." },
  { id: "prompts", label: "Take-home prompts", blurb: "" },
];

// how long each kind of event takes on screen (ms)
const PACE = { tool: 420, file: 650, added: 380, textTick: 30, textChars: 14 };

type Play = { n: number; reveal: number; playing: boolean };
const fresh = (): Record<ChatId, Play> => ({
  demo: { n: 0, reveal: 0, playing: false },
  withNotes: { n: 0, reveal: 0, playing: false },
  noNotes: { n: 0, reveal: 0, playing: false },
  messy: { n: 0, reveal: 0, playing: false },
});

export default function Replay() {
  const [scene, setScene] = useState<SceneId>("demo");
  const [freshChat, setFreshChat] = useState<ChatId>("withNotes");
  const [play, setPlay] = useState(fresh);
  const [picked, setPicked] = useState<Record<ChatId, string | null>>({ demo: "AGENTS.md", withNotes: "context/roadmap.md", noNotes: "run.py", messy: "context/roadmap.md" });

  const chatId: ChatId | null = scene === "demo" ? "demo" : scene === "fresh" ? freshChat : scene === "messy" ? "messy" : null;
  const chat = chatId ? chats[chatId] : null;
  const items = useMemo(() => (chat ? timeline(chat) : []), [chat]);
  const p = chatId ? play[chatId] : null;
  const view = useMemo(() => (chat && p ? viewAt(chat, items, p.n) : null), [chat, items, p?.n]);

  const set = (id: ChatId, next: Partial<Play>) => setPlay((s) => ({ ...s, [id]: { ...s[id], ...next } }));

  // index of the next prompt at or after n (or the end)
  const nextPrompt = (n: number) => {
    for (let i = n; i < items.length; i++) if (items[i].ev === null) return i;
    return items.length;
  };

  const waiting = !!p && !p.playing && p.n < items.length && items[p.n].ev === null;
  const done = !!p && p.n >= items.length;

  const send = () => chatId && p && waiting && set(chatId, { n: p.n + 1, reveal: 0, playing: true });
  const skip = () => chatId && p && set(chatId, { n: nextPrompt(p.n + (waiting ? 1 : 0)), reveal: 0, playing: false });
  const reset = () => chatId && set(chatId, { n: 0, reveal: 0, playing: false });
  const jumpToStep = (k: number) => {
    if (!chatId) return;
    let seen = -1, i = 0;
    for (; i < items.length; i++) if (items[i].ev === null && ++seen === k + 1) break;
    set(chatId, { n: i, reveal: 0, playing: false });
  };

  // the player: one event at a time
  useEffect(() => {
    if (!chatId || !p || !p.playing) return;
    const it = items[p.n];
    if (!it || it.ev === null) {
      set(chatId, { playing: false });
      return;
    }
    const ev = it.ev;
    if (ev.kind === "text") {
      if (p.reveal >= ev.text.length) {
        const t = setTimeout(() => set(chatId, { n: p.n + 1, reveal: 0 }), 250);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => set(chatId, { reveal: p.reveal + PACE.textChars }), PACE.textTick);
      return () => clearTimeout(t);
    }
    const wait = ev.kind === "tool" ? PACE.tool : ev.kind === "added" ? PACE.added : PACE.file;
    const t = setTimeout(() => set(chatId, { n: p.n + 1 }), wait);
    return () => clearTimeout(t);
  }, [chatId, p?.n, p?.reveal, p?.playing, items]);

  // follow the file being written
  useEffect(() => {
    if (chatId && view?.lastFile && p?.playing) setPicked((s) => ({ ...s, [chatId]: view.lastFile }));
  }, [view?.lastFile]);

  // keyboard: space / → sends the next prompt, or skips to the end of the current one
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "ArrowRight") return;
      e.preventDefault();
      if (waiting) send();
      else if (p?.playing) skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const stepNow = p ? items.slice(0, p.n).filter((i) => i.ev === null).length : 0;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="pixel">✦</span> Teaching Your AI Assistant
        </div>
        <nav className="tabs">
          {SCENES.map((s) => (
            <button key={s.id} className={s.id === scene ? "tab on" : "tab"} onClick={() => setScene(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      {scene === "prompts" ? (
        <PromptsPage />
      ) : (
        chat && view && p && chatId && (
          <>
            <div className="strip">
              <p className="blurb">{SCENES.find((s) => s.id === scene)!.blurb}</p>
              {scene === "fresh" && (
                <div className="switch">
                  {(["withNotes", "noNotes"] as ChatId[]).map((id) => (
                    <button key={id} className={id === freshChat ? "sw on" : "sw"} onClick={() => setFreshChat(id)}>
                      {chats[id].folder}/
                    </button>
                  ))}
                </div>
              )}
              {chat.steps.length > 1 && (
                <div className="dots">
                  {chat.steps.map((_, k) => (
                    <button key={k} className={k < stepNow ? "dot on" : "dot"} title={`Jump to the end of step ${k + 1}`} onClick={() => jumpToStep(k)}>
                      {k + 1}
                    </button>
                  ))}
                </div>
              )}
              <button className="mini" onClick={reset}>↺ reset</button>
            </div>

            <main className="ide">
              <Tree chat={chat} view={view} picked={picked[chatId]} onPick={(f) => setPicked((s) => ({ ...s, [chatId]: f }))} />
              <Editor chat={chat} view={view} path={picked[chatId]} />
              <ChatPane
                chat={chat}
                items={items}
                p={p}
                waiting={waiting}
                done={done}
                nextPromptText={waiting ? chat.steps[items[p.n].step].prompt : null}
                onSend={send}
                onSkip={skip}
              />
            </main>
            <footer className="foot">
              Replay of a real Claude Code chat, run on 19 November 2026. Replies and file changes are shown exactly as they happened, at a quicker pace.
              <span className="keys"> Space / → : send · skip</span>
            </footer>
          </>
        )
      )}
    </div>
  );
}

/* ---------------- file tree ---------------- */

function Tree({ chat, view, picked, onPick }: { chat: Chat; view: View; picked: string | null; onPick: (f: string) => void }) {
  const paths = Object.keys(view.files).sort((a, b) => {
    const da = a.includes("/"), db = b.includes("/");
    return da === db ? a.localeCompare(b) : da ? -1 : 1;
  });
  // group by top folder (one level is enough for these projects), keep context/notebook nested
  const rows: { label: string; depth: number; path?: string }[] = [];
  const seen = new Set<string>();
  for (const f of paths) {
    const parts = f.split("/");
    for (let d = 0; d < parts.length - 1; d++) {
      const dir = parts.slice(0, d + 1).join("/");
      if (!seen.has(dir)) {
        seen.add(dir);
        rows.push({ label: parts[d] + "/", depth: d });
      }
    }
    rows.push({ label: parts[parts.length - 1], depth: parts.length - 1, path: f });
  }
  return (
    <aside className="tree">
      <p className="pane-title">{chat.folder}/</p>
      {rows.map((r, i) => {
        if (!r.path) return <p key={i} className="row dir" style={{ paddingLeft: 14 + r.depth * 18 }}>{r.label}</p>;
        const t = view.touched[r.path];
        const read = view.reads.has(r.path);
        const isNote = r.path.startsWith("context/") || r.path === "AGENTS.md" || r.path === "TODO.md";
        return (
          <button
            key={r.path}
            className={`row file${r.path === picked ? " on" : ""}${t ? " touched" : ""}${isNote ? " note" : ""}`}
            style={{ paddingLeft: 14 + r.depth * 18 }}
            onClick={() => onPick(r.path!)}
          >
            <span className="name">{r.label}</span>
            {read && <span className="badge read">read</span>}
            {t && <span className={`badge ${t === "A" ? "add" : "mod"}`}>{t === "A" ? "new" : "edited"}</span>}
          </button>
        );
      })}
      <div className="legend">
        <p><span className="sq note" /> notes</p>
        <p><span className="badge add">new</span> <span className="badge mod">edited</span> this step</p>
        <p><span className="badge read">read</span> the assistant opened it</p>
      </div>
    </aside>
  );
}

/* ---------------- file viewer ---------------- */

function Editor({ chat, view, path }: { chat: Chat; view: View; path: string | null }) {
  const [preview, setPreview] = useState(false);
  if (!path || !(path in view.files)) return <section className="editor empty"><p>Pick a file on the left.</p></section>;
  const content = view.files[path];
  const isMd = path.endsWith(".md");
  return (
    <section className="editor">
      <div className="ed-bar">
        <span className="win-dot" /><span className="win-dot" /><span className="win-dot" />
        <span className="ed-name">{path}</span>
        {isMd && (
          <button className="mini" onClick={() => setPreview(!preview)}>{preview ? "show source" : "show preview"}</button>
        )}
      </div>
      <div className="ed-body">
        {content === null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="plot" src={plotUrl(chat.folder, path)} alt={`Plot saved by run.py: ${path}`} />
        ) : isMd && preview ? (
          <div className="md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown></div>
        ) : (
          <Source text={content} fresh={newLines(view.stepStart[path], content)} md={isMd} />
        )}
      </div>
    </section>
  );
}

function Source({ text, fresh, md }: { text: string; fresh: Set<number>; md: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = Math.min(...Array.from(fresh), Infinity);
  useEffect(() => {
    if (first !== Infinity) {
      // scroll inside the editor only (scrollIntoView would move the whole page on phones)
      const line = ref.current?.querySelector<HTMLElement>(`[data-line="${first}"]`);
      const box = ref.current?.parentElement;
      if (line && box) box.scrollTo({ top: line.offsetTop - box.clientHeight / 2, behavior: "smooth" });
    }
  }, [text]);
  return (
    <div className="src" ref={ref}>
      {text.split("\n").map((l, i) => (
        <div key={i} data-line={i} className={`ln${fresh.has(i) ? " new" : ""}${md && /^#{1,6} /.test(l) ? " h" : ""}`}>
          <span className="num">{i + 1}</span>
          <span className="txt">{l || " "}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- chat ---------------- */

function ChatPane(props: {
  chat: Chat; items: Item[]; p: Play; waiting: boolean; done: boolean;
  nextPromptText: string | null; onSend: () => void; onSkip: () => void;
}) {
  const { chat, items, p, waiting, done, nextPromptText, onSend, onSkip } = props;
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [p.n, p.reveal]);

  const shown: React.ReactNode[] = [];
  items.slice(0, p.n + (p.playing ? 1 : 0)).forEach((it, i) => {
    const ev = it.ev;
    const current = i === p.n;
    if (ev === null) {
      if (!current) shown.push(<div key={i} className="msg you"><span className="who">YOU</span><p>{chat.steps[it.step].prompt}</p></div>);
      return;
    }
    if (ev.kind === "text") {
      const txt = current ? ev.text.slice(0, p.reveal) : ev.text;
      shown.push(<div key={i} className="msg ai"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ children }) => <span className="link">{children}</span> }}>{txt}</ReactMarkdown></div>);
      return;
    }
    if (current) return; // tools and files appear when they happen
    if (ev.kind === "tool") shown.push(<p key={i} className="act">{ev.text}</p>);
    else if (ev.kind === "added") shown.push(<p key={i} className="act">Saved {Object.keys(ev.files).join(", ")}</p>);
    else shown.push(<p key={i} className={`act file${ev.path.startsWith("context/") ? " note" : ""}`}>{ev.kind === "write" ? "Wrote" : "Edited"} {ev.path}</p>);
  });

  return (
    <section className="chat">
      <p className="pane-title">Claude · new chat</p>
      <div className="log" ref={log}>
        {shown.length === 0 && <p className="hint">Nothing yet. Press <b>Send</b> (or Space).</p>}
        {shown}
        {p.playing && <p className="working">working…</p>}
      </div>
      <div className="composer">
        {waiting && nextPromptText ? (
          <>
            <p className="draft">{nextPromptText}</p>
            <button className="send" onClick={onSend}>Send ▶</button>
          </>
        ) : p.playing ? (
          <button className="mini wide" onClick={onSkip}>⏩ skip to the end of this reply</button>
        ) : done ? (
          <p className="hint">End of this chat.</p>
        ) : null}
      </div>
    </section>
  );
}

/* ---------------- take-home ---------------- */

function PromptsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (s: string) => {
    navigator.clipboard?.writeText(s);
    setCopied(s);
    setTimeout(() => setCopied(null), 1400);
  };
  return (
    <main className="prompts">
      <h1>Take-home prompts</h1>
      <p className="lede">Copy these into your assistant. They work with any tool that reads an <code>AGENTS.md</code>.</p>
      <div className="plist">
        {prompts.map((x) => (
          <div key={x.when} className="pcard">
            <p className="when">{x.when}</p>
            <p className="ptext">“{x.prompt}”</p>
            <button className="mini" onClick={() => copy(x.prompt)}>{copied === x.prompt ? "copied ✓" : "copy"}</button>
          </div>
        ))}
      </div>
      <h2>A starter AGENTS.md</h2>
      <div className="tpl">
        <div className="ed-bar"><span className="win-dot" /><span className="win-dot" /><span className="win-dot" /><span className="ed-name">AGENTS.md</span>
          <button className="mini" onClick={() => copy(template)}>{copied === template ? "copied ✓" : "copy"}</button>
        </div>
        <pre>{template}</pre>
      </div>
      <p className="lede small">Three habits: keep it small, one question per file, and check what the assistant writes.</p>
      <p className="lede small">
        All of this as one file:{" "}
        <a href="https://github.com/keiashajadeg-droid/teaching-your-ai-assistant/blob/main/PROMPTS.md">PROMPTS.md on GitHub</a>
      </p>
    </main>
  );
}
