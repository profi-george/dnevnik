"use client";

import { useState, useTransition } from "react";
import { createNote } from "@/app/actions";
import { COPY } from "@/lib/microcopy";
import { IconPlus } from "@/components/icons";

export default function NoteComposer() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setTitle("");
    setText("");
  }

  function save() {
    if (!text.trim()) {
      close();
      return;
    }
    const formData = new FormData();
    formData.set("title", title);
    formData.set("text", text);
    startTransition(async () => {
      await createNote(formData);
      close();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-left text-13 text-fg-subtle shadow-card hover:border-line-strong"
      >
        <IconPlus className="h-3.5 w-3.5 shrink-0" />
        {COPY.cta.addNote}
      </button>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-1.5 rounded-lg border border-line-strong bg-surface p-3 shadow-pop">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={COPY.fields.noteTitle.placeholder}
        className="bg-transparent text-13 font-semibold text-fg outline-none placeholder:font-normal placeholder:text-fg-subtle"
      />
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={COPY.fields.noteText.placeholder}
        className="resize-none bg-transparent text-13 text-fg outline-none placeholder:text-fg-subtle"
      />
      <div className="flex items-center gap-3 border-t border-line-soft pt-2">
        <button type="button" onClick={save} disabled={isPending} className="btn btn-primary btn-sm">
          {isPending ? "Сохраняю…" : "Сохранить"}
        </button>
        <button type="button" onClick={close} className="btn btn-ghost btn-sm">
          {COPY.cta.dontSave}
        </button>
      </div>
    </div>
  );
}
