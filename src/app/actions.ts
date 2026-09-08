"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addDays, parseDateInput, startOfToday } from "@/lib/dates";
import { COPY } from "@/lib/microcopy";
import { parseActionsFromText, parseFollowUpActionsFromResult, type ParsedAction } from "@/lib/gemini";

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.project.create({ data: { name } });
  revalidatePath("/projects");
}

// Быстрое создание проекта прямо из формы добавления действия — без ухода со страницы.
export async function createProjectAndReturn(
  name: string,
): Promise<{ ok: true; project: { id: string; name: string } } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Название проекта обязательно." };
  const project = await prisma.project.create({ data: { name: trimmed } });
  revalidatePath("/projects");
  revalidatePath("/diary");
  revalidatePath("/diary/add");
  return { ok: true, project: { id: project.id, name: project.name } };
}

export async function renameProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  await prisma.project.update({ where: { id }, data: { name } });
  revalidatePath("/projects");
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.project.delete({ where: { id } });
  revalidatePath("/projects");
  revalidatePath("/diary");
  revalidatePath("/today");
}

export async function getPlacesForProject(projectId: string): Promise<string[]> {
  if (!projectId) return [];
  const actions = await prisma.action.findMany({
    where: { projectId },
    select: { place: true },
    distinct: ["place"],
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return actions.map((a) => a.place);
}

export async function createAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const dateValue = String(formData.get("date") ?? "");
  const place = String(formData.get("place") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const justification = String(formData.get("justification") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const reportUrl = String(formData.get("reportUrl") ?? "").trim();
  const customDateValue = String(formData.get("customCheckDate") ?? "").trim();
  const noCheckpoints = formData.get("noCheckpoints") === "1";

  if (!projectId || !dateValue || !place || !description) {
    return;
  }

  const date = parseDateInput(dateValue);

  await prisma.action.create({
    data: {
      projectId,
      date,
      place,
      description,
      justification: justification || null,
      note: note || null,
      reportUrl: reportUrl || null,
      checkpoints: noCheckpoints
        ? undefined
        : {
            create: [
              { type: "DAY", plannedDate: addDays(date, 1) },
              { type: "WEEK", plannedDate: addDays(date, 7) },
              { type: "MONTH", plannedDate: addDays(date, 30) },
              ...(customDateValue
                ? [{ type: "CUSTOM" as const, plannedDate: parseDateInput(customDateValue) }]
                : []),
            ],
          },
    },
  });

  revalidatePath("/diary");
  revalidatePath("/today");
  redirect("/diary");
}

const CHECKPOINT_OFFSET_DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30 };

const EDITABLE_ACTION_FIELDS = [
  "date",
  "projectId",
  "place",
  "description",
  "justification",
  "note",
  "reportUrl",
] as const;
type EditableActionField = (typeof EDITABLE_ACTION_FIELDS)[number];
const REQUIRED_FIELDS = new Set<EditableActionField>(["date", "projectId", "place", "description"]);

const FIELD_MISSING_ERROR: Partial<Record<EditableActionField, string>> = {
  projectId: COPY.errors.projectMissing,
  place: "Укажите место действия — кампанию, группу или ссылку.",
  description: COPY.errors.descriptionMissing,
  date: "Дата действия обязательна.",
};

type UpdateActionFieldResult = { ok: true; datesShifted?: boolean } | { ok: false; error: string };

// Инлайн-редактирование ячейки в таблице «Дневник» — сохраняет одно поле без перехода на
// отдельную страницу, как правка ячейки в экселе.
export async function updateActionField(
  id: string,
  field: EditableActionField,
  value: string,
): Promise<UpdateActionFieldResult> {
  if (!id || !EDITABLE_ACTION_FIELDS.includes(field)) {
    return { ok: false, error: COPY.errors.cellSaveFailed };
  }

  const trimmed = value.trim();
  if (REQUIRED_FIELDS.has(field) && !trimmed) {
    return { ok: false, error: FIELD_MISSING_ERROR[field] ?? COPY.errors.cellSaveFailed };
  }

  let datesShifted = false;

  if (field === "date") {
    const existing = await prisma.action.findUnique({
      where: { id },
      include: { checkpoints: true },
    });
    if (!existing) return { ok: false, error: COPY.errors.cellSaveFailed };

    const date = parseDateInput(trimmed);
    await prisma.action.update({ where: { id }, data: { date } });

    // Дата действия сдвинулась — переносим ещё не снятые точки вместе с ней (кроме своей
    // даты — она задана вручную и не привязана к дате действия); снятые не трогаем.
    if (existing.date.getTime() !== date.getTime()) {
      const pending = existing.checkpoints.filter(
        (cp) => cp.status === "PENDING" && cp.type !== "CUSTOM",
      );
      datesShifted = pending.length > 0;
      await Promise.all(
        pending.map((cp) =>
          prisma.checkpoint.update({
            where: { id: cp.id },
            data: { plannedDate: addDays(date, CHECKPOINT_OFFSET_DAYS[cp.type]) },
          }),
        ),
      );
    }
  } else {
    await prisma.action.update({
      where: { id },
      data: { [field]: REQUIRED_FIELDS.has(field) ? trimmed : trimmed || null },
    });
  }

  revalidatePath("/diary");
  revalidatePath("/today");
  return { ok: true, datesShifted };
}

// Вручную сдвинуть дату конкретной контрольной точки — например, если сутки/неделя/месяц
// не подходят и проверить нужно в другой день.
export async function updateCheckpointDate(
  id: string,
  dateValue: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id || !dateValue) {
    return { ok: false, error: "Дата обязательна." };
  }
  await prisma.checkpoint.update({
    where: { id },
    data: { plannedDate: parseDateInput(dateValue) },
  });
  revalidatePath("/diary");
  revalidatePath("/today");
  return { ok: true };
}

const CHECKPOINT_TYPES = ["DAY", "WEEK", "MONTH", "CUSTOM"] as const;
type CheckpointTypeValue = (typeof CHECKPOINT_TYPES)[number];

// Добавить новую контрольную точку к уже существующему действию — например, вернуть
// удалённую по ошибке или добавить дополнительную проверку.
export async function addCheckpoint(
  actionId: string,
  type: CheckpointTypeValue,
  dateValue: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!actionId || !CHECKPOINT_TYPES.includes(type)) {
    return { ok: false, error: "Некорректные данные проверки." };
  }
  if (!dateValue) return { ok: false, error: "Дата обязательна." };

  await prisma.checkpoint.create({
    data: { actionId, type, plannedDate: parseDateInput(dateValue), status: "PENDING" },
  });
  revalidatePath("/diary");
  revalidatePath("/today");
  return { ok: true };
}

// Убрать одну конкретную контрольную точку (например, если из трёх нужны не все) —
// не трогая остальные проверки и само действие.
export async function deleteCheckpoint(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "Не передан id проверки." };
  await prisma.checkpoint.delete({ where: { id } });
  revalidatePath("/diary");
  revalidatePath("/today");
  return { ok: true };
}

// Полностью убрать действие из дневника вместе с его контрольными точками (каскадом).
export async function deleteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.action.delete({ where: { id } });
  revalidatePath("/diary");
  revalidatePath("/today");
}

export async function submitCheckpointResult(
  id: string,
  result: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = result.trim();
  if (!id || !trimmed) {
    return { ok: false, error: "Впишите результат перед сохранением." };
  }

  await prisma.checkpoint.update({
    where: { id },
    data: { result: trimmed, status: "DONE" },
  });

  // Нарочно без revalidatePath здесь: ЛЮБОЙ revalidatePath в этом экшене заставляет
  // Next.js тут же перерендерить текущий маршрут — а на /today показаны только
  // PENDING-проверки, и такой рендер мгновенно убрал бы строку из списка, не дав
  // шанса на подсказку «Разобрать через ИИ». Чипы статуса на /diary обновляются
  // локально в CheckpointItem (см. onSaved), без похода на сервер. Обе страницы и
  // так свежие при обычном переходе (force-dynamic layout); действия, созданные
  // через разбор результата, сами обновят обе страницы при сохранении.
  return { ok: true };
}

// Разбор текста результата проверки на новые действия — если снятие само стало поводом
// для новой правки в кампании, её тоже нужно занести в дневник отдельной строкой.
export async function parseCheckpointFollowUp(
  checkpointId: string,
  resultText: string,
): Promise<{ ok: true; actions: ParsedAction[] } | { ok: false; error: string }> {
  if (!checkpointId) return { ok: false, error: "Не передан id проверки." };
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    include: { action: true },
  });
  if (!checkpoint) return { ok: false, error: "Проверка не найдена." };
  return parseFollowUpActionsFromResult(resultText, checkpoint.action.place);
}

export async function createCheckpointFollowUpActions(
  checkpointId: string,
  actions: ParsedAction[],
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!checkpointId) return { ok: false, error: "Не передан id проверки." };
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    include: { action: true },
  });
  if (!checkpoint) return { ok: false, error: "Проверка не найдена." };

  const count = await createActionRows(checkpoint.action.projectId, startOfToday(), actions);
  if (count === 0) {
    return { ok: false, error: "Нет ни одной заполненной правки для сохранения." };
  }

  revalidatePath("/diary");
  revalidatePath("/today");
  return { ok: true, count };
}

// Разбор одного куска текста на несколько правок через Gemini — для формы массовой записи.
export async function parseActionsWithAI(
  rawText: string,
): Promise<{ ok: true; actions: ParsedAction[] } | { ok: false; error: string }> {
  return parseActionsFromText(rawText);
}

// Общее создание строк действия с проверками — используется и при массовой записи
// через ИИ, и при разборе результата проверки на новые действия. По умолчанию — полный
// набор (сутки/неделя/месяц); noCheckpoints и customCheckDate дают тот же контроль, что
// и в ручной форме. Возвращает число реально созданных строк (пустые пропускает).
async function createActionRows(
  projectId: string,
  date: Date,
  actions: ParsedAction[],
  options: { noCheckpoints?: boolean; customCheckDate?: Date } = {},
): Promise<number> {
  const usable = actions.filter((a) => a.place?.trim() && a.description?.trim());
  if (usable.length === 0) return 0;

  await prisma.$transaction(
    usable.map((a) =>
      prisma.action.create({
        data: {
          projectId,
          date,
          place: a.place.trim(),
          description: a.description.trim(),
          justification: a.justification?.trim() || null,
          note: a.note?.trim() || null,
          checkpoints: options.noCheckpoints
            ? undefined
            : {
                create: [
                  { type: "DAY", plannedDate: addDays(date, 1) },
                  { type: "WEEK", plannedDate: addDays(date, 7) },
                  { type: "MONTH", plannedDate: addDays(date, 30) },
                  ...(options.customCheckDate
                    ? [{ type: "CUSTOM" as const, plannedDate: options.customCheckDate }]
                    : []),
                ],
              },
        },
      }),
    ),
  );

  return usable.length;
}

export async function createActionsBulk(
  projectId: string,
  dateValue: string,
  actions: ParsedAction[],
  options?: { noCheckpoints?: boolean; customCheckDate?: string },
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!projectId) return { ok: false, error: COPY.errors.projectMissing };
  if (!dateValue) return { ok: false, error: "Дата действия обязательна." };

  const count = await createActionRows(projectId, parseDateInput(dateValue), actions, {
    noCheckpoints: options?.noCheckpoints,
    customCheckDate: options?.customCheckDate ? parseDateInput(options.customCheckDate) : undefined,
  });
  if (count === 0) {
    return { ok: false, error: "Нет ни одной заполненной правки для сохранения." };
  }

  revalidatePath("/diary");
  revalidatePath("/today");
  return { ok: true, count };
}
