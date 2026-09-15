"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseProjectInfoWithAI, applyParsedProjectInfo } from "@/app/actions";
import { COPY } from "@/lib/microcopy";
import type { ParsedProjectInfo } from "@/lib/gemini";
import { IconAlert, IconCheck, IconSparkles, IconTrash, IconX, Spinner } from "@/components/icons";

const INFO_FIELDS = [
  ["topic", COPY.projectInfo.topic.label],
  ["site", COPY.projectInfo.site.label],
  ["budget", COPY.projectInfo.budget.label],
  ["regions", COPY.projectInfo.regions.label],
  ["priorities", COPY.projectInfo.priorities.label],
  ["businessGoals", COPY.projectInfo.businessGoals.label],
  ["qualifiedLeadParams", COPY.projectInfo.qualifiedLeadParams.label],
  ["clientWishes", COPY.projectInfo.clientWishes.label],
  ["constraints", COPY.projectInfo.constraints.label],
  ["directLogin", COPY.projectInfo.directLogin.label],
  ["history", COPY.projectInfo.history.label],
  ["problems", COPY.projectInfo.problems.label],
  ["questions", COPY.projectInfo.questions.label],
] as const;

type InfoKey = (typeof INFO_FIELDS)[number][0];

/**
 * Один раздел предпросмотра. Раньше разделы отличались только волосяной чертой
 * сверху, и длинная простыня читалась как один сплошной список. Подложка .panel
 * даёт каждому разделу видимые границы, счётчик — сразу понятный объём.
 */
function ReviewSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="panel flex flex-col gap-1.5 p-3">
      <h3 className="micro inline-flex items-center gap-1.5">
        {title}
        <span className="count">{count}</span>
      </h3>
      {children}
    </section>
  );
}

/** Строка предпросмотра: текст с многоточием + тихая корзина справа. */
function ReviewRow({
  text,
  removeLabel,
  onRemove,
}: {
  text: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-2 py-1.5">
      {/* title нужен обязательно: строка обрезается, а поправить её здесь нельзя */}
      <span title={text} className="min-w-0 flex-1 truncate text-13 text-fg">
        {text}
      </span>
      <button
        type="button"
        onClick={onRemove}
        title={removeLabel}
        aria-label={removeLabel}
        className="btn-icon btn-icon-danger shrink-0"
      >
        <IconTrash className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

export default function ProjectAIFill({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"input" | "review">("input");
  const [rawText, setRawText] = useState("");
  const [data, setData] = useState<ParsedProjectInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!parsing) {
      setElapsed(0);
      return;
    }
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [parsing]);

  function close() {
    setOpen(false);
    setStep("input");
    setRawText("");
    setData(null);
    setError(null);
  }

  function parse() {
    setError(null);
    setParsing(true);
    startTransition(async () => {
      const result = await parseProjectInfoWithAI(rawText);
      setParsing(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setData(result.data);
      setStep("review");
    });
  }

  function setInfoField(key: InfoKey, value: string) {
    setData((prev) => (prev ? { ...prev, info: { ...prev.info, [key]: value } } : prev));
  }

  function removeLink(i: number) {
    setData((prev) => (prev ? { ...prev, links: prev.links.filter((_, idx) => idx !== i) } : prev));
  }
  function removeGoal(i: number) {
    setData((prev) => (prev ? { ...prev, goals: prev.goals.filter((_, idx) => idx !== i) } : prev));
  }
  function removeRisk(i: number) {
    setData((prev) => (prev ? { ...prev, risks: prev.risks.filter((_, idx) => idx !== i) } : prev));
  }
  function removePassword(i: number) {
    setData((prev) => (prev ? { ...prev, passwords: prev.passwords.filter((_, idx) => idx !== i) } : prev));
  }

  function apply() {
    if (!data) return;
    setError(null);
    startTransition(async () => {
      const result = await applyParsedProjectInfo(projectId, data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      close();
      router.refresh();
    });
  }

  const filledInfo = INFO_FIELDS.filter(([key]) => data?.info?.[key]?.trim());

  const errorLine = error && (
    <p className="inline-flex items-start gap-1.5 text-13 text-danger">
      <IconAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {error}
    </p>
  );

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary shrink-0">
        <IconSparkles className="h-3.5 w-3.5" />
        {COPY.cta.fillWithAI}
      </button>
    );
  }

  return (
    <div className="card flex w-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-2 border-b border-line-soft pb-4">
        <div className="flex flex-col gap-1">
          <h2 className="inline-flex items-center gap-1.5 text-base font-semibold tracking-tight text-fg">
            <IconSparkles className="h-4 w-4 text-ink-600" />
            {COPY.cta.fillWithAI}
          </h2>
          {/* Инструкция про «вставьте текст» на шаге предпросмотра уже не помогает,
              а место занимает — показываем её только там, где она нужна */}
          {step === "input" ? (
            <p className="hint">
              Вставьте один кусок текста с любой информацией о проекте — бриф, переписку, заметки. ИИ
              сам разложит её по вводным, ссылкам, целям, рискам и паролям. Перед сохранением всё
              можно поправить.
            </p>
          ) : (
            <p className="hint">Проверьте, что разобралось. Лишнее — удалите, неточное — поправьте.</p>
          )}
        </div>
        <button type="button" onClick={close} title="Закрыть" aria-label="Закрыть" className="btn-icon shrink-0">
          <IconX className="h-3.5 w-3.5" />
        </button>
      </div>

      {step === "input" && (
        <>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={10}
            disabled={parsing}
            placeholder="Тематика, бюджет, регионы, цели, ссылки на отчёты, риски для проверки, логины…"
            className="field"
          />

          {parsing && (
            <div className="flex items-start gap-3 rounded-md border border-ink-200 bg-ink-50 px-3 py-2.5">
              <Spinner className="mt-0.5 h-4 w-4 text-ink-600" />
              <div className="flex flex-col gap-0.5">
                <span className="text-13 font-medium tabular-nums text-ink-700">
                  Идёт разбор через Gemini… {elapsed} сек
                </span>
                <span className="hint">Иногда занимает до минуты — страница не зависла.</span>
              </div>
            </div>
          )}

          {errorLine}

          <div className="flex items-center gap-3 border-t border-line-soft pt-4">
            <button
              type="button"
              onClick={parse}
              disabled={isPending || !rawText.trim()}
              className="btn btn-primary"
            >
              {isPending ? <Spinner className="h-3.5 w-3.5" /> : <IconSparkles className="h-3.5 w-3.5" />}
              {isPending ? "Разбираю…" : "Разобрать через ИИ"}
            </button>
            <button type="button" onClick={close} className="btn btn-ghost">
              {COPY.cta.dontSave}
            </button>
          </div>
        </>
      )}

      {step === "review" && data && (
        <>
          <ReviewSection title="Вводные и разделы" count={filledInfo.length}>
            {filledInfo.length > 0 ? (
              // Две колонки на широком экране: тринадцать полей в один столбец
              // давали экран прокрутки ещё до списков ссылок и целей
              <div className="grid gap-2.5 sm:grid-cols-2">
                {filledInfo.map(([key, label]) => (
                  <label key={key} className="flex min-w-0 flex-col gap-1">
                    <span className="micro">{label}</span>
                    <input
                      type="text"
                      value={data.info?.[key] ?? ""}
                      onChange={(e) => setInfoField(key, e.target.value)}
                      className="field"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-13 text-fg-subtle">Ничего не найдено в тексте.</p>
            )}
          </ReviewSection>

          {data.links.length > 0 && (
            <ReviewSection title="Важные ссылки" count={data.links.length}>
              <ul className="flex flex-col divide-y divide-line-soft">
                {data.links.map((l, i) => (
                  <ReviewRow
                    key={i}
                    text={`${l.label} — ${l.url}`}
                    removeLabel={`Убрать ссылку «${l.label}»`}
                    onRemove={() => removeLink(i)}
                  />
                ))}
              </ul>
            </ReviewSection>
          )}

          {data.goals.length > 0 && (
            <ReviewSection title="Карта целей" count={data.goals.length}>
              <ul className="flex flex-col divide-y divide-line-soft">
                {data.goals.map((g, i) => (
                  <ReviewRow
                    key={i}
                    text={`${g.goalId} · ${g.name} · ${g.level === "MICRO" ? "Микро" : "Макро"}`}
                    removeLabel={`Убрать цель «${g.name}»`}
                    onRemove={() => removeGoal(i)}
                  />
                ))}
              </ul>
            </ReviewSection>
          )}

          {data.risks.length > 0 && (
            <ReviewSection title="Риски" count={data.risks.length}>
              <ul className="flex flex-col divide-y divide-line-soft">
                {data.risks.map((r, i) => (
                  <ReviewRow
                    key={i}
                    text={`${r.risk}${r.frequency ? ` — ${r.frequency}` : ""}`}
                    removeLabel={`Убрать риск «${r.risk}»`}
                    onRemove={() => removeRisk(i)}
                  />
                ))}
              </ul>
            </ReviewSection>
          )}

          {data.passwords.length > 0 && (
            <ReviewSection title="Пароли" count={data.passwords.length}>
              <ul className="flex flex-col divide-y divide-line-soft">
                {data.passwords.map((p, i) => (
                  <ReviewRow
                    key={i}
                    text={p.label}
                    removeLabel={`Убрать пароль «${p.label}»`}
                    onRemove={() => removePassword(i)}
                  />
                ))}
              </ul>
            </ReviewSection>
          )}

          {errorLine}

          {/* Панель действий липнет к низу экрана: предпросмотр бывает длиннее
              вьюпорта, и «Применить» не должно уезжать за нижний край */}
          <div className="sticky bottom-0 z-10 -mx-5 -mb-5 flex items-center gap-3 rounded-b-lg border-t border-line bg-surface px-5 py-3">
            <button type="button" onClick={apply} disabled={isPending} className="btn btn-primary">
              {isPending ? <Spinner className="h-3.5 w-3.5" /> : <IconCheck className="h-3.5 w-3.5" />}
              {isPending ? "Применяю…" : COPY.cta.applyAIFill}
            </button>
            <button type="button" onClick={() => setStep("input")} className="btn btn-ghost">
              Назад к тексту
            </button>
          </div>
        </>
      )}
    </div>
  );
}
