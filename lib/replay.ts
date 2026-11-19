// Replay data comes from data/scenes.json, made by data/extract.py from the saved Claude Code chats.
import raw from "@/data/scenes.json";

export type Files = Record<string, string | null>; // null = binary (a plot)

export type Ev =
  | { kind: "text"; text: string }
  | { kind: "tool"; text: string; reads?: string[] }
  | { kind: "write" | "edit"; path: string; content: string }
  | { kind: "added"; files: Files };

export type Step = { prompt: string; events: Ev[] };
export type Chat = { folder: string; start: Files; steps: Step[] };

export const chats = raw as unknown as Record<"demo" | "withNotes" | "noNotes" | "messy", Chat>;

// one flat timeline per chat: "send prompt i", then its events
export type Item = { step: number; ev: Ev | null }; // ev null = the prompt being sent
export function timeline(chat: Chat): Item[] {
  return chat.steps.flatMap((s, i) => [{ step: i, ev: null }, ...s.events.map((ev) => ({ step: i, ev }))]);
}

export type View = {
  files: Files;
  stepStart: Files; // files when the current prompt was sent (for highlighting what changed)
  touched: Record<string, "A" | "M">; // added / modified during the current step
  reads: Set<string>; // files the assistant read during the current step
  lastFile: string | null; // the file changed most recently
};

// state after the first n timeline items
export function viewAt(chat: Chat, items: Item[], n: number): View {
  let files: Files = { ...chat.start };
  let stepStart: Files = { ...files };
  let touched: View["touched"] = {};
  let reads = new Set<string>();
  let lastFile: string | null = null;
  for (const { ev } of items.slice(0, n)) {
    if (ev === null) {
      stepStart = { ...files };
      touched = {};
      reads = new Set();
      continue;
    }
    if (ev.kind === "write" || ev.kind === "edit") {
      touched[ev.path] = ev.path in stepStart ? "M" : "A";
      files = { ...files, [ev.path]: ev.content };
      lastFile = ev.path;
    } else if (ev.kind === "added") {
      for (const p of Object.keys(ev.files)) touched[p] = "A";
      files = { ...files, ...ev.files };
    } else if (ev.kind === "tool" && ev.reads) {
      ev.reads.forEach((r) => reads.add(r));
    }
  }
  return { files, stepStart, touched, reads, lastFile };
}

// lines of `now` that weren't in `before` (multiset compare, good enough for notes)
export function newLines(before: string | null | undefined, now: string): Set<number> {
  const count = new Map<string, number>();
  for (const l of (before ?? "").split("\n")) count.set(l, (count.get(l) ?? 0) + 1);
  const out = new Set<number>();
  now.split("\n").forEach((l, i) => {
    const c = count.get(l) ?? 0;
    if (c > 0) count.set(l, c - 1);
    else if (l.trim() !== "") out.add(i);
  });
  return out;
}

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const plotDir: Record<string, string> = {
  "classifier-benchmark": "rehearsal",
  "with-notes": "with-notes",
  "no-notes": "no-notes",
  "03-messy-context": "messy",
};
export const plotUrl = (folder: string, path: string) => `${base}/results/${plotDir[folder]}/${path.split("/").pop()}`;
