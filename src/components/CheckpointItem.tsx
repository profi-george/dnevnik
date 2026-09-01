"use client";

import { useEffect, useState, useTransition } from "react";
import { submitCheckpointResult, updateCheckpointDate } from "@/app/actions";
import { CHECKPOINT_TYPE_LABEL } from "@/lib/labels";
import { COPY } from "@/lib/microcopy";

type Props = {
  id: string;
  type: string;
  status: string;
  overdue: boolean;
  plannedDateLabel: string;
  plannedDateValue: string;
  result: string | null;
};

type Status = { kind: "success" | "error"; text: string } | null;

export default function CheckpointItem({
  id,
  type,
  status,
  overdue,
  plannedDateLabel,
  plannedDateValue,
  result,
}: Props) {
  const [open, setOpen] = useState(false);
  const [dateStatus, setDateStatus] = useState<Status>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!dateStatus) return;
    const timer = window.setTimeout(() => setDateStatus(null), 2400);
    return () => window.clearTimeout(timer);
  }, [dateStatus]);

  const color =
    status === "DONE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : overdue
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-neutral-50 text-neutral-500 border-neutral-200";

  const label = status === "DONE" ? "снято" : overdue ? "просрочено" : "ждёт результата";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={overdue ? COPY.tooltips.overdue : COPY.tooltips.checkpoints}
        className={`w-full break-words rounded border px-2 py-1 text-left text-xs leading-snug hover:brightness-95 ${color}`}
      >
        {CHECKPOINT_TYPE_LABEL[type]} · {plannedDateLabel} · {label}
      </button>

      {open && (
        <div className="flex flex-col gap-2 rounded border border-neutral-200 bg-neutral-50 p-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-600">Дата проверки</span>
            <input
              type="date"
              defaultValue={plannedDateValue}
              onBlur={(e) => {
                if (e.target.value === plannedDateValue) return;
                startTransition(async () => {
                  const res = await updateCheckpointDate(id, e.target.value);
                  setDateStatus(
                    res.ok
                      ? { kind: "success", text: "Дата сохранена" }
                      : { kind: "error", text: res.error },
                  );
                });
              }}
              className="rounded border border-neutral-300 px-2 py-1 text-sm"
            />
            {dateStatus && (
              <span
                className={`text-xs ${dateStatus.kind === "error" ? "text-red-600" : "text-emerald-600"}`}
              >
                {dateStatus.kind === "error" ? "⚠ " : "✓ "}
                {dateStatus.text}
              </span>
            )}
          </label>

          <form action={submitCheckpointResult} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={id} />
            <span className="text-xs font-medium text-neutral-600">{COPY.fields.result.label}</span>
            <textarea
              name="result"
              required
              rows={2}
              defaultValue={result ?? ""}
              placeholder={COPY.fields.result.placeholder}
              className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="self-start rounded bg-ink-600 px-3 py-2 text-xs font-medium text-white hover:bg-ink-700"
            >
              {overdue ? COPY.cta.saveResultOverdue : COPY.cta.saveResult}
            </button>
            <span className="text-xs text-neutral-400">{COPY.fields.result.hint}</span>
          </form>
        </div>
      )}
    </div>
  );
}
