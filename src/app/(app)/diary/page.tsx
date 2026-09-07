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
import { COPY, actionWord } from "@/lib/microcopy";
import { IconSearch, IconX } from "@/components/icons";

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

      {/* Панель фильтров: одна строка, компактные поля, без вертикальных подписей */}
      <form className="card flex flex-wrap items-center gap-1.5 p-1.5">
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

        <select
          name="projectId"
          defaultValue={projectId ?? ""}
          aria-label={COPY.fields.filterProject.label}
          className="field w-auto"
        >
          <option value="">{COPY.fields.filterProject.placeholder}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div
          className="flex items-center gap-1.5 rounded-md border border-line-soft bg-subtle py-1 pr-1 pl-2.5"
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

        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-13 text-fg-muted transition-colors hover:border-line-strong has-[:checked]:border-danger-border has-[:checked]:bg-danger-soft has-[:checked]:text-danger">
          <input
            type="checkbox"
            name="overdue"
            value="1"
            defaultChecked={overdueOnly}
            className="h-3.5 w-3.5 rounded accent-ink-600"
          />
          Только просроченные
        </label>

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

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="micro">Фильтры</span>
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
        </div>
      )}

      {/* На широком экране overflow-x-clip (с auto шапка таблицы перестаёт «липнуть»),
          на узком — горизонтальная прокрутка, чтобы колонки не сминались. */}
      <div className="card overflow-x-clip max-xl:overflow-x-auto">
        <table className="tbl table-fixed min-w-[76rem]">
          <colgroup>
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "3%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Дата правки</th>
              <th>Проект</th>
              <th title={COPY.tooltips.place}>Где именно</th>
              <th>Что изменили</th>
              <th title={COPY.tooltips.justification}>Почему так решили</th>
              <th title={COPY.tooltips.reportUrl}>Отчёт</th>
              <th title={COPY.tooltips.checkpoints}>Проверки</th>
              <th>Заметка</th>
              <th aria-hidden></th>
            </tr>
          </thead>
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
        </table>
      </div>
    </div>
  );
}
