"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import NoteCard from "@/components/NoteCard";
import NoteComposer from "@/components/NoteComposer";
import { COPY } from "@/lib/microcopy";
import { IconSearch } from "@/components/icons";

type Project = { id: string; name: string };

type Note = {
  id: string;
  title: string | null;
  text: string;
  color: string;
  pinned: boolean;
  projectId: string | null;
  project: Project | null;
};

function matches(note: Note, q: string): boolean {
  const needle = q.toLowerCase();
  return (note.title ?? "").toLowerCase().includes(needle) || note.text.toLowerCase().includes(needle);
}

function Grid({ notes, projects }: { notes: Note[]; projects: Project[] }) {
  return (
    <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} projects={projects} />
      ))}
    </div>
  );
}

export default function NotesBoard({ notes, projects }: { notes: Note[]; projects: Project[] }) {
  // Открытие с /search?q=… или из карточки проекта (?projectId=…) должно сразу
  // применить тот же фильтр, без лишнего клика.
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [projectFilter, setProjectFilter] = useState(() => searchParams.get("projectId") ?? "");

  const byQuery = useMemo(() => (q.trim() ? notes.filter((n) => matches(n, q)) : notes), [notes, q]);
  const filtered = useMemo(
    () => (projectFilter ? byQuery.filter((n) => n.projectId === projectFilter) : byQuery),
    [byQuery, projectFilter],
  );
  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);

  return (
    <div className="flex flex-col gap-4">
      {projects.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setProjectFilter("")}
            aria-pressed={!projectFilter}
            className={`pill ${!projectFilter ? "pill-active" : ""}`}
          >
            Все заметки
          </button>
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProjectFilter(p.id)}
              aria-pressed={projectFilter === p.id}
              className={`pill ${projectFilter === p.id ? "pill-active" : ""}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <label className="relative block max-w-sm">
        <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={COPY.fields.noteSearch.placeholder}
          className="field pl-8"
        />
      </label>

      <NoteComposer projects={projects} defaultProjectId={projectFilter || undefined} />

      {filtered.length === 0 ? (
        <div className="card px-6 py-14">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
            <p className="text-base font-medium text-fg">
              {q.trim() || projectFilter ? "Ничего не нашлось" : COPY.empty.notesEmpty.title}
            </p>
            {!q.trim() && !projectFilter && (
              <p className="text-13 leading-relaxed text-fg-muted">{COPY.empty.notesEmpty.body}</p>
            )}
          </div>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="micro">Закреплённые</h2>
              <Grid notes={pinned} projects={projects} />
            </div>
          )}
          {rest.length > 0 && (
            <div className="flex flex-col gap-2">
              {pinned.length > 0 && <h2 className="micro">Остальные</h2>}
              <Grid notes={rest} projects={projects} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
