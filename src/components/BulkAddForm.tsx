"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseActionsWithAI, createActionsBulk } from "@/app/actions";
import { toDateInputValue } from "@/lib/dates";
import type { ParsedAction } from "@/lib/gemini";

type Project = { id: string; name: string };

const DEFAULT_PROJECT_NAME = "Gclinic";

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function BulkAddForm({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "review">("input");
  const [rawText, setRawText] = useState("");
  const [projectId, setProjectId] = useState(
    projects.find((p) => p.name === DEFAULT_PROJECT_NAME)?.id ?? projects[0]?.id ?? "",
  );
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [rows, setRows] = useState<ParsedAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [parsing, setParsing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showMoreInput, setShowMoreInput] = useState(false);
  const [moreText, setMoreText] = useState("");

  useEffect(() => {
    if (!parsing) {
      setElapsed(0);
      return;
    }
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [parsing]);

  function parse() {
    setError(null);
    setParsing(true);
    startTransition(async () => {
      const result = await parseActionsWithAI(rawText);
      setParsing(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows(result.actions);
      setStep("review");
    });
  }

  function updateRow(index: number, field: keyof ParsedAction, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addBlankRow() {
    setRows((prev) => [...prev, { place: "", description: "", justification: "", note: "" }]);
  }

  function parseMore() {
    setError(null);
    setParsing(true);
    startTransition(async () => {
      const result = await parseActionsWithAI(moreText);
      setParsing(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((prev) => [...prev, ...result.actions]);
      setRawText((prev) => `${prev}\n\n---\n\n${moreText}`);
      setMoreText("");
      setShowMoreInput(false);
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await createActionsBulk(projectId, date, rows);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/diary");
    });
  }

  const input = "rounded border border-neutral-300 px-3 py-2 text-sm";

  if (step === "input") {
    return (
      <div className="flex flex-col gap-4 rounded border border-neutral-200 bg-white p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-neutral-900">Разобрать через ИИ</h2>
          <p className="text-xs text-neutral-400">
            Вставьте кусок текста с описанием одной или нескольких правок — ИИ разложит его по
            полям и предложит сократить так же, как в вашей практике. Перед сохранением всё
            можно поправить.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-700">Проект</span>
          <div className="flex flex-wrap gap-2">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={parsing}
                onClick={() => setProjectId(p.id)}
                aria-pressed={projectId === p.id}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  projectId === p.id
                    ? "border-ink-600 bg-ink-600 text-white"
                    : "border-neutral-300 bg-white text-neutral-700 hover:border-ink-500 hover:text-ink-600"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-700">Дата действия</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={parsing}
            className={`${input} disabled:bg-neutral-100`}
          />
          <span className="text-xs text-neutral-400">Общая для всех правок из этого текста</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-700">Текст</span>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={10}
            disabled={parsing}
            placeholder="Вставьте заметку, переписку или черновик со списком правок…"
            className={`${input} disabled:bg-neutral-100`}
          />
        </label>

        {parsing && (
          <div className="flex items-center gap-3 rounded border border-ink-500/30 bg-ink-50 px-3 py-2.5">
            <Spinner />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-ink-700">
                Идёт разбор через Gemini… {elapsed} сек
              </span>
              <span className="text-xs text-neutral-500">
                Страница не зависла — иногда занимает до минуты, особенно если Google
                перегружен. Не закрывайте вкладку.
              </span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">⚠ {error}</p>}

        <div className="flex items-center gap-4 border-t border-neutral-100 pt-4">
          <button
            type="button"
            onClick={parse}
            disabled={isPending || !rawText.trim() || !projectId}
            className="flex items-center gap-2 rounded bg-ink-600 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700 disabled:opacity-50"
          >
            {isPending && <Spinner />}
            {isPending ? "Разбираю…" : "Разобрать через ИИ"}
          </button>
          <a href="/diary" className="text-sm text-neutral-500 hover:text-ink-600">
            Не сохранять
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-neutral-900">
          Проверьте {rows.length} {rows.length === 1 ? "правку" : "правок"}
        </h2>
        <p className="text-xs text-neutral-400">
          Проект «{projects.find((p) => p.id === projectId)?.name}», дата — общая для всех. Можно
          поправить любое поле или убрать лишнюю строку перед сохранением.
        </p>
      </div>

      <details className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-neutral-500">
          Исходный текст — сверить с результатом
        </summary>
        <p className="mt-2 whitespace-pre-wrap text-xs text-neutral-600">{rawText}</p>
      </details>

      <div className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-col gap-2 rounded border border-neutral-200 p-3">
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
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-500">Где именно</span>
              <input
                value={row.place}
                onChange={(e) => updateRow(i, "place", e.target.value)}
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-500">Что изменили</span>
              <input
                value={row.description}
                onChange={(e) => updateRow(i, "description", e.target.value)}
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-500">Почему так решили</span>
              <input
                value={row.justification}
                onChange={(e) => updateRow(i, "justification", e.target.value)}
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-500">Заметка</span>
              <input
                value={row.note}
                onChange={(e) => updateRow(i, "note", e.target.value)}
                className={input}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={addBlankRow}
          className="text-sm text-ink-600 hover:underline"
        >
          + Добавить строку вручную
        </button>
        <button
          type="button"
          onClick={() => setShowMoreInput((v) => !v)}
          className="text-sm text-ink-600 hover:underline"
        >
          + Добавить ещё через ИИ
        </button>
      </div>

      {showMoreInput && (
        <div className="flex flex-col gap-2 rounded border border-neutral-200 bg-neutral-50 p-3">
          <textarea
            value={moreText}
            onChange={(e) => setMoreText(e.target.value)}
            rows={5}
            disabled={parsing}
            placeholder="Вставьте ещё кусок текста — новые правки добавятся к уже разобранным…"
            className={`${input} disabled:bg-neutral-100`}
          />
          {parsing ? (
            <div className="flex items-center gap-3 rounded border border-ink-500/30 bg-ink-50 px-3 py-2.5">
              <Spinner />
              <span className="text-sm font-medium text-ink-700">
                Идёт разбор через Gemini… {elapsed} сек
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={parseMore}
                disabled={isPending || !moreText.trim()}
                className="flex items-center gap-2 rounded bg-ink-600 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700 disabled:opacity-50"
              >
                Разобрать и добавить
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMoreInput(false);
                  setMoreText("");
                }}
                className="text-sm text-neutral-500 hover:text-ink-600"
              >
                Отмена
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">⚠ {error}</p>}

      <div className="flex items-center gap-4 border-t border-neutral-100 pt-4">
        <button
          type="button"
          onClick={save}
          disabled={isPending || rows.length === 0}
          className="rounded bg-ink-600 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700 disabled:opacity-50"
        >
          {isPending ? "Сохраняю…" : `Сохранить всё (${rows.length})`}
        </button>
        <button
          type="button"
          onClick={() => setStep("input")}
          className="text-sm text-neutral-500 hover:text-ink-600"
        >
          ← Назад к тексту
        </button>
      </div>
    </div>
  );
}
