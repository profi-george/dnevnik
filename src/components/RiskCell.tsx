"use client";

import { useEffect, useState, useTransition } from "react";
import { updateProjectRiskField } from "@/app/actions";
import { IconAlert, IconCheck } from "@/components/icons";

type Field = "risk" | "url" | "frequency";
type Status = { kind: "success" | "error"; text: string } | null;

type Props = {
  id: string;
  projectId: string;
  field: Field;
  value: string;
  placeholder?: string;
  readOnly?: boolean;
};

export default function RiskCell({ id, projectId, field, value, placeholder, readOnly }: Props) {
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
      const result = await updateProjectRiskField(id, projectId, field, next);
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

  if (readOnly) {
    return <span className={`cell ${value ? "" : "cell-empty"}`}>{value || placeholder || "—"}</span>;
  }

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
        className={`cell ${value ? "" : "cell-empty"}`}
      >
        {value || placeholder || "—"}
      </button>
      {statusEl}
    </div>
  );
}
