import Link from "next/link";
import { formatDateRu } from "@/lib/dates";
import { COPY } from "@/lib/microcopy";
import type { ProjectState } from "@/lib/projectState";
import { IconAlert, IconArrowRight, IconClock } from "@/components/icons";

type Project = {
  id: string;
  topic: string | null;
  site: string | null;
  budget: string | null;
  regions: string | null;
  priorities: string | null;
  businessGoals: string | null;
  qualifiedLeadParams: string | null;
  clientWishes: string | null;
  constraints: string | null;
  directLogin: string | null;
};

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
] as const;

type RecentAction = {
  id: string;
  date: Date;
  place: string;
  description: string;
};

export default function ProjectOverview({
  project,
  recentActions,
  totalActionsCount,
  state,
}: {
  project: Project;
  recentActions: RecentAction[];
  totalActionsCount: number;
  state: ProjectState;
}) {
  const filledInfo = INFO_FIELDS.filter(([key]) => project[key]?.trim());

  return (
    <div className="flex flex-col gap-4">
      {/* «Сейчас» — слой ориентации: что делать дальше и что горит, отдельно
          от постоянного контекста (Вводные) и истории (Последние правки). */}
      <div className="card flex flex-col gap-2.5 p-5">
        <h2 className="text-base font-semibold tracking-tight text-fg">Сейчас</h2>

        <div className="flex items-start gap-2">
          <span className="micro w-24 shrink-0 pt-0.5">Следующее</span>
          {state.nextAction ? (
            <Link
              href={`/projects/${project.id}?tab=plan`}
              className="link min-w-0 flex-1 truncate text-13"
            >
              {state.nextAction}
            </Link>
          ) : (
            <Link href={`/projects/${project.id}?tab=plan`} className="link text-13">
              Добавить шаг в план
            </Link>
          )}
        </div>

        {state.overdueCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="micro w-24 shrink-0">Внимание</span>
            <Link
              href={`/today?projectId=${project.id}`}
              className="link inline-flex items-center gap-1.5 text-13 text-danger"
            >
              <IconAlert className="h-3.5 w-3.5 shrink-0" />
              {state.overdueCount} просрочено
            </Link>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="micro w-24 shrink-0">Активность</span>
          <span className="inline-flex items-center gap-1.5 text-13 text-fg-subtle">
            <IconClock className="h-3.5 w-3.5 shrink-0" />
            {state.lastActivity ? `Последняя правка ${formatDateRu(state.lastActivity)}` : "Правок ещё не было"}
          </span>
        </div>
      </div>

      <div className="card flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight text-fg">Вводные</h2>
          <Link
            href={`/projects/${project.id}?tab=info`}
            className="link inline-flex items-center gap-1 text-13"
          >
            Открыть вводные
            <IconArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {filledInfo.length > 0 ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {filledInfo.map(([key, label]) => (
              <div key={key} className="flex flex-col gap-0.5">
                <span className="micro">{label}</span>
                <span className="text-13 text-fg">{project[key]}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-13 text-fg-subtle">
            Вводные ещё не заполнены —{" "}
            <Link href={`/projects/${project.id}?tab=info`} className="link">
              заполнить
            </Link>
            .
          </p>
        )}
      </div>

      <div className="card flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight text-fg">Последние правки</h2>
          <Link
            href={`/diary?projectId=${project.id}`}
            className="link inline-flex items-center gap-1 text-13"
          >
            Открыть полный дневник
            <IconArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentActions.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line-soft">
            {recentActions.map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-2">
                <span className="w-20 shrink-0 text-2xs tabular-nums text-fg-subtle">
                  {formatDateRu(a.date)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-13 text-fg">{a.description}</p>
                  <p className="truncate text-2xs text-fg-subtle">{a.place}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-13 text-fg-subtle">Правок по проекту пока нет.</p>
        )}
        {totalActionsCount > recentActions.length && (
          <p className="hint">Показаны последние {recentActions.length} из {totalActionsCount}.</p>
        )}
      </div>
    </div>
  );
}
