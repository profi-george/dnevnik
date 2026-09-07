"use client";

import { useEffect, useState, useTransition } from "react";
import { updateActionField } from "@/app/actions";
import { COPY } from "@/lib/microcopy";
import { IconAlert, IconCheck, IconExternal, IconPencil, IconPlus } from "@/components/icons";

type Status = { kind: "success" | "error"; text: string } | null;

export default function ReportUrlCell({ id, value }: { id: string; value: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState<Status>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2400);
    return () => window.clearTimeout(timer);
  }, [status]);

  function save() {
    setEditing(false);
    if (draft === value) return;
    startTransition(async () => {
      const result = await updateActionField(id, "reportUrl", draft);
      setStatus(
        result.ok ? { kind: "success", text: "Сохранено" } : { kind: "error", text: result.error },
      );
    });
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="url"
        value={draft}
        placeholder={COPY.fields.reportUrl.placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
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
      {value ? (
        <div className="flex items-center gap-0.5">
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            title={COPY.tooltips.reportUrl}
            className="link inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-13"
          >
            <IconExternal className="h-3 w-3" />
            Отчёт
          </a>
          <button
            type="button"
            onClick={() => setEditing(true)}
            title={COPY.cta.editReportUrl}
            aria-label={COPY.cta.editReportUrl}
            className="btn-icon h-5 w-5"
          >
            <IconPencil className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          title={COPY.cta.addReportUrl}
          aria-label={COPY.cta.addReportUrl}
          className="btn-icon h-6 w-6"
        >
          <IconPlus className="h-3.5 w-3.5" />
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
  );
}
