import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateRu, parseDateInput, startOfToday, toDateInputValue } from "@/lib/dates";
import CheckpointItem from "@/components/CheckpointItem";
import InlineField from "@/components/InlineField";
import ReportUrlCell from "@/components/ReportUrlCell";
import ProjectCell from "@/components/ProjectCell";
import DeleteActionButton from "@/components/DeleteActionButton";
import AddCheckpointControl from "@/components/AddCheckpointControl";
import { deleteAction } from "@/app/actions";
import { COPY } from "@/lib/microcopy";

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
  const emptyState = filtered
    ? { ...COPY.empty.diaryFiltered, href: "/diary" }
    : projects.length === 0
      ? { ...COPY.empty.diaryNoProjects, href: "/projects" }
      : { ...COPY.empty.diaryNoActions, href: "/diary/add" };

  const th = "px-2 py-2 text-left text-xs font-medium text-neutral-500";
  const td = "border-t border-neutral-100 px-1 py-1 align-top";

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

  const activeFilters: { label: string; clearHref: string }[] = [];
  if (q) {
    activeFilters.push({ label: `Поиск: «${q}»`, clearHref: hrefWithout("q") });
  }
  if (projectId) {
    const name = projects.find((p) => p.id === projectId)?.name ?? projectId;
    activeFilters.push({ label: `Проект: ${name}`, clearHref: hrefWithout("projectId") });
  }
  if (from || to) {
    const rangeLabel = `${from ? formatDateRu(parseDateInput(from)) : "…"} — ${to ? formatDateRu(parseDateInput(to)) : "…"}`;
    activeFilters.push({ label: `Период: ${rangeLabel}`, clearHref: hrefWithout("from", "to") });
  }
  if (overdueOnly) {
    activeFilters.push({ label: "Только просроченные", clearHref: hrefWithout("overdue") });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-700">{COPY.nav.diary}</h1>

      <form className="flex flex-wrap items-end gap-3 rounded border border-neutral-200 bg-white p-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Поиск по месту и сути</span>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Что искали…"
            className="w-48 rounded border border-neutral-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">{COPY.fields.filterProject.label}</span>
          <select
            name="projectId"
            defaultValue={projectId ?? ""}
            className="rounded border border-neutral-300 px-2 py-1"
          >
            <option value="">{COPY.fields.filterProject.placeholder}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1" title={COPY.tooltips.periodFilter}>
          <span className="text-xs text-neutral-500">{COPY.fields.filterFrom.label}</span>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="rounded border border-neutral-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">{COPY.fields.filterTo.label}</span>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="rounded border border-neutral-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Сортировка</span>
          <select
            name="sort"
            defaultValue={sortKey}
            className="rounded border border-neutral-300 px-2 py-1"
          >
            {Object.entries(SORT_OPTIONS).map(([key, opt]) => (
              <option key={key} value={key}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 pb-1.5 text-neutral-600">
          <input
            type="checkbox"
            name="overdue"
            value="1"
            defaultChecked={overdueOnly}
            className="h-4 w-4 rounded border-neutral-300"
          />
          Только просроченные
        </label>
        <button
          type="submit"
          className="rounded border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-100"
        >
          {COPY.cta.applyFilters}
        </button>
        {filtered && (
          <Link href="/diary" className="text-xs text-neutral-500 hover:text-ink-600">
            {COPY.cta.clearFilters}
          </Link>
        )}
      </form>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-400">Активные фильтры:</span>
          {activeFilters.map((f) => (
            <Link
              key={f.label}
              href={f.clearHref}
              title="Убрать этот фильтр"
              className="inline-flex items-center gap-1 rounded-full border border-ink-500/30 bg-ink-50 px-2.5 py-1 text-xs text-ink-700 hover:brightness-95"
            >
              {f.label}
              <span aria-hidden>✕</span>
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-400">{COPY.tooltips.inlineEdit}</p>

      <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col style={{ width: "9%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "21%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "3%" }} />
          </colgroup>
          <thead>
            <tr className="bg-neutral-50">
              <th className={th}>Дата правки</th>
              <th className={th}>Проект</th>
              <th className={th} title={COPY.tooltips.place}>
                Где именно
              </th>
              <th className={th}>Что изменили</th>
              <th className={th} title={COPY.tooltips.justification}>
                Почему так решили
              </th>
              <th className={th} title={COPY.tooltips.reportUrl}>
                Отчёт
              </th>
              <th className={th} title={COPY.tooltips.checkpoints}>
                Проверки
              </th>
              <th className={th}>Заметка</th>
              <th className={th} aria-hidden></th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action) => (
              <tr key={action.id} className="hover:bg-neutral-50/60">
                <td className={`${td} whitespace-nowrap`}>
                  <InlineField
                    id={action.id}
                    field="date"
                    type="date"
                    value={toDateInputValue(action.date)}
                    displayValue={formatDateRu(action.date)}
                  />
                </td>
                <td className={td}>
                  <ProjectCell
                    id={action.id}
                    projectId={action.projectId}
                    projectName={action.project.name}
                    projects={projects}
                  />
                </td>
                <td className={td}>
                  <InlineField
                    id={action.id}
                    field="place"
                    value={action.place}
                    autocompleteProjectId={action.projectId}
                  />
                </td>
                <td className={td}>
                  <InlineField id={action.id} field="description" value={action.description} />
                </td>
                <td className={td}>
                  <InlineField
                    id={action.id}
                    field="justification"
                    value={action.justification ?? ""}
                    placeholder="—"
                  />
                </td>
                <td className={td}>
                  <ReportUrlCell id={action.id} value={action.reportUrl ?? ""} />
                </td>
                <td className={td}>
                  <div className="flex flex-col gap-1.5">
                    {action.checkpoints.length === 0 ? (
                      <span className="inline-flex items-center rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-400">
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
                <td className={td}>
                  <InlineField
                    id={action.id}
                    field="note"
                    value={action.note ?? ""}
                    placeholder="—"
                  />
                </td>
                <td className={`${td} text-center`}>
                  <form action={deleteAction}>
                    <input type="hidden" name="id" value={action.id} />
                    <DeleteActionButton />
                  </form>
                </td>
              </tr>
            ))}
            {actions.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-12">
                  <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-center">
                    <p className="text-base font-medium text-neutral-800">{emptyState.title}</p>
                    <p className="text-sm leading-relaxed text-neutral-500">{emptyState.body}</p>
                    <Link
                      href={emptyState.href}
                      className="mt-2 rounded bg-ink-600 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700"
                    >
                      {emptyState.cta}
                    </Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
