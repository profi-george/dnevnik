import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateRu, startOfToday } from "@/lib/dates";
import { CHECKPOINT_TYPE_LABEL } from "@/lib/labels";
import { COPY, dayWord } from "@/lib/microcopy";
import CheckpointResultForm from "@/components/CheckpointResultForm";
import { IconArrowLeft, IconClock, IconExternal } from "@/components/icons";

type Props = {
  searchParams: Promise<{ projectId?: string }>;
};

export default async function TodayPage({ searchParams }: Props) {
  const { projectId } = await searchParams;

  const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });

  const checkpoints = await prisma.checkpoint.findMany({
    where: {
      status: "PENDING",
      plannedDate: { lte: startOfToday() },
      ...(projectId ? { action: { projectId } } : {}),
    },
    include: { action: { include: { project: true } } },
    orderBy: { plannedDate: "asc" },
  });

  const totalActions = await prisma.action.count();
  const empty = totalActions === 0 ? COPY.empty.todayNothing : COPY.empty.todayAllDone;
  const emptyHref = totalActions === 0 ? "/diary/bulk" : "/diary";
  const overdueCount = checkpoints.filter((cp) => new Date(cp.plannedDate) < startOfToday()).length;

  // Без фильтра по проекту список группируем по проекту — иначе при нескольких
  // активных клиентах проверки перемешиваются и не получается «дожать» всё по
  // одному, пока он в голове. Группы уже отсортированы по plannedDate внутри
  // (checkpoints пришли так из запроса), порядок групп — по самой ранней дате
  // внутри группы, то есть самый просроченный проект — первым.
  const groups: { projectId: string; projectName: string; items: typeof checkpoints }[] = [];
  if (!projectId) {
    const byProject = new Map<string, typeof checkpoints>();
    for (const cp of checkpoints) {
      const list = byProject.get(cp.action.projectId) ?? [];
      list.push(cp);
      byProject.set(cp.action.projectId, list);
    }
    for (const [pid, items] of byProject) {
      groups.push({ projectId: pid, projectName: items[0].action.project.name, items });
    }
    groups.sort((a, b) => +new Date(a.items[0].plannedDate) - +new Date(b.items[0].plannedDate));
  } else if (checkpoints.length > 0) {
    groups.push({ projectId, projectName: checkpoints[0].action.project.name, items: checkpoints });
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight text-fg">{COPY.nav.today}</h1>
          <span className="text-13 tabular-nums text-fg-subtle">
            {checkpoints.length} в работе
            {overdueCount > 0 && (
              <span className="text-danger"> · {overdueCount} просрочено</span>
            )}
          </span>
        </div>
        <Link href="/diary" className="link inline-flex items-center gap-1.5 text-13">
          <IconArrowLeft className="h-3.5 w-3.5" />
          К дневнику
        </Link>
      </div>

      {/* Фильтр по проекту — теми же пилюлями, что в «Дневнике»: один фильтр,
          одна механика на оба экрана. Выпадающий список с «Применить» здесь
          требовал двух действий там, где в соседнем разделе хватает одного. */}
      {projects.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/today"
            aria-current={!projectId ? "page" : undefined}
            className={`pill ${!projectId ? "pill-active" : ""}`}
          >
            {COPY.fields.filterProject.placeholder}
          </Link>
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/today?projectId=${p.id}`}
              aria-current={projectId === p.id ? "page" : undefined}
              className={`pill ${projectId === p.id ? "pill-active" : ""}`}
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}

      {checkpoints.length > 0 ? (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.projectId} className="flex flex-col gap-1.5">
              {groups.length > 1 && (
                <h2 className="inline-flex items-center gap-1.5 px-0.5 text-13 font-semibold text-fg">
                  {group.projectName}
                  <span className="count">{group.items.length}</span>
                </h2>
              )}
              <ul className="card divide-y divide-line-soft">
                {group.items.map((cp) => {
                  const planned = new Date(cp.plannedDate);
                  const isOverdue = planned < startOfToday();
                  const overdueDays = isOverdue
                    ? Math.round((startOfToday().getTime() - planned.getTime()) / 86400000)
                    : 0;

                  return (
                    <li key={cp.id} className="flex flex-col gap-2 p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span
                            title={isOverdue ? COPY.tooltips.overdue : COPY.tooltips.checkpoints}
                            className={`chip ${
                              isOverdue
                                ? "border-danger-border bg-danger-soft text-danger"
                                : "border-warn-border bg-warn-soft text-warn"
                            }`}
                          >
                            <span className="dot" aria-hidden />
                            {isOverdue
                              ? `Просрочено на ${overdueDays} ${dayWord(overdueDays)}`
                              : `Проверка ${CHECKPOINT_TYPE_LABEL[cp.type]}`}
                            <span className="opacity-45">·</span>
                            <span className="tabular-nums">план {formatDateRu(cp.plannedDate)}</span>
                          </span>
                          {groups.length === 1 && (
                            <span className="truncate text-13 font-semibold text-fg">
                              {cp.action.project.name}
                            </span>
                          )}
                          <span className="truncate text-13 text-fg-subtle">{cp.action.place}</span>
                        </div>
                        {cp.action.reportUrl && (
                          <a
                            href={cp.action.reportUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={COPY.tooltips.reportUrl}
                            className="link inline-flex shrink-0 items-center gap-1.5 text-13"
                          >
                            <IconExternal className="h-3.5 w-3.5" />
                            {COPY.cta.openReport}
                          </a>
                        )}
                      </div>

                      {/* Дата правки — метка над сутью, а не ещё одна строка текста:
                          иконка и размер 11px отделяют её от описания и от «почему». */}
                      <div className="flex flex-col gap-1">
                        <p className="inline-flex items-center gap-1.5 text-2xs tabular-nums text-fg-subtle">
                          <IconClock className="h-3 w-3 shrink-0" />
                          Правка внесена {formatDateRu(cp.action.date)}
                        </p>
                        <p className="text-13 text-fg">{cp.action.description}</p>
                        {cp.action.justification && (
                          <p className="hint">
                            <span className="text-fg-muted">Почему так решили:</span>{" "}
                            {cp.action.justification}
                          </p>
                        )}
                      </div>

                      <CheckpointResultForm checkpointId={cp.id} defaultResult="" />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="card px-6 py-14">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
            <p className="text-base font-medium text-fg">{empty.title}</p>
            <p className="text-13 leading-relaxed text-fg-muted">{empty.body}</p>
            <Link href={emptyHref} className="btn btn-primary mt-2">
              {empty.cta}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
