"use client";

import { useState, useTransition } from "react";
import { addCheckpoint } from "@/app/actions";
import { addDays, parseDateInput, toDateInputValue } from "@/lib/dates";
import { IconAlert, IconPlus } from "@/components/icons";

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
      // Проявляется при наведении на строку: в покое колонка проверок не зашумлена
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="link inline-flex w-fit items-center gap-1 px-1 text-2xs opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <IconPlus className="h-3 w-3" />
        Добавить проверку
      </button>
    );
  }

  return (
    <div className="panel flex flex-col gap-1.5 p-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as CheckpointType)}
        className="field field-sm"
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
          className="field field-sm"
        />
      ) : (
        <span className="text-2xs tabular-nums text-fg-subtle">План: {computedDate}</span>
      )}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="btn btn-primary btn-sm"
        >
          Добавить
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="btn btn-ghost btn-sm"
        >
          Отмена
        </button>
      </div>
      {error && (
        <span className="inline-flex items-center gap-1 text-2xs text-danger">
          <IconAlert className="h-3 w-3 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}
