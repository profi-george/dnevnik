"use client";

import { useEffect, useState, useTransition } from "react";
import { updateCheckpointDate, deleteCheckpoint } from "@/app/actions";
import { CHECKPOINT_TYPE_LABEL } from "@/lib/labels";
import { COPY } from "@/lib/microcopy";
import CheckpointResultForm from "@/components/CheckpointResultForm";

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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [locallyDone, setLocallyDone] = useState(false);
  const [, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Удалить проверку «${CHECKPOINT_TYPE_LABEL[type]}»? Это не отменить.`)) return;
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteCheckpoint(id);
      if (!res.ok) setDeleteError(res.error);
    });
  }

  useEffect(() => {
    if (!dateStatus) return;
    const timer = window.setTimeout(() => setDateStatus(null), 2400);
    return () => window.clearTimeout(timer);
  }, [dateStatus]);

  // Не ждём сервер, чтобы обновить бейдж: submitCheckpointResult нарочно не
  // ревалидирует страницы (см. комментарий в actions.ts), поэтому статус здесь
  // отражаем сразу по колбэку от формы результата.
  const isDone = status === "DONE" || locallyDone;

  const color = isDone
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : overdue
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-neutral-50 text-neutral-500 border-neutral-200";

  const label = isDone ? "снято" : overdue ? "просрочено" : "ждёт результата";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={overdue ? COPY.tooltips.overdue : COPY.tooltips.checkpoints}
          className={`min-w-0 flex-1 break-words rounded border px-2 py-1 text-left text-xs leading-snug hover:brightness-95 ${color}`}
        >
          {CHECKPOINT_TYPE_LABEL[type]} · {plannedDateLabel} · {label}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          title="Удалить эту проверку"
          className="shrink-0 rounded border border-neutral-200 px-1.5 text-xs text-neutral-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        >
          ✕
        </button>
      </div>
      {deleteError && <span className="text-xs text-red-600">⚠ {deleteError}</span>}

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

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-600">{COPY.fields.result.label}</span>
            <CheckpointResultForm
              checkpointId={id}
              overdue={overdue}
              defaultResult={result ?? ""}
              onSaved={() => setLocallyDone(true)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
