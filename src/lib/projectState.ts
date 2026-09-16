import { prisma } from "@/lib/prisma";
import { startOfToday } from "@/lib/dates";

export type ProjectState = {
  lastActivity: Date | null;
  overdueCount: number;
  nextAction: string | null;
};

// «Что с этим проектом сейчас?» — выводится из уже существующих данных
// (План/Checkpoint/Action), без отдельной сущности «статус проекта», которая
// рассинхронизировалась бы с ними вручную. Риски сюда намеренно не входят —
// frequency у ProjectRisk это текст, а не расписание, честно посчитать
// «риск просрочен» из него нельзя.
export async function getProjectStates(projectIds: string[]): Promise<Map<string, ProjectState>> {
  const states = new Map<string, ProjectState>();
  for (const id of projectIds) states.set(id, { lastActivity: null, overdueCount: 0, nextAction: null });
  if (projectIds.length === 0) return states;

  const [lastActions, nextPlanItems, overdueCheckpoints] = await Promise.all([
    prisma.action.groupBy({
      by: ["projectId"],
      where: { projectId: { in: projectIds } },
      _max: { date: true },
    }),
    prisma.projectPlanItem.findMany({
      where: { projectId: { in: projectIds }, done: false },
      orderBy: [{ projectId: "asc" }, { order: "asc" }],
      select: { projectId: true, text: true },
    }),
    prisma.checkpoint.findMany({
      where: {
        status: "PENDING",
        plannedDate: { lt: startOfToday() },
        action: { projectId: { in: projectIds } },
      },
      select: { action: { select: { projectId: true } } },
    }),
  ]);

  for (const row of lastActions) {
    const state = states.get(row.projectId);
    if (state) state.lastActivity = row._max.date;
  }

  const seenNextAction = new Set<string>();
  for (const item of nextPlanItems) {
    if (seenNextAction.has(item.projectId)) continue;
    seenNextAction.add(item.projectId);
    const state = states.get(item.projectId);
    if (state) state.nextAction = item.text;
  }

  for (const cp of overdueCheckpoints) {
    const state = states.get(cp.action.projectId);
    if (state) state.overdueCount += 1;
  }

  return states;
}
