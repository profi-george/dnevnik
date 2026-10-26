"use client";

import { useEffect, useState, useTransition } from "react";
import { updateCheckpointDate, deleteCheckpoint } from "@/app/actions";
import { CHECKPOINT_TYPE_LABEL } from "@/lib/labels";
import { COPY } from "@/lib/microcopy";
import CheckpointResultForm from "@/components/CheckpointResultForm";
import { IconAlert, IconCheck, IconX } from "@/components/icons";

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
  const [editingDate, setEditingDate] = useState(false);
  const [dateStatus, setDateStatus] = useState<Status>(null);
  // Результат, сохранённый прямо сейчас: сервер страницу не ревалидирует (см. ниже),
  // поэтому показываем его под чипом без перезагрузки.
  const [savedResult, setSavedResult] = useState<string | null>(null);
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

  // Цветовая кодировка статуса: снято — зелёный, просрочено — красный,
  // ждёт результата — нейтральный (это спокойное состояние по умолчанию).
  const tone = isDone
    ? "border-ok-border bg-ok-soft text-ok"
    : overdue
      ? "border-danger-border bg-danger-soft text-danger"
      : "border-line bg-surface text-fg-muted";

  // В чипе статус короткий, чтобы строка «тип · дата · статус» помещалась целиком:
  // полная формулировка остаётся в подсказке при наведении.
  const fullLabel = isDone ? "снято" : overdue ? "просрочено" : "ждёт результата";
  const label = isDone ? "снято" : overdue ? "просрочено" : "ждёт";
  // «Своя дата» как название не несёт смысла — сама дата и так видна и правится кликом
  const typeLabel = type === "CUSTOM" ? null : CHECKPOINT_TYPE_LABEL[type];
  const shownResult = (savedResult ?? result ?? "").trim();

  function saveDate(value: string) {
    setEditingDate(false);
    if (!value || value === plannedDateValue) return;
    startTransition(async () => {
      const res = await updateCheckpointDate(id, value);
      setDateStatus(
        res.ok ? { kind: "success", text: "Дата сохранена" } : { kind: "error", text: res.error },
      );
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-0.5">
        {/* Клик по чипу открывает результат, клик по дате — правку даты */}
        <div
          onClick={() => setOpen((v) => !v)}
          title={`${typeLabel ? `${typeLabel} · ` : ""}${plannedDateLabel} · ${fullLabel}\n\n${
            overdue ? COPY.tooltips.overdue : COPY.tooltips.checkpoints
          }`}
          className={`flex min-w-0 flex-1 cursor-pointer items-start gap-1.5 rounded-md border px-2 py-0.5 text-left text-2xs leading-4 transition-colors hover:brightness-[0.97] ${tone}`}
        >
          <span className="dot mt-1.5" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="break-words">
              {typeLabel && (
                <>
                  <span className="font-medium">{typeLabel}</span>
                  <span className="opacity-45"> · </span>
                </>
              )}
              {editingDate ? (
                <input
                  type="date"
                  autoFocus
                  defaultValue={plannedDateValue}
                  aria-label="Дата проверки"
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => saveDate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveDate(e.currentTarget.value);
                    }
                    if (e.key === "Escape") setEditingDate(false);
                  }}
                  className="field field-sm w-auto text-fg"
                />
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDateStatus(null);
                    setEditingDate(true);
                  }}
                  title="Клик — изменить дату"
                  className="rounded-sm tabular-nums underline decoration-dotted underline-offset-2 hover:decoration-solid"
                >
                  {plannedDateLabel}
                </button>
              )}
              <span className="opacity-45"> · </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((v) => !v);
                }}
                aria-expanded={open}
                className="rounded-sm"
              >
                {label}
                {label !== fullLabel && <span className="sr-only">{fullLabel}</span>}
              </button>
            </div>
            {shownResult && (
              <p className="mt-0.5 whitespace-pre-wrap break-words text-fg">{shownResult}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          title="Удалить эту проверку"
          aria-label="Удалить эту проверку"
          className="btn-icon btn-icon-danger h-5 w-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <IconX className="h-3 w-3" />
        </button>
      </div>

      {deleteError && (
        <span className="cell-status text-danger">
          <IconAlert className="h-3 w-3 shrink-0" />
          {deleteError}
        </span>
      )}

      {dateStatus && (
        <span className={`cell-status ${dateStatus.kind === "error" ? "text-danger" : "text-ok"}`}>
          {dateStatus.kind === "error" ? (
            <IconAlert className="h-3 w-3 shrink-0" />
          ) : (
            <IconCheck className="h-3 w-3 shrink-0" />
          )}
          {dateStatus.text}
        </span>
      )}

      {open && (
        <div className="panel flex flex-col gap-1 p-2">
          <span className="micro">{COPY.fields.result.label}</span>
          <CheckpointResultForm
            checkpointId={id}
            defaultResult={shownResult}
            onSaved={(text) => {
              setLocallyDone(true);
              setSavedResult(text);
            }}
          />
        </div>
      )}
    </div>
  );
}
