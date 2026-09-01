"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateActionField, getPlacesForProject } from "@/app/actions";

type Field = "date" | "place" | "description" | "justification" | "note" | "reportUrl";

type Props = {
  id: string;
  field: Field;
  value: string;
  displayValue?: string;
  type?: "text" | "date";
  placeholder?: string;
  autocompleteProjectId?: string;
};

type Status = { kind: "success" | "error"; text: string } | null;

export default function InlineField({
  id,
  field,
  value,
  displayValue,
  type = "text",
  placeholder,
  autocompleteProjectId,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>(null);
  const [, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Многострочные поля растут вместе с содержимым — как автоподбор высоты строки в экселе.
  const useTextarea = type === "text" && field !== "place";

  useEffect(() => {
    if (editing && useTextarea && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editing, draft, useTextarea]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2400);
    return () => window.clearTimeout(timer);
  }, [status]);

  function startEdit() {
    setDraft(value);
    setStatus(null);
    setEditing(true);
    if (autocompleteProjectId && suggestions.length === 0) {
      startTransition(() => {
        getPlacesForProject(autocompleteProjectId).then(setSuggestions);
      });
    }
  }

  function save() {
    setEditing(false);
    if (draft === value) return;
    startTransition(async () => {
      const result = await updateActionField(id, field, draft);
      if (!result.ok) {
        setStatus({ kind: "error", text: result.error });
      } else if (result.datesShifted) {
        setStatus({ kind: "success", text: "Сохранено — проверки пересчитаны" });
      } else {
        setStatus({ kind: "success", text: "Сохранено" });
      }
    });
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  const listId = autocompleteProjectId ? `places-${id}` : undefined;

  if (editing) {
    if (useTextarea) {
      return (
        <textarea
          ref={textareaRef}
          autoFocus
          rows={1}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") cancel();
          }}
          className="block w-full min-w-0 resize-none overflow-hidden rounded border border-ink-500 bg-white px-1.5 py-1 text-sm"
        />
      );
    }

    return (
      <>
        <input
          autoFocus
          type={type}
          value={draft}
          placeholder={placeholder}
          list={listId}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") cancel();
          }}
          className="w-full min-w-0 rounded border border-ink-500 bg-white px-1.5 py-1 text-sm"
        />
        {listId && (
          <datalist id={listId}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={startEdit}
        className={`block w-full min-w-0 whitespace-pre-wrap break-words rounded px-1.5 py-1 text-left text-sm underline decoration-dotted decoration-neutral-300 underline-offset-4 hover:bg-neutral-100 hover:decoration-ink-500 ${
          value ? "text-neutral-800" : "text-neutral-300"
        }`}
      >
        {displayValue ?? (value || placeholder || "—")}
      </button>
      {status && (
        <span
          className={`px-1.5 text-xs ${status.kind === "error" ? "text-red-600" : "text-emerald-600"}`}
        >
          {status.kind === "error" ? "⚠ " : "✓ "}
          {status.text}
        </span>
      )}
    </div>
  );
}
