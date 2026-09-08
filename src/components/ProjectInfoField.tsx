"use client";

import { useEffect, useState, useTransition } from "react";
import { updateProjectInfoField, type ProjectInfoField as Field } from "@/app/actions";
import { IconAlert, IconCheck, IconPencil } from "@/components/icons";

type Status = { kind: "success" | "error"; text: string } | null;

export default function ProjectInfoField({
  projectId,
  field,
  label,
  value,
  hint,
}: {
  projectId: string;
  field: Field;
  label: string;
  value: string | null;
  hint?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [status, setStatus] = useState<Status>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2400);
    return () => window.clearTimeout(timer);
  }, [status]);

  function save() {
    setEditing(false);
    if (draft === (value ?? "")) return;
    startTransition(async () => {
      const result = await updateProjectInfoField(projectId, field, draft);
      setStatus(
        result.ok ? { kind: "success", text: "Сохранено" } : { kind: "error", text: result.error },
      );
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-13 font-medium text-fg">{label}</span>

      {editing ? (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") {
              setDraft(value ?? "");
              setEditing(false);
            }
          }}
          className="field"
        />
      ) : (
        <div className="flex items-center gap-1">
          <span className={`min-w-0 flex-1 truncate text-13 ${value ? "text-fg" : "text-fg-subtle"}`}>
            {value || "—"}
          </span>
          <button
            type="button"
            onClick={() => {
              setDraft(value ?? "");
              setEditing(true);
            }}
            title="Редактировать"
            aria-label="Редактировать"
            className="btn-icon h-5 w-5 shrink-0"
          >
            <IconPencil className="h-3 w-3" />
          </button>
        </div>
      )}

      {hint && !editing && <span className="hint">{hint}</span>}
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
  );
}
