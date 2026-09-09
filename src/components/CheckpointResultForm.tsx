"use client";

import { useEffect, useState, useTransition } from "react";
import {
  submitCheckpointResult,
  closeCheckpointWithoutResult,
  parseCheckpointFollowUp,
  createCheckpointFollowUpActions,
} from "@/app/actions";
import { toDateInputValue } from "@/lib/dates";
import { COPY } from "@/lib/microcopy";
import type { ParsedAction } from "@/lib/gemini";
import { IconAlert, IconCheck, IconPlus, IconSparkles, Spinner } from "@/components/icons";

type Props = {
  checkpointId: string;
  defaultResult: string;
  onSaved?: () => void;
};

type FollowUpState = "closed" | "parsing" | "review" | "created";

export default function CheckpointResultForm({ checkpointId, defaultResult, onSaved }: Props) {
  const [result, setResult] = useState(defaultResult);
  const [saved, setSaved] = useState(!!defaultResult);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [followUp, setFollowUp] = useState<FollowUpState>("closed");
  const [followUpElapsed, setFollowUpElapsed] = useState(0);
  const [followUpRows, setFollowUpRows] = useState<ParsedAction[]>([]);
  const [followUpDate, setFollowUpDate] = useState(toDateInputValue(new Date()));
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);

  useEffect(() => {
    if (followUp !== "parsing") {
      setFollowUpElapsed(0);
      return;
    }
    const timer = window.setInterval(() => setFollowUpElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [followUp]);

  function save() {
    setSaveError(null);
    startTransition(async () => {
      const res = await submitCheckpointResult(checkpointId, result);
      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      setSaved(true);
      onSaved?.();
    });
  }

  function closeWithoutResult() {
    setSaveError(null);
    startTransition(async () => {
      const res = await closeCheckpointWithoutResult(checkpointId);
      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      setResult("");
      setSaved(true);
      onSaved?.();
    });
  }

  function startFollowUp() {
    setFollowUpError(null);
    setFollowUp("parsing");
    startTransition(async () => {
      const res = await parseCheckpointFollowUp(checkpointId, result);
      if (!res.ok) {
        setFollowUp("closed");
        setFollowUpError(res.error);
        return;
      }
      if (res.actions.length === 0) {
        setFollowUpError("ИИ не нашёл в тексте нового изменения — впишите вручную, если оно есть, или закройте.");
        setFollowUpRows([{ place: "", description: "", justification: "", note: "" }]);
      } else {
        setFollowUpRows(res.actions);
      }
      setFollowUp("review");
    });
  }

  function updateRow(index: number, field: keyof ParsedAction, value: string) {
    setFollowUpRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function removeRow(index: number) {
    setFollowUpRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addBlankRow() {
    setFollowUpRows((prev) => [...prev, { place: "", description: "", justification: "", note: "" }]);
  }

  function saveFollowUp() {
    setFollowUpError(null);
    startTransition(async () => {
      const res = await createCheckpointFollowUpActions(checkpointId, followUpRows, followUpDate);
      if (!res.ok) {
        setFollowUpError(res.error);
        return;
      }
      setCreatedCount(res.count);
      setFollowUp("created");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {/* flex-wrap: в узкой колонке дневника кнопка уходит под поле, на «Снять сегодня» остаётся рядом */}
      <div className="flex flex-wrap gap-2">
        <textarea
          value={result}
          onChange={(e) => setResult(e.target.value)}
          required
          rows={2}
          aria-label={COPY.fields.result.label}
          className="field min-w-48 flex-1"
        />
        <button
          type="button"
          onClick={save}
          disabled={isPending || !result.trim()}
          className="btn btn-primary btn-sm h-fit self-start"
        >
          {isPending && <Spinner className="h-3 w-3" />}
          {COPY.cta.saveResult}
        </button>
      </div>

      {!saved && (
        <button
          type="button"
          onClick={closeWithoutResult}
          disabled={isPending}
          className="link w-fit text-2xs"
        >
          Снять без результата — писать нечего
        </button>
      )}

      {saveError && (
        <p className="inline-flex items-center gap-1 text-2xs text-danger">
          <IconAlert className="h-3 w-3 shrink-0" />
          {saveError}
        </p>
      )}

      {saved && (
        <p className="inline-flex items-center gap-1 text-2xs text-ok">
          <IconCheck className="h-3 w-3 shrink-0" />
          {result.trim() ? "Результат сохранён" : "Снято без результата"}
        </p>
      )}

      {saved && result.trim() && followUp === "closed" && (
        <button
          type="button"
          onClick={startFollowUp}
          className="link inline-flex w-fit items-center gap-1.5 text-2xs"
        >
          <IconSparkles className="h-3 w-3" />
          Здесь есть новое изменение? Разобрать через ИИ
        </button>
      )}

      {followUp === "parsing" && (
        <div className="flex items-center gap-2.5 rounded-md border border-ink-200 bg-ink-50 px-2.5 py-2 text-ink-700">
          <Spinner className="h-3.5 w-3.5" />
          <span className="text-2xs font-medium tabular-nums">
            Идёт разбор через Gemini… {followUpElapsed} сек
          </span>
        </div>
      )}

      {followUp === "review" && (
        <div className="panel flex flex-col gap-2.5 p-2.5">
          <p className="text-2xs font-medium text-fg-muted">
            {followUpRows.length === 1 ? "Новое действие" : "Новые действия"} по итогам проверки — проверьте перед сохранением:
          </p>

          <label className="flex flex-col gap-1">
            <span className="micro">Дата изменения</span>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="field w-auto"
            />
          </label>

          {followUpRows.map((row, i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-md border border-line bg-surface p-2.5">
              <div className="flex items-center justify-between">
                <span className="micro tabular-nums">№ {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="text-2xs text-fg-subtle transition-colors hover:text-danger"
                >
                  Убрать
                </button>
              </div>
              <label className="flex flex-col gap-1">
                <span className="micro">Где именно</span>
                <input
                  value={row.place}
                  onChange={(e) => updateRow(i, "place", e.target.value)}
                  className="field"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="micro">Что изменили</span>
                <input
                  value={row.description}
                  onChange={(e) => updateRow(i, "description", e.target.value)}
                  className="field"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="micro">Почему так решили</span>
                <input
                  value={row.justification}
                  onChange={(e) => updateRow(i, "justification", e.target.value)}
                  className="field"
                />
              </label>
            </div>
          ))}

          <button
            type="button"
            onClick={addBlankRow}
            className="link inline-flex w-fit items-center gap-1 text-2xs"
          >
            <IconPlus className="h-3 w-3" />
            Добавить строку вручную
          </button>

          {followUpError && (
            <p className="inline-flex items-start gap-1 text-2xs text-danger">
              <IconAlert className="mt-px h-3 w-3 shrink-0" />
              {followUpError}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveFollowUp}
              disabled={isPending || followUpRows.length === 0}
              className="btn btn-primary btn-sm"
            >
              {isPending && <Spinner className="h-3 w-3" />}
              {isPending
                ? "Сохраняю…"
                : `Сохранить как новое действие${followUpRows.length === 1 ? "" : ` (${followUpRows.length})`}`}
            </button>
            <button
              type="button"
              onClick={() => setFollowUp("closed")}
              className="btn btn-ghost btn-sm"
            >
              Не нужно
            </button>
          </div>
        </div>
      )}

      {followUp === "created" && (
        <p className="inline-flex items-start gap-1 text-2xs text-ok">
          <IconCheck className="mt-px h-3 w-3 shrink-0" />
          <span>
            {createdCount === 1
              ? "Действие добавлено в дневник"
              : `Действия (${createdCount}) добавлены в дневник`}{" "}
            — для него уже запланированы проверки сутки/неделя/месяц.
          </span>
        </p>
      )}
    </div>
  );
}
