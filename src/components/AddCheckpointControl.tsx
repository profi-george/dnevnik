"use client";

import { useState, useTransition } from "react";
import { addCheckpoint } from "@/app/actions";
import { addDays, parseDateInput, toDateInputValue } from "@/lib/dates";

type CheckpointType = "DAY" | "WEEK" | "MONTH" | "CUSTOM";

const TYPE_OPTIONS: { value: CheckpointType; label: string; offsetDays: number | null }[] = [
  { value: "DAY", label: "через сутки", offsetDays: 1 },
  { value: "WEEK", label: "через неделю", offsetDays: 7 },
  { value: "MONTH", label: "через месяц", offsetDays: 30 },
  { value: "CUSTOM", label: "своя дата", offsetDays: null },
];

export default function AddCheckpointControl({
  actionId,
  actionDateValue,
}: {
  actionId: string;
  actionDateValue: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CheckpointType>("WEEK");
  const [customDate, setCustomDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = TYPE_OPTIONS.find((o) => o.value === type)!;
  const computedDate =
    selected.offsetDays !== null
      ? toDateInputValue(addDays(parseDateInput(actionDateValue), selected.offsetDays))
      : customDate;

  function submit() {
    if (!computedDate) {
      setError("Укажите дату.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addCheckpoint(actionId, type, computedDate);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setCustomDate("");
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-xs text-ink-600 hover:underline"
      >
        + Добавить проверку
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded border border-neutral-200 bg-neutral-50 p-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as CheckpointType)}
        className="rounded border border-neutral-300 px-2 py-1 text-xs"
      >
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {type === "CUSTOM" ? (
        <input
          type="date"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 text-xs"
        />
      ) : (
        <span className="text-xs text-neutral-400">План: {computedDate}</span>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded bg-ink-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-ink-700 disabled:opacity-50"
        >
          Добавить
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="text-xs text-neutral-500 hover:text-ink-600"
        >
          Отмена
        </button>
      </div>
      {error && <span className="text-xs text-red-600">⚠ {error}</span>}
    </div>
  );
}
