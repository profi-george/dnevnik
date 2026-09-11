"use client";

import { useMemo, useState } from "react";
import NoteCard from "@/components/NoteCard";
import NoteComposer from "@/components/NoteComposer";
import { COPY } from "@/lib/microcopy";
import { IconSearch } from "@/components/icons";

type Note = {
  id: string;
  title: string | null;
  text: string;
  color: string;
  pinned: boolean;
};

function matches(note: Note, q: string): boolean {
  const needle = q.toLowerCase();
  return (note.title ?? "").toLowerCase().includes(needle) || note.text.toLowerCase().includes(needle);
}

function Grid({ notes }: { notes: Note[] }) {
  return (
    <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}

export default function NotesBoard({ notes }: { notes: Note[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => (q.trim() ? notes.filter((n) => matches(n, q)) : notes), [notes, q]);
  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);

  return (
    <div className="flex flex-col gap-4">
      <label className="relative block max-w-sm">
        <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={COPY.fields.noteSearch.placeholder}
          className="field pl-8"
        />
      </label>

      <NoteComposer />

      {filtered.length === 0 ? (
        <div className="card px-6 py-14">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5 text-center">
            <p className="text-base font-medium text-fg">
              {q.trim() ? "Ничего не нашлось" : COPY.empty.notesEmpty.title}
            </p>
            {!q.trim() && <p className="text-13 leading-relaxed text-fg-muted">{COPY.empty.notesEmpty.body}</p>}
          </div>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="micro">Закреплённые</h2>
              <Grid notes={pinned} />
            </div>
          )}
          {rest.length > 0 && (
            <div className="flex flex-col gap-2">
              {pinned.length > 0 && <h2 className="micro">Остальные</h2>}
              <Grid notes={rest} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
