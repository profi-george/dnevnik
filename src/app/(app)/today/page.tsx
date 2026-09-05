import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateRu, startOfToday } from "@/lib/dates";
import { CHECKPOINT_TYPE_LABEL } from "@/lib/labels";
import { COPY, dayWord } from "@/lib/microcopy";
import CheckpointResultForm from "@/components/CheckpointResultForm";

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
  const emptyHref = totalActions === 0 ? "/diary/add" : "/diary";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-700">{COPY.nav.today}</h1>

      <form className="flex items-end gap-3 rounded border border-neutral-200 bg-white p-3 text-sm">
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
        <button
          type="submit"
          className="rounded border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-100"
        >
          {COPY.cta.applyFilters}
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {checkpoints.map((cp) => {
          const planned = new Date(cp.plannedDate);
          const isOverdue = planned < startOfToday();
          const overdueDays = isOverdue
            ? Math.round((startOfToday().getTime() - planned.getTime()) / 86400000)
            : 0;

          return (
            <li key={cp.id} className="rounded border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-2 text-sm">
                  <span
                    title={isOverdue ? COPY.tooltips.overdue : COPY.tooltips.checkpoints}
                    className={`rounded border px-2 py-0.5 text-xs ${
                      isOverdue
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {isOverdue
                      ? `Просрочено на ${overdueDays} ${dayWord(overdueDays)} · план ${formatDateRu(cp.plannedDate)}`
                      : `Проверка ${CHECKPOINT_TYPE_LABEL[cp.type]} · план ${formatDateRu(cp.plannedDate)}`}
                  </span>
                  <span className="font-medium text-neutral-800">{cp.action.project.name}</span>
                  <span className="text-neutral-400">· {cp.action.place}</span>
                </div>
                {cp.action.reportUrl && (
                  <a
                    href={cp.action.reportUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={COPY.tooltips.reportUrl}
                    className="text-xs text-ink-600 hover:underline"
                  >
                    {COPY.cta.openReport} →
                  </a>
                )}
              </div>

              <p className="mt-2 text-sm text-neutral-700">{cp.action.description}</p>
              {cp.action.justification && (
                <p className="mt-1 text-xs text-neutral-400">
                  Почему так решили: {cp.action.justification}
                </p>
              )}

              <div className="mt-3">
                <CheckpointResultForm checkpointId={cp.id} overdue={isOverdue} defaultResult="" />
              </div>
            </li>
          );
        })}

        {checkpoints.length === 0 && (
          <li className="rounded border border-dashed border-neutral-300 bg-white px-6 py-10">
            <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-center">
              <p className="text-base font-medium text-neutral-800">{empty.title}</p>
              <p className="text-sm leading-relaxed text-neutral-500">{empty.body}</p>
              <Link
                href={emptyHref}
                className="mt-2 rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                {empty.cta}
              </Link>
            </div>
          </li>
        )}
      </ul>

      <Link href="/diary" className="text-sm text-ink-600 hover:underline">
        {COPY.cta.backToDiary}
      </Link>
    </div>
  );
}
