"use client";

import { useEffect, useState, useTransition } from "react";
import {
  submitCheckpointResult,
  parseCheckpointFollowUp,
  createCheckpointFollowUpActions,
} from "@/app/actions";
import { COPY } from "@/lib/microcopy";
import type { ParsedAction } from "@/lib/gemini";

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-ink-600" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

type Props = {
  checkpointId: string;
  overdue: boolean;
  defaultResult: string;
  onSaved?: () => void;
};

type FollowUpState = "closed" | "parsing" | "review" | "created";

const inputClass = "rounded border border-neutral-300 px-2 py-1.5 text-sm";

export default function CheckpointResultForm({ checkpointId, overdue, defaultResult, onSaved }: Props) {
  const [result, setResult] = useState(defaultResult);
  const [saved, setSaved] = useState(!!defaultResult);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [followUp, setFollowUp] = useState<FollowUpState>("closed");
  const [followUpElapsed, setFollowUpElapsed] = useState(0);
  const [followUpRows, setFollowUpRows] = useState<ParsedAction[]>([]);
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
      const res = await createCheckpointFollowUpActions(checkpointId, followUpRows);
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
      <div className="flex gap-2">
        <textarea
          value={result}
          onChange={(e) => setResult(e.target.value)}
          required
          rows={2}
          aria-label={COPY.fields.result.label}
          placeholder={COPY.fields.result.placeholder}
          className={`flex-1 ${inputClass}`}
        />
        <button
          type="button"
          onClick={save}
          disabled={isPending || !result.trim()}
          className="self-start rounded bg-ink-600 px-3 py-2 text-xs font-medium text-white hover:bg-ink-700 disabled:opacity-50"
        >
          {overdue ? COPY.cta.saveResultOverdue : COPY.cta.saveResult}
        </button>
      </div>
      {saveError && <p className="text-xs text-red-600">⚠ {saveError}</p>}
      {saved ? (
        <p className="text-xs text-emerald-600">✓ Результат сохранён</p>
      ) : (
        <p className="text-xs text-neutral-400">{overdue ? COPY.tooltips.overdue : COPY.fields.result.hint}</p>
      )}

      {saved && followUp === "closed" && (
        <button
          type="button"
          onClick={startFollowUp}
          className="self-start text-xs text-ink-600 hover:underline"
        >
          Здесь есть новое изменение? Разобрать через ИИ →
        </button>
      )}

      {followUp === "parsing" && (
        <div className="flex items-center gap-3 rounded border border-ink-500/30 bg-ink-50 px-3 py-2">
          <Spinner />
          <span className="text-xs font-medium text-ink-700">Идёт разбор через Gemini… {followUpElapsed} сек</span>
        </div>
      )}

      {followUp === "review" && (
        <div className="flex flex-col gap-3 rounded border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-xs font-medium text-neutral-600">
            {followUpRows.length === 1 ? "Новое действие" : "Новые действия"} по итогам проверки — проверьте перед сохранением:
          </p>
          {followUpRows.map((row, i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded border border-neutral-200 bg-white p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-neutral-400">#{i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Убрать
                </button>
              </div>
              <label className="flex flex-col gap-0.5">
                <span className="text-xs text-neutral-500">Где именно</span>
                <input
                  value={row.place}
                  onChange={(e) => updateRow(i, "place", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-xs text-neutral-500">Что изменили</span>
                <input
                  value={row.description}
                  onChange={(e) => updateRow(i, "description", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-xs text-neutral-500">Почему так решили</span>
                <input
                  value={row.justification}
                  onChange={(e) => updateRow(i, "justification", e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          ))}

          <button type="button" onClick={addBlankRow} className="self-start text-xs text-ink-600 hover:underline">
            + Добавить строку вручную
          </button>

          {followUpError && <p className="text-xs text-red-600">⚠ {followUpError}</p>}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveFollowUp}
              disabled={isPending || followUpRows.length === 0}
              className="rounded bg-ink-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-ink-700 disabled:opacity-50"
            >
              {isPending
                ? "Сохраняю…"
                : `Сохранить как новое действие${followUpRows.length === 1 ? "" : ` (${followUpRows.length})`}`}
            </button>
            <button
              type="button"
              onClick={() => setFollowUp("closed")}
              className="text-xs text-neutral-500 hover:text-ink-600"
            >
              Не нужно
            </button>
          </div>
        </div>
      )}

      {followUp === "created" && (
        <p className="text-xs text-emerald-600">
          ✓ {createdCount === 1 ? "Действие добавлено в дневник" : `Действия (${createdCount}) добавлены в дневник`} —
          для него уже запланированы проверки сутки/неделя/месяц.
        </p>
      )}
    </div>
  );
}
