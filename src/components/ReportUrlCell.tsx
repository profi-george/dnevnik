"use client";

import { useEffect, useState, useTransition } from "react";
import { updateActionField } from "@/app/actions";
import { COPY } from "@/lib/microcopy";

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
        className="w-full min-w-[8rem] rounded border border-ink-500 bg-white px-1.5 py-1 text-sm"
      />
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            title={COPY.tooltips.reportUrl}
            className="truncate text-sm text-ink-600 hover:underline"
          >
            Открыть →
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title={COPY.cta.addReportUrl}
            className="rounded px-1.5 py-1 text-left text-sm text-neutral-300 hover:bg-neutral-100"
          >
            —
          </button>
        )}
        {value && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title={COPY.cta.editReportUrl}
            className="rounded px-1 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            ✎
          </button>
        )}
      </div>
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
