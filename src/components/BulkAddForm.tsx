"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseActionsWithAI, createActionsBulk, createProjectAndReturn } from "@/app/actions";
import { toDateInputValue } from "@/lib/dates";
import { COPY } from "@/lib/microcopy";
import type { ParsedAction } from "@/lib/gemini";
import { IconAlert, IconArrowLeft, IconPlus, IconSparkles, Spinner } from "@/components/icons";

type Project = { id: string; name: string };

const DEFAULT_PROJECT_NAME = "Gclinic";

export default function BulkAddForm({ projects: initialProjects }: { projects: Project[] }) {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "review">("input");
  const [rawText, setRawText] = useState("");
  const [projectList, setProjectList] = useState(initialProjects);
  const [projectId, setProjectId] = useState(
    initialProjects.find((p) => p.name === DEFAULT_PROJECT_NAME)?.id ?? initialProjects[0]?.id ?? "",
  );
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectError, setNewProjectError] = useState<string | null>(null);
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [noCheckpoints, setNoCheckpoints] = useState(false);
  const [customCheckDate, setCustomCheckDate] = useState("");
  const [rows, setRows] = useState<ParsedAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [parsing, setParsing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showMoreInput, setShowMoreInput] = useState(false);
  const [moreText, setMoreText] = useState("");

  function createNewProject() {
    setNewProjectError(null);
    startTransition(async () => {
      const result = await createProjectAndReturn(newProjectName);
      if (!result.ok) {
        setNewProjectError(result.error);
        return;
      }
      setProjectList((prev) => [...prev, result.project]);
      setProjectId(result.project.id);
      setNewProjectName("");
      setAddingProject(false);
    });
  }

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
      const result = await createActionsBulk(projectId, date, rows, {
        noCheckpoints,
        customCheckDate: noCheckpoints ? undefined : customCheckDate || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/diary");
    });
  }

  const errorLine = error && (
    <p className="inline-flex items-start gap-1.5 text-13 text-danger">
      <IconAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {error}
    </p>
  );

  if (step === "input") {
    return (
      <div className="card flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1 border-b border-line-soft pb-4">
          <h2 className="text-base font-semibold tracking-tight text-fg">Разобрать через ИИ</h2>
          <p className="hint">
            Вставьте кусок текста с описанием одной или нескольких правок — ИИ разложит его по полям
            и предложит сократить так же, как в вашей практике. Перед сохранением всё можно
            поправить.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-13 font-medium text-fg">Проект</span>
          <div className="flex flex-wrap gap-1.5">
            {projectList.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={parsing}
                onClick={() => setProjectId(p.id)}
                aria-pressed={projectId === p.id}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-13 font-medium transition-colors disabled:opacity-50 ${
                  projectId === p.id
                    ? "border-ink-600 bg-ink-600 text-white"
                    : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          {!addingProject ? (
            <button
              type="button"
              onClick={() => setAddingProject(true)}
              className="link inline-flex w-fit items-center gap-1 text-xs"
            >
              <IconPlus className="h-3 w-3" />
              Новый проект
            </button>
          ) : (
            <div className="panel flex flex-col gap-1.5 p-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      createNewProject();
                    }
                  }}
                  placeholder={COPY.fields.projectName.placeholder}
                  className="field flex-1"
                />
                <button type="button" onClick={createNewProject} className="btn btn-primary btn-sm">
                  Создать
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingProject(false);
                    setNewProjectError(null);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Отмена
                </button>
              </div>
              {newProjectError && (
                <p className="inline-flex items-center gap-1 text-xs text-danger">
                  <IconAlert className="h-3 w-3 shrink-0" />
                  {newProjectError}
                </p>
              )}
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-13 font-medium text-fg">{COPY.fields.date.label}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={parsing}
            className="field w-auto self-start"
          />
          <span className="hint">Общая для всех правок из этого текста</span>
        </label>

        <div className="panel flex flex-col gap-1 p-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={noCheckpoints}
              onChange={(e) => setNoCheckpoints(e.target.checked)}
              disabled={parsing}
              className="h-3.5 w-3.5 rounded accent-ink-600"
            />
            <span className="text-13 text-fg">{COPY.fields.noCheckpoints.label}</span>
          </label>
          <span className="hint pl-5.5">{COPY.fields.noCheckpoints.hint}</span>
        </div>

        {!noCheckpoints && (
          <label className="flex flex-col gap-1.5">
            <span className="text-13 font-medium text-fg">
              {COPY.fields.customCheckDate.label}{" "}
              <span className="font-normal text-fg-subtle">{COPY.fields.customCheckDate.optional}</span>
            </span>
            <input
              type="date"
              value={customCheckDate}
              onChange={(e) => setCustomCheckDate(e.target.value)}
              disabled={parsing}
              className="field w-auto self-start"
            />
            <span className="hint">{COPY.fields.customCheckDate.hint}</span>
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-13 font-medium text-fg">Текст</span>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={10}
            disabled={parsing}
            placeholder="Вставьте заметку, переписку или черновик со списком правок…"
            className="field"
          />
        </label>

        {parsing && (
          <div className="flex items-start gap-3 rounded-md border border-ink-200 bg-ink-50 px-3 py-2.5">
            <Spinner className="mt-0.5 h-4 w-4 text-ink-600" />
            <div className="flex flex-col gap-0.5">
              <span className="text-13 font-medium tabular-nums text-ink-700">
                Идёт разбор через Gemini… {elapsed} сек
              </span>
              <span className="hint">
                Страница не зависла — иногда занимает до минуты, особенно если Google перегружен. Не
                закрывайте вкладку.
              </span>
            </div>
          </div>
        )}

        {errorLine}

        <div className="flex items-center gap-3 border-t border-line-soft pt-4">
          <button
            type="button"
            onClick={parse}
            disabled={isPending || !rawText.trim() || !projectId}
            className="btn btn-primary"
          >
            {isPending ? <Spinner className="h-3.5 w-3.5" /> : <IconSparkles className="h-3.5 w-3.5" />}
            {isPending ? "Разбираю…" : "Разобрать через ИИ"}
          </button>
          <a href="/diary" className="btn btn-ghost">
            Не сохранять
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1 border-b border-line-soft pb-4">
        <h2 className="text-base font-semibold tracking-tight text-fg">
          Проверьте {rows.length} {rows.length === 1 ? "правку" : "правок"}
        </h2>
        <p className="hint">
          Проект «{projectList.find((p) => p.id === projectId)?.name}», дата — общая для всех. Можно
          поправить любое поле или убрать лишнюю строку перед сохранением.
        </p>
      </div>

      <details className="panel p-2.5">
        <summary className="micro cursor-pointer">Исходный текст — сверить с результатом</summary>
        <p className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-fg-muted">{rawText}</p>
      </details>

      <div className="flex flex-col gap-2.5">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-md border border-line p-3">
            <div className="flex items-center justify-between">
              <span className="micro tabular-nums">№ {i + 1}</span>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-xs text-fg-subtle transition-colors hover:text-danger"
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
            <label className="flex flex-col gap-1">
              <span className="micro">Заметка</span>
              <input
                value={row.note}
                onChange={(e) => updateRow(i, "note", e.target.value)}
                className="field"
              />
            </label>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={addBlankRow}
          className="link inline-flex items-center gap-1.5 text-13"
        >
          <IconPlus className="h-3.5 w-3.5" />
          Добавить строку вручную
        </button>
        <button
          type="button"
          onClick={() => setShowMoreInput((v) => !v)}
          className="link inline-flex items-center gap-1.5 text-13"
        >
          <IconSparkles className="h-3.5 w-3.5" />
          Добавить ещё через ИИ
        </button>
      </div>

      {showMoreInput && (
        <div className="panel flex flex-col gap-2 p-3">
          <textarea
            value={moreText}
            onChange={(e) => setMoreText(e.target.value)}
            rows={5}
            disabled={parsing}
            placeholder="Вставьте ещё кусок текста — новые правки добавятся к уже разобранным…"
            className="field"
          />
          {parsing ? (
            <div className="flex items-center gap-2.5 rounded-md border border-ink-200 bg-ink-50 px-3 py-2">
              <Spinner className="h-3.5 w-3.5 text-ink-600" />
              <span className="text-13 font-medium tabular-nums text-ink-700">
                Идёт разбор через Gemini… {elapsed} сек
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={parseMore}
                disabled={isPending || !moreText.trim()}
                className="btn btn-primary"
              >
                Разобрать и добавить
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMoreInput(false);
                  setMoreText("");
                }}
                className="btn btn-ghost"
              >
                Отмена
              </button>
            </div>
          )}
        </div>
      )}

      {errorLine}

      <div className="flex items-center gap-3 border-t border-line-soft pt-4">
        <button
          type="button"
          onClick={save}
          disabled={isPending || rows.length === 0}
          className="btn btn-primary"
        >
          {isPending && <Spinner className="h-3.5 w-3.5" />}
          {isPending ? "Сохраняю…" : `Сохранить всё (${rows.length})`}
        </button>
        <button type="button" onClick={() => setStep("input")} className="btn btn-ghost">
          <IconArrowLeft className="h-3.5 w-3.5" />
          Назад к тексту
        </button>
      </div>
    </div>
  );
}
