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
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-left text-13 text-fg-subtle shadow-card transition-colors hover:border-line-strong hover:text-fg-muted"
      >
        <IconPlus className="h-3.5 w-3.5 shrink-0" />
        {COPY.cta.addNote}
      </button>
    );
  }

  return (
    // Тот же радиус, паддинг и шрифтовые ступени, что у готовой карточки заметки —
    // композер выглядит как заметка, которую уже начали писать, а не как чужая форма.
    <div className="flex flex-col gap-1.5 rounded-lg border border-line-strong bg-surface p-3 shadow-pop">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={COPY.fields.noteTitle.placeholder}
        className="note-field text-13 font-semibold"
      />
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={COPY.fields.noteText.placeholder}
        className="note-field resize-none text-13"
      />
      <div className="mt-0.5 flex items-center gap-2 border-t border-line-soft pt-2.5">
        <button type="button" onClick={save} disabled={isPending} className="btn btn-primary">
          {isPending ? "Сохраняю…" : "Сохранить"}
        </button>
        <button type="button" onClick={close} className="btn btn-ghost">
          {COPY.cta.dontSave}
        </button>
      </div>
    </div>
  );
}
