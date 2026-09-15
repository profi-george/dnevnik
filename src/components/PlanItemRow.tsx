"use client";

import { useEffect, useState, useTransition } from "react";
import { togglePlanItemDone, updateProjectPlanItemField, deleteProjectPlanItem } from "@/app/actions";
import { formatDateRu, toDateInputValue } from "@/lib/dates";
import { useProjectEditing } from "@/components/ProjectEditContext";
import { IconAlert, IconCheck, IconTrash } from "@/components/icons";

type Status = { kind: "success" | "error"; text: string } | null;

type PlanItem = {
  id: string;
  text: string;
  done: boolean;
  dueDate: Date | null;
};

export default function PlanItemRow({ id, text, done, dueDate, projectId }: PlanItem & { projectId: string }) {
  const editing = useProjectEditing();
  const [editingText, setEditingText] = useState(false);
  const [draft, setDraft] = useState(text);
  const [editingDate, setEditingDate] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2400);
    return () => window.clearTimeout(timer);
  }, [status]);

  function toggle() {
    startTransition(async () => {
      const result = await togglePlanItemDone(id, projectId, !done);
      if (!result.ok) setStatus({ kind: "error", text: result.error });
    });
  }

  function saveText(next: string) {
    setEditingText(false);
    if (next === text) return;
    startTransition(async () => {
      const result = await updateProjectPlanItemField(id, projectId, "text", next);
      setStatus(result.ok ? { kind: "success", text: "Сохранено" } : { kind: "error", text: result.error });
    });
  }

  function saveDate(next: string) {
    setEditingDate(false);
    startTransition(async () => {
      const result = await updateProjectPlanItemField(id, projectId, "dueDate", next);
      setStatus(result.ok ? { kind: "success", text: "Сохранено" } : { kind: "error", text: result.error });
    });
  }

  return (
    <li className="flex flex-col gap-0.5 py-1.5">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={toggle}
          role="checkbox"
          aria-checked={done}
          title={done ? "Вернуть в план" : "Отметить сделанным"}
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
            done ? "border-ink-600 bg-ink-600 text-white" : "border-line-strong bg-surface hover:border-ink-500"
          }`}
        >
          {done && <IconCheck className="h-3 w-3" />}
        </button>

        {editing && editingText ? (
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => saveText(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveText(draft);
              }
              if (e.key === "Escape") {
                setDraft(text);
                setEditingText(false);
              }
            }}
            className="cell-input flex-1"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!editing) return;
              setDraft(text);
              setEditingText(true);
            }}
            title={editing ? "Клик — редактировать" : undefined}
            className={`flex-1 text-left text-13 ${editing ? "cell" : "cell-readonly"} ${
              done ? "text-fg-subtle line-through" : "text-fg"
            }`}
          >
            {text}
          </button>
        )}

        {editing && (
          <button
            type="button"
            onClick={() =>
              startTransition(() => {
                deleteProjectPlanItem(id, projectId);
              })
            }
            title="Удалить шаг"
            aria-label="Удалить шаг"
            className="btn-icon btn-icon-danger shrink-0"
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 pl-6">
        {editing && editingDate ? (
          <input
            autoFocus
            type="date"
            defaultValue={dueDate ? toDateInputValue(dueDate) : ""}
            onBlur={(e) => saveDate(e.target.value)}
            className="cell-input field-sm w-auto"
          />
        ) : (
          <button
            type="button"
            onClick={() => editing && setEditingDate(true)}
            title={editing ? "Клик — изменить срок" : undefined}
            className={`text-2xs tabular-nums ${dueDate ? "text-fg-subtle" : "text-fg-subtle/60"} ${
              editing ? "cursor-pointer hover:text-fg-muted" : ""
            }`}
          >
            {dueDate ? `до ${formatDateRu(dueDate)}` : editing ? "+ срок" : ""}
          </button>
        )}
        {status && (
          <span className={`cell-status ${status.kind === "error" ? "text-danger" : "text-ok"}`}>
            {status.kind === "error" ? (
              <IconAlert className="h-3 w-3 shrink-0" />
            ) : (
              <IconCheck className="h-3 w-3 shrink-0" />
            )}
            {status.text}
          </span>
        )}
      </div>
    </li>
  );
}
