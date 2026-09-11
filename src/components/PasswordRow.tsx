"use client";

import { useEffect, useState, useTransition } from "react";
import { updateProjectPasswordField } from "@/app/actions";
import { COPY } from "@/lib/microcopy";
import { useProjectEditing } from "@/components/ProjectEditContext";
import PasswordDeleteButton from "@/components/PasswordDeleteButton";
import { IconAlert, IconCheck, IconEye, IconEyeOff } from "@/components/icons";

type Field = "label" | "value";
type Status = { kind: "success" | "error"; text: string } | null;

const F = COPY.passwordFields;

function EditableField({
  id,
  projectId,
  field,
  value,
  placeholder,
  masked,
}: {
  id: string;
  projectId: string;
  field: Field;
  value: string;
  placeholder?: string;
  masked?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState<Status>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2400);
    return () => window.clearTimeout(timer);
  }, [status]);

  function save(next: string) {
    setEditing(false);
    if (next === value) return;
    startTransition(async () => {
      const result = await updateProjectPasswordField(id, projectId, field, next);
      setStatus(
        result.ok ? { kind: "success", text: "Сохранено" } : { kind: "error", text: result.error },
      );
    });
  }

  const statusEl = status && (
    <span className={`cell-status ${status.kind === "error" ? "text-danger" : "text-ok"}`}>
      {status.kind === "error" ? (
        <IconAlert className="h-3 w-3 shrink-0" />
      ) : (
        <IconCheck className="h-3 w-3 shrink-0" />
      )}
      {status.text}
    </span>
  );

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => save(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save(draft);
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="cell-input"
      />
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        title="Клик — редактировать"
        className={`cell font-mono ${value ? "" : "cell-empty"}`}
      >
        {value ? (masked ? "•".repeat(Math.min(value.length, 16)) : value) : placeholder || "—"}
      </button>
      {statusEl}
    </div>
  );
}

type Password = { id: string; label: string; value: string };

export default function PasswordRow({ id, projectId, label, value }: Password & { projectId: string }) {
  const editing = useProjectEditing();
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex items-center gap-2 py-2">
      <div className="w-40 shrink-0">
        {editing ? (
          <EditableField
            id={id}
            projectId={projectId}
            field="label"
            value={label}
            placeholder={F.label.placeholder}
          />
        ) : (
          <span className="text-13 font-medium text-fg">{label}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <EditableField
            id={id}
            projectId={projectId}
            field="value"
            value={value}
            placeholder={F.value.placeholder}
          />
        ) : (
          <span className="cell font-mono">
            {value ? (revealed ? value : "•".repeat(Math.min(value.length, 16))) : "—"}
          </span>
        )}
      </div>
      {!editing && value && (
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          title={revealed ? COPY.cta.hidePassword : COPY.cta.showPassword}
          aria-label={revealed ? COPY.cta.hidePassword : COPY.cta.showPassword}
          className="btn-icon shrink-0"
        >
          {revealed ? <IconEyeOff className="h-3.5 w-3.5" /> : <IconEye className="h-3.5 w-3.5" />}
        </button>
      )}
      {editing && <PasswordDeleteButton id={id} projectId={projectId} />}
    </div>
  );
}
