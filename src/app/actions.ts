"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addDays, parseDateInput, startOfToday } from "@/lib/dates";
import { COPY } from "@/lib/microcopy";
import {
  parseActionsFromText,
  parseFollowUpActionsFromResult,
  parseProjectInfoFromText,
  type ParsedAction,
  type ParsedProjectInfo,
} from "@/lib/gemini";
import type { Prisma } from "@/generated/prisma/client";

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
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.project.delete({ where: { id } });
  revalidatePath("/projects");
  revalidatePath("/diary");
  revalidatePath("/today");
}

// ——— Карточка проекта: вводные, история, ссылки, карта целей ———

const PROJECT_INFO_FIELDS = [
  "topic",
  "site",
  "budget",
  "regions",
  "priorities",
  "businessGoals",
  "qualifiedLeadParams",
  "clientWishes",
  "constraints",
  "directLogin",
] as const;
type ProjectInfoField = (typeof PROJECT_INFO_FIELDS)[number];

// Вводные читаются как текст, редактируются все разом по одному карандашику —
// сохраняется одной формой целиком.
export async function updateProjectInfo(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: COPY.errors.cellSaveFailed };

  const data: Partial<Record<ProjectInfoField, string | null>> = {};
  for (const field of PROJECT_INFO_FIELDS) {
    data[field] = String(formData.get(field) ?? "").trim() || null;
  }

  await prisma.project.update({ where: { id }, data });
  revalidatePath(`/projects/${id}`);
  return { ok: true };
}

const PROJECT_TEXT_SECTIONS = ["history", "problems", "questions"] as const;
type ProjectTextSection = (typeof PROJECT_TEXT_SECTIONS)[number];

// История / Проблемы / Вопросы — три отдельных свободных раздела, каждый со своим
// сохранением: их правят независимо и в разное время, не всей карточкой целиком.
export async function updateProjectTextSection(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const field = String(formData.get("field") ?? "") as ProjectTextSection;
  if (!id || !PROJECT_TEXT_SECTIONS.includes(field)) return;

  const value = String(formData.get("value") ?? "").trim();
  await prisma.project.update({ where: { id }, data: { [field]: value || null } });
  revalidatePath(`/projects/${id}`);
}

// Важные ссылки проекта — клиентский отчёт, визуализация и т.д.
export async function createProjectLink(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!projectId || !label || !url) return;

  const count = await prisma.projectLink.count({ where: { projectId } });
  await prisma.projectLink.create({ data: { projectId, label, url, order: count } });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectLink(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!id) return;
  await prisma.projectLink.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
}

// Карта целей — таблица целей Метрики/Директа, на которые ориентируется проект.
export async function createProjectGoal(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const goalId = String(formData.get("goalId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const level = String(formData.get("level") ?? "MACRO") === "MICRO" ? "MICRO" : "MACRO";
  if (!projectId || !goalId || !name) return;

  const count = await prisma.projectGoal.count({ where: { projectId } });
  await prisma.projectGoal.create({
    data: { projectId, goalId, name, level, order: count },
  });
  revalidatePath(`/projects/${projectId}`);
}

const GOAL_EDITABLE_FIELDS = ["goalId", "name", "level", "description", "validDatesNote"] as const;
type GoalField = (typeof GOAL_EDITABLE_FIELDS)[number];
const GOAL_REQUIRED_FIELDS = new Set<GoalField>(["goalId", "name"]);

export async function updateProjectGoalField(
  id: string,
  projectId: string,
  field: GoalField,
  value: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id || !GOAL_EDITABLE_FIELDS.includes(field)) {
    return { ok: false, error: COPY.errors.cellSaveFailed };
  }

  const trimmed = value.trim();
  if (GOAL_REQUIRED_FIELDS.has(field) && !trimmed) {
    return { ok: false, error: field === "goalId" ? "ID цели обязателен." : "Название обязательно." };
  }
  if (field === "level" && trimmed !== "MACRO" && trimmed !== "MICRO") {
    return { ok: false, error: COPY.errors.cellSaveFailed };
  }

  await prisma.projectGoal.update({
    where: { id },
    data: { [field]: GOAL_REQUIRED_FIELDS.has(field) || field === "level" ? trimmed : trimmed || null },
  });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function deleteProjectGoal(
  id: string,
  projectId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "Не передан id цели." };
  await prisma.projectGoal.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
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

// Не по каждой проверке есть что написать в результат (например, ничего не изменилось
// и не на чем строить вывод) — снимаем без обязательного текста, отдельно от обычного
// «Сохранить результат», которое текст требует.
export async function closeCheckpointWithoutResult(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: COPY.errors.cellSaveFailed };
  await prisma.checkpoint.update({ where: { id }, data: { status: "DONE" } });
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

  // Последняя зафиксированная правка по этому месту — не обязательно то же действие,
  // к которому привязана эта проверка: могли внести более свежую правку отдельно.
  // Без этого ИИ считает «было» от исходной правки, а не от актуального значения.
  const latestAction = await prisma.action.findFirst({
    where: { projectId: checkpoint.action.projectId, place: checkpoint.action.place },
    orderBy: { createdAt: "desc" },
  });

  return parseFollowUpActionsFromResult(
    resultText,
    checkpoint.action.place,
    latestAction?.description ?? checkpoint.action.description,
  );
}

export async function createCheckpointFollowUpActions(
  checkpointId: string,
  actions: ParsedAction[],
  dateValue?: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!checkpointId) return { ok: false, error: "Не передан id проверки." };
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    include: { action: true },
  });
  if (!checkpoint) return { ok: false, error: "Проверка не найдена." };

  const date = dateValue ? parseDateInput(dateValue) : startOfToday();
  const count = await createActionRows(checkpoint.action.projectId, date, actions);
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

// ——— Заметки: свободное место для текста/промптов, отдельно от дневника правок ———

export async function createNote(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  await prisma.note.create({ data: { title: title || null, text } });
  revalidatePath("/notes");
}

const NOTE_FIELDS = ["title", "text", "color"] as const;
type NoteField = (typeof NOTE_FIELDS)[number];

// Заметка правится по клику, поле за полем — сохраняется на blur, без общей кнопки.
export async function updateNoteField(
  id: string,
  field: NoteField,
  value: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id || !NOTE_FIELDS.includes(field)) return { ok: false, error: COPY.errors.cellSaveFailed };
  if (field === "text" && !value.trim()) {
    return { ok: false, error: "Текст заметки не может быть пустым." };
  }
  const data = field === "title" ? { title: value.trim() || null } : { [field]: value.trim() };
  await prisma.note.update({ where: { id }, data });
  revalidatePath("/notes");
  return { ok: true };
}

export async function toggleNotePin(
  id: string,
  pinned: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "Не передан id заметки." };
  await prisma.note.update({ where: { id }, data: { pinned } });
  revalidatePath("/notes");
  return { ok: true };
}

export async function deleteNote(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "Не передан id заметки." };
  await prisma.note.delete({ where: { id } });
  revalidatePath("/notes");
  return { ok: true };
}

// ——— Риски проекта — что регулярно проверять, чтобы не прозевать проблему ———

export async function createProjectRisk(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const risk = String(formData.get("risk") ?? "").trim();
  if (!projectId || !risk) return;

  const url = String(formData.get("url") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "").trim();
  const count = await prisma.projectRisk.count({ where: { projectId } });
  await prisma.projectRisk.create({
    data: { projectId, risk, url: url || null, frequency: frequency || null, order: count },
  });
  revalidatePath(`/projects/${projectId}`);
}

const RISK_FIELDS = ["risk", "url", "frequency"] as const;
type RiskField = (typeof RISK_FIELDS)[number];

export async function updateProjectRiskField(
  id: string,
  projectId: string,
  field: RiskField,
  value: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id || !RISK_FIELDS.includes(field)) return { ok: false, error: COPY.errors.cellSaveFailed };
  const trimmed = value.trim();
  if (field === "risk" && !trimmed) return { ok: false, error: "Опишите риск хотя бы коротко." };
  await prisma.projectRisk.update({ where: { id }, data: { [field]: field === "risk" ? trimmed : trimmed || null } });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function deleteProjectRisk(
  id: string,
  projectId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "Не передан id риска." };
  await prisma.projectRisk.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// ——— Пароли проекта — хранятся как обычный текст, без шифрования ———

export async function createProjectPassword(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (!projectId || !label || !value) return;

  const count = await prisma.projectPassword.count({ where: { projectId } });
  await prisma.projectPassword.create({ data: { projectId, label, value, order: count } });
  revalidatePath(`/projects/${projectId}`);
}

const PASSWORD_FIELDS = ["label", "value"] as const;
type PasswordField = (typeof PASSWORD_FIELDS)[number];

export async function updateProjectPasswordField(
  id: string,
  projectId: string,
  field: PasswordField,
  value: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id || !PASSWORD_FIELDS.includes(field)) return { ok: false, error: COPY.errors.cellSaveFailed };
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, error: "Поле не может быть пустым." };
  await prisma.projectPassword.update({ where: { id }, data: { [field]: trimmed } });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function deleteProjectPassword(
  id: string,
  projectId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "Не передан id записи." };
  await prisma.projectPassword.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// ——— Заполнение карточки проекта через ИИ: один кусок текста → все вкладки разом ———

export async function parseProjectInfoWithAI(
  rawText: string,
): Promise<{ ok: true; data: ParsedProjectInfo } | { ok: false; error: string }> {
  return parseProjectInfoFromText(rawText);
}

export async function applyParsedProjectInfo(
  projectId: string,
  data: ParsedProjectInfo,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!projectId) return { ok: false, error: "Не передан id проекта." };

  const infoData: Partial<Record<ProjectInfoField | ProjectTextSection, string | null>> = {};
  for (const field of PROJECT_INFO_FIELDS) {
    const value = data.info?.[field];
    if (value && value.trim()) infoData[field] = value.trim();
  }
  for (const field of PROJECT_TEXT_SECTIONS) {
    const value = data.info?.[field];
    if (value && value.trim()) infoData[field] = value.trim();
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  if (Object.keys(infoData).length > 0) {
    ops.push(prisma.project.update({ where: { id: projectId }, data: infoData }));
  }

  const links = (data.links ?? []).filter((l) => l.label?.trim() && l.url?.trim());
  const linkCountBase = await prisma.projectLink.count({ where: { projectId } });
  links.forEach((l, i) => {
    ops.push(
      prisma.projectLink.create({
        data: { projectId, label: l.label.trim(), url: l.url.trim(), order: linkCountBase + i },
      }),
    );
  });

  const goals = (data.goals ?? []).filter((g) => g.goalId?.trim() && g.name?.trim());
  const goalCountBase = await prisma.projectGoal.count({ where: { projectId } });
  goals.forEach((g, i) => {
    ops.push(
      prisma.projectGoal.create({
        data: {
          projectId,
          goalId: g.goalId.trim(),
          name: g.name.trim(),
          level: g.level === "MICRO" ? "MICRO" : "MACRO",
          description: g.description?.trim() || null,
          validDatesNote: g.validDatesNote?.trim() || null,
          order: goalCountBase + i,
        },
      }),
    );
  });

  const risks = (data.risks ?? []).filter((r) => r.risk?.trim());
  const riskCountBase = await prisma.projectRisk.count({ where: { projectId } });
  risks.forEach((r, i) => {
    ops.push(
      prisma.projectRisk.create({
        data: {
          projectId,
          risk: r.risk.trim(),
          url: r.url?.trim() || null,
          frequency: r.frequency?.trim() || null,
          order: riskCountBase + i,
        },
      }),
    );
  });

  const passwords = (data.passwords ?? []).filter((p) => p.label?.trim() && p.value?.trim());
  const passwordCountBase = await prisma.projectPassword.count({ where: { projectId } });
  passwords.forEach((p, i) => {
    ops.push(
      prisma.projectPassword.create({
        data: { projectId, label: p.label.trim(), value: p.value.trim(), order: passwordCountBase + i },
      }),
    );
  });

  if (ops.length === 0) return { ok: false, error: "Нечего применять — все поля пустые." };
  await prisma.$transaction(ops);

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
