import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateRu, parseDateInput, startOfToday, toDateInputValue } from "@/lib/dates";
import CheckpointItem from "@/components/CheckpointItem";
import InlineField from "@/components/InlineField";
import ReportUrlCell from "@/components/ReportUrlCell";
import ProjectCell from "@/components/ProjectCell";
import DeleteActionButton from "@/components/DeleteActionButton";
import AddCheckpointControl from "@/components/AddCheckpointControl";
import ResizableTable, { type ResizableColumn } from "@/components/ResizableTable";
import { deleteAction } from "@/app/actions";
import { COPY, actionWord } from "@/lib/microcopy";
import { IconArrowRight, IconChevronDown, IconFilter, IconSearch, IconX } from "@/components/icons";

type Props = {
  searchParams: Promise<{
    projectId?: string;
    from?: string;
    to?: string;
    q?: string;
    overdue?: string;
    sort?: string;
  }>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SORT_OPTIONS: Record<string, { label: string; orderBy: any }> = {
  date_desc: { label: "Сначала новые", orderBy: { date: "desc" } },
  date_asc: { label: "Сначала старые", orderBy: { date: "asc" } },
  project: { label: "По проекту", orderBy: [{ project: { name: "asc" } }, { date: "desc" }] },
};

export default async function DiaryPage({ searchParams }: Props) {
  const { projectId, from, to, q, overdue, sort } = await searchParams;
  const overdueOnly = overdue === "1";
  const sortKey = sort && SORT_OPTIONS[sort] ? sort : "date_desc";

  const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });

  const actionsRaw = await prisma.action.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: parseDateInput(from) } : {}),
              ...(to ? { lte: parseDateInput(to) } : {}),
            },
          }
        : {}),
      ...(overdueOnly
        ? { checkpoints: { some: { status: "PENDING", plannedDate: { lt: startOfToday() } } } }
        : {}),
    },
    include: { project: true, checkpoints: { orderBy: { plannedDate: "asc" } } },
    orderBy: SORT_OPTIONS[sortKey].orderBy,
  });

  // SQLite не умеет регистронезависимый contains через Prisma — фильтруем в памяти.
  const qLower = q?.trim().toLowerCase();
  const actions = qLower
    ? actionsRaw.filter(
        (a) => a.place.toLowerCase().includes(qLower) || a.description.toLowerCase().includes(qLower),
      )
    : actionsRaw;

  const filtered = !!(projectId || from || to || q || overdueOnly);
  const advancedFilterCount = [!!(from || to), overdueOnly, !!(sort && sort !== "date_desc")].filter(
    Boolean,
  ).length;
  const emptyState = filtered
    ? { ...COPY.empty.diaryFiltered, href: "/diary" }
    : projects.length === 0
      ? { ...COPY.empty.diaryNoProjects, href: "/projects" }
      : { ...COPY.empty.diaryNoActions, href: "/diary/bulk" };

  const baseParams: Record<string, string> = {};
  if (q) baseParams.q = q;
  if (projectId) baseParams.projectId = projectId;
  if (from) baseParams.from = from;
  if (to) baseParams.to = to;
  if (overdueOnly) baseParams.overdue = "1";
  if (sort) baseParams.sort = sort;

  function hrefWithout(...keys: string[]) {
    const params = new URLSearchParams(baseParams);
    keys.forEach((k) => params.delete(k));
    const qs = params.toString();
    return qs ? `/diary?${qs}` : "/diary";
  }

  function hrefWithProject(id: string | null) {
    const params = new URLSearchParams(baseParams);
    if (id) params.set("projectId", id);
    else params.delete("projectId");
    const qs = params.toString();
    return qs ? `/diary?${qs}` : "/diary";
  }

  const DIARY_COLUMNS: ResizableColumn[] = [
    { key: "date", label: "Дата правки", width: 100 },
    { key: "project", label: "Проект", width: 100 },
    { key: "place", label: "Где именно", title: COPY.tooltips.place, width: 150 },
    { key: "description", label: "Что изменили", width: 200 },
    { key: "justification", label: "Почему так решили", title: COPY.tooltips.justification, width: 150 },
    { key: "reportUrl", label: "Отчёт", title: COPY.tooltips.reportUrl, width: 60, minWidth: 44 },
    { key: "checkpoints", label: "Проверки", title: COPY.tooltips.checkpoints, width: 290, minWidth: 160 },
    { key: "note", label: "Заметка", width: 150 },
    { key: "delete", label: "Удалить", hiddenLabel: true, width: 40, minWidth: 40 },
  ];

  const activeFilters: { label: string; clearHref: string }[] = [];
  if (q) {
    activeFilters.push({ label: `Поиск: «${q}»`, clearHref: hrefWithout("q") });
  }
  // Проект намеренно не дублируется чипом: он уже подсвечен залитой пилюлей выше,
  // и снимается соседней «Все проекты». Два индикатора одного фильтра — шум.
  if (from || to) {
    const rangeLabel = `${from ? formatDateRu(parseDateInput(from)) : "…"} — ${to ? formatDateRu(parseDateInput(to)) : "…"}`;
    activeFilters.push({ label: `Период: ${rangeLabel}`, clearHref: hrefWithout("from", "to") });
  }
  if (overdueOnly) {
    activeFilters.push({ label: "Только просроченные", clearHref: hrefWithout("overdue") });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Заголовок, счётчик и подсказка — одна строка, вертикаль экономим для таблицы */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight text-fg">{COPY.nav.diary}</h1>
          <span className="text-13 tabular-nums text-fg-subtle">
            {actions.length} {actionWord(actions.length)}
          </span>
        </div>
        <p className="hint">{COPY.tooltips.inlineEdit}</p>
      </div>

      {/* Проекты — карточками, не выпадающим списком: клик сразу фильтрует, без Применить.
          aria-current, а не aria-pressed: это ссылки, а не переключатели. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href={hrefWithProject(null)}
          aria-current={!projectId ? "page" : undefined}
          className={`pill ${!projectId ? "pill-active" : ""}`}
        >
          Все проекты
        </Link>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={hrefWithProject(p.id)}
            aria-current={projectId === p.id ? "page" : undefined}
            className={`pill ${projectId === p.id ? "pill-active" : ""}`}
          >
            {p.name}
          </Link>
        ))}
      </div>

      {/* Панель фильтров: поиск всегда на виду, остальное — за раскрывашкой «Фильтры» */}
      <form className="card flex flex-wrap items-start gap-1.5 p-1.5">
        <input type="hidden" name="projectId" value={projectId ?? ""} />

        <div className="relative">
          <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            aria-label="Поиск по месту и сути"
            placeholder="Поиск по месту и сути…"
            className="field w-56 pl-8"
          />
        </div>

        {/* Раскрывашка: у summary есть и воронка, и шеврон, который поворачивается —
            без них кнопка читалась как обычная, и было не понять, что под ней ещё есть слой */}
        <details open={!!(from || to || overdueOnly || (sort && sort !== "date_desc"))}>
          {/* Утилиты перебивают .btn-secondary (слой utilities выше components),
              поэтому hover для состояния «есть активные фильтры» задан явно */}
          <summary
            className={`btn btn-secondary cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden ${
              advancedFilterCount > 0
                ? "border-ink-200 bg-ink-50 text-ink-700 hover:bg-ink-100"
                : ""
            }`}
          >
            <IconFilter className="h-3.5 w-3.5 shrink-0" />
            Фильтры
            {advancedFilterCount > 0 && <span className="count">{advancedFilterCount}</span>}
            <IconChevronDown className="disclosure-chevron h-3.5 w-3.5 shrink-0 opacity-60" />
          </summary>
          {/* Раскрытые фильтры — в собственной подложке: видно, что это содержимое
              раскрывашки, а не третий ряд свободно лежащих контролов */}
          <div className="panel mt-1.5 flex flex-wrap items-center gap-1.5 p-1.5">
            <div
              className="flex items-center gap-1.5 rounded-md border border-line bg-surface py-1 pr-1 pl-2.5"
              title={COPY.tooltips.periodFilter}
            >
              <span className="micro">Период</span>
              <input
                type="date"
                name="from"
                defaultValue={from ?? ""}
                aria-label={COPY.fields.filterFrom.label}
                className="field field-sm w-auto"
              />
              <span className="text-fg-subtle">—</span>
              <input
                type="date"
                name="to"
                defaultValue={to ?? ""}
                aria-label={COPY.fields.filterTo.label}
                className="field field-sm w-auto"
              />
            </div>

            <select name="sort" defaultValue={sortKey} aria-label="Сортировка" className="field w-auto">
              {Object.entries(SORT_OPTIONS).map(([key, opt]) => (
                <option key={key} value={key}>
                  {opt.label}
                </option>
              ))}
            </select>

            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-13 text-fg-muted transition-colors hover:border-line-strong has-[:checked]:border-danger-border has-[:checked]:bg-danger-soft has-[:checked]:text-danger">
              <input
                type="checkbox"
                name="overdue"
                value="1"
                defaultChecked={overdueOnly}
                className="h-3.5 w-3.5 rounded accent-ink-600"
              />
              Только просроченные
            </label>
          </div>
        </details>

        <div className="ml-auto flex items-center gap-1.5">
          {filtered && (
            <Link href="/diary" className="btn btn-ghost">
              {COPY.cta.clearFilters}
            </Link>
          )}
          <button type="submit" className="btn btn-secondary">
            {COPY.cta.applyFilters}
          </button>
        </div>
      </form>

      {(activeFilters.length > 0 || projectId) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.length > 0 && <span className="micro">Применено</span>}
          {activeFilters.map((f) => (
            <Link
              key={f.label}
              href={f.clearHref}
              title="Убрать этот фильтр"
              className="chip border-ink-200 bg-ink-50 text-ink-700"
            >
              {f.label}
              <IconX className="h-3 w-3 opacity-60" />
            </Link>
          ))}
          {projectId && (
            <Link
              href={`/projects/${projectId}`}
              className="link inline-flex items-center gap-1 text-13"
            >
              Кабинет проекта
              <IconArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}

      {/* На широком экране overflow-x-clip (с auto шапка таблицы перестаёт «липнуть»),
          на узком — горизонтальная прокрутка, чтобы колонки не сминались. */}
      <div className="card overflow-x-clip max-xl:overflow-x-auto">
        <ResizableTable storageKey="diary-table-col-widths" columns={DIARY_COLUMNS}>
          <tbody>
            {actions.map((action) => (
              <tr key={action.id} className="group">
                <td className="whitespace-nowrap">
                  <InlineField
                    id={action.id}
                    field="date"
                    type="date"
                    value={toDateInputValue(action.date)}
                    displayValue={formatDateRu(action.date)}
                  />
                </td>
                <td>
                  <ProjectCell
                    id={action.id}
                    projectId={action.projectId}
                    projectName={action.project.name}
                    projects={projects}
                  />
                </td>
                <td>
                  <InlineField
                    id={action.id}
                    field="place"
                    value={action.place}
                    autocompleteProjectId={action.projectId}
                  />
                </td>
                <td>
                  <InlineField id={action.id} field="description" value={action.description} />
                </td>
                <td>
                  <InlineField
                    id={action.id}
                    field="justification"
                    value={action.justification ?? ""}
                    placeholder="—"
                    tone="muted"
                    truncate
                  />
                </td>
                <td>
                  <ReportUrlCell id={action.id} value={action.reportUrl ?? ""} />
                </td>
                <td>
                  <div className="flex flex-col gap-1">
                    {action.checkpoints.length === 0 ? (
                      <span className="chip border-dashed text-fg-subtle">
                        {COPY.empty.noCheckpoints}
                      </span>
                    ) : (
                      action.checkpoints.map((cp) => (
                        <CheckpointItem
                          key={cp.id}
                          id={cp.id}
                          type={cp.type}
                          status={cp.status}
                          overdue={
                            cp.status === "PENDING" && new Date(cp.plannedDate) < startOfToday()
                          }
                          plannedDateLabel={formatDateRu(cp.plannedDate)}
                          plannedDateValue={toDateInputValue(cp.plannedDate)}
                          result={cp.result}
                        />
                      ))
                    )}
                    <AddCheckpointControl
                      actionId={action.id}
                      actionDateValue={toDateInputValue(action.date)}
                    />
                  </div>
                </td>
                <td>
                  <InlineField
                    id={action.id}
                    field="note"
                    value={action.note ?? ""}
                    placeholder="—"
                    tone="muted"
                  />
                </td>
                <td className="text-center">
                  <form action={deleteAction}>
                    <input type="hidden" name="id" value={action.id} />
                    <DeleteActionButton />
                  </form>
                </td>
              </tr>
            ))}
            {actions.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-14">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
                    <p className="text-base font-medium text-fg">{emptyState.title}</p>
                    <p className="text-13 leading-relaxed text-fg-muted">{emptyState.body}</p>
                    <Link href={emptyState.href} className="btn btn-primary mt-2">
                      {emptyState.cta}
                    </Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </ResizableTable>
      </div>
    </div>
  );
}
