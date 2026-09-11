"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateNoteField, toggleNotePin, deleteNote } from "@/app/actions";
import { NOTE_COLORS, noteColorClassName } from "@/lib/noteColors";
import { COPY } from "@/lib/microcopy";
import { IconAlert, IconPin, IconTrash } from "@/components/icons";

type Note = {
  id: string;
  title: string | null;
  text: string;
  color: string;
  pinned: boolean;
};

export default function NoteCard({ note }: { note: Note }) {
  const [editingField, setEditingField] = useState<"title" | "text" | null>(null);
  const [title, setTitle] = useState(note.title ?? "");
  const [text, setText] = useState(note.text);
  const [pinned, setPinned] = useState(note.pinned);
  const [colorKey, setColorKey] = useState(note.color);
  const [showPalette, setShowPalette] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPalette) return;
    function onClick(e: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) setShowPalette(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showPalette]);

  function saveField(field: "title" | "text", value: string) {
    const current = field === "title" ? (note.title ?? "") : note.text;
    setEditingField(null);
    if (value === current) return;
    startTransition(async () => {
      const res = await updateNoteField(note.id, field, value);
      if (!res.ok) {
        setError(res.error);
        if (field === "title") setTitle(note.title ?? "");
        else setText(note.text);
      }
    });
  }

  function pickColor(key: string) {
    setColorKey(key);
    setShowPalette(false);
    startTransition(async () => {
      await updateNoteField(note.id, "color", key);
    });
  }

  function togglePin() {
    const next = !pinned;
    setPinned(next);
    startTransition(async () => {
      await toggleNotePin(note.id, next);
    });
  }

  function remove() {
    if (!window.confirm("Удалить заметку? Это не отменить.")) return;
    startTransition(async () => {
      await deleteNote(note.id);
    });
  }

  return (
    <div
      className={`group relative mb-3 flex w-full break-inside-avoid flex-col gap-1.5 rounded-lg border border-line p-3 shadow-card ${noteColorClassName(colorKey)}`}
    >
      <div className="flex items-start justify-between gap-2">
        {editingField === "title" ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveField("title", title)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setTitle(note.title ?? "");
                setEditingField(null);
              }
            }}
            placeholder={COPY.fields.noteTitle.placeholder}
            className="min-w-0 flex-1 bg-transparent text-13 font-semibold text-fg outline-none placeholder:font-normal placeholder:text-fg-subtle"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingField("title")}
            className="min-w-0 flex-1 truncate text-left text-13 font-semibold text-fg"
          >
            {title || <span className="font-normal text-fg-subtle">{COPY.fields.noteTitle.placeholder}</span>}
          </button>
        )}
        <button
          type="button"
          onClick={togglePin}
          title={pinned ? COPY.cta.unpinNote : COPY.cta.pinNote}
          aria-label={pinned ? COPY.cta.unpinNote : COPY.cta.pinNote}
          aria-pressed={pinned}
          className={`btn-icon h-6 w-6 shrink-0 ${pinned ? "text-ink-600" : "text-fg-subtle opacity-0 group-hover:opacity-100"}`}
        >
          <IconPin className="h-3.5 w-3.5" />
        </button>
      </div>

      {editingField === "text" ? (
        <textarea
          autoFocus
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => saveField("text", text)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setText(note.text);
              setEditingField(null);
            }
          }}
          placeholder={COPY.fields.noteText.placeholder}
          className="min-h-16 w-full resize-none bg-transparent text-13 text-fg outline-none placeholder:text-fg-subtle"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingField("text")}
          className="whitespace-pre-wrap break-words text-left text-13 text-fg"
        >
          {text}
        </button>
      )}

      {error && (
        <p className="inline-flex items-center gap-1 text-2xs text-danger">
          <IconAlert className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-1 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100">
        <div ref={paletteRef} className="relative">
          <button
            type="button"
            onClick={() => setShowPalette((v) => !v)}
            title="Цвет"
            aria-label="Цвет заметки"
            className="h-5 w-5 rounded-full border border-line-strong"
            style={{ backgroundColor: `var(--color-${colorKey === "default" ? "surface" : `note-${colorKey}`})` }}
          />
          {showPalette && (
            <div className="absolute bottom-7 left-0 z-20 flex items-center gap-1.5 rounded-full border border-line bg-surface p-1.5 shadow-pop">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => pickColor(c.key)}
                  title={c.label}
                  aria-label={c.label}
                  className={`h-5 w-5 rounded-full border ${
                    colorKey === c.key ? "border-ink-500 ring-2 ring-ink-200" : "border-line-strong"
                  }`}
                  style={{ backgroundColor: `var(--color-${c.key === "default" ? "surface" : `note-${c.key}`})` }}
                />
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={remove}
          title="Удалить заметку"
          aria-label="Удалить заметку"
          className="btn-icon btn-icon-danger h-6 w-6"
        >
          <IconTrash className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
