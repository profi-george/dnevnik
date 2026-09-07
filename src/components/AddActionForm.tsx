"use client";

import { useEffect, useState, useTransition } from "react";
import { createAction, createProjectAndReturn, getPlacesForProject } from "@/app/actions";
import { toDateInputValue } from "@/lib/dates";
import { COPY } from "@/lib/microcopy";
import { IconAlert, IconPlus } from "@/components/icons";

type Project = { id: string; name: string };

const F = COPY.fields;

const DEFAULT_PROJECT_NAME = "Gclinic";

export default function AddActionForm({ projects: initialProjects }: { projects: Project[] }) {
  const [projectList, setProjectList] = useState(initialProjects);
  const [projectId, setProjectId] = useState(
    initialProjects.find((p) => p.name === DEFAULT_PROJECT_NAME)?.id ?? initialProjects[0]?.id ?? "",
  );
  const [places, setPlaces] = useState<string[]>([]);
  const [noCheckpoints, setNoCheckpoints] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectError, setNewProjectError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function createNewProject() {
    setNewProjectError(null);
    startTransition(async () => {
      const result = await createProjectAndReturn(newProjectName);
      if (!result.ok) {
        setNewProjectError(result.error);
        return;
      }
      setProjectList((prev) => [...prev, result.project]);
      setProjectId(result.project.id);
      setNewProjectName("");
      setAddingProject(false);
    });
  }

  useEffect(() => {
    if (!projectId) {
      setPlaces([]);
      return;
    }
    startTransition(() => {
      getPlacesForProject(projectId).then(setPlaces);
    });
  }, [projectId]);

  const label = "text-13 font-medium text-fg";
  const optional = "font-normal text-fg-subtle";

  return (
    <form action={createAction} className="card flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1 border-b border-line-soft pb-4">
        <h2 className="text-base font-semibold tracking-tight text-fg">Записать правку</h2>
        <p className="hint">
          {noCheckpoints
            ? "Проверки не планируем — напоминаний не будет"
            : "Три проверки создадутся автоматически"}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={label}>{F.project.label}</span>
        <input type="hidden" name="projectId" value={projectId} required />
        <div className="flex flex-wrap gap-1.5">
          {projectList.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProjectId(p.id)}
              aria-pressed={projectId === p.id}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-13 font-medium transition-colors ${
                projectId === p.id
                  ? "border-ink-600 bg-ink-600 text-white"
                  : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        {!addingProject ? (
          <>
            <button
              type="button"
              onClick={() => setAddingProject(true)}
              className="link inline-flex w-fit items-center gap-1 text-xs"
            >
              <IconPlus className="h-3 w-3" />
              Новый проект
            </button>
            <span className="hint">{F.project.hint}</span>
          </>
        ) : (
          <div className="panel flex flex-col gap-1.5 p-2.5">
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    createNewProject();
                  }
                }}
                placeholder={F.projectName.placeholder}
                className="field flex-1"
              />
              <button type="button" onClick={createNewProject} className="btn btn-primary btn-sm">
                Создать
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingProject(false);
                  setNewProjectError(null);
                }}
                className="btn btn-ghost btn-sm"
              >
                Отмена
              </button>
            </div>
            {newProjectError && (
              <p className="inline-flex items-center gap-1 text-xs text-danger">
                <IconAlert className="h-3 w-3 shrink-0" />
                {newProjectError}
              </p>
            )}
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={label}>{F.date.label}</span>
        <input
          type="date"
          name="date"
          required
          defaultValue={toDateInputValue(new Date())}
          className="field w-auto self-start"
        />
        <span className="hint">{F.date.hint}</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={label}>{F.place.label}</span>
        <input
          type="text"
          name="place"
          required
          list="place-suggestions"
          placeholder={F.place.placeholder}
          className="field"
        />
        <datalist id="place-suggestions">
          {places.map((place) => (
            <option key={place} value={place} />
          ))}
        </datalist>
        <span className="hint">{places.length === 0 ? COPY.empty.placeFirstTime : F.place.hint}</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={label}>{F.description.label}</span>
        <textarea
          name="description"
          required
          rows={3}
          placeholder={F.description.placeholder}
          className="field"
        />
        <span className="hint">{F.description.hint}</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={label}>
          {F.justification.label} <span className={optional}>{F.justification.optional}</span>
        </span>
        <textarea
          name="justification"
          rows={2}
          placeholder={F.justification.placeholder}
          className="field"
        />
        <span className="hint">{F.justification.hint}</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={label}>
          {F.reportUrl.label} <span className={optional}>{F.reportUrl.optional}</span>
        </span>
        <input type="url" name="reportUrl" placeholder={F.reportUrl.placeholder} className="field" />
        <span className="hint">{F.reportUrl.hint}</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={label}>
          {F.note.label} <span className={optional}>{F.note.optional}</span>
        </span>
        <textarea name="note" rows={2} placeholder={F.note.placeholder} className="field" />
        <span className="hint">{F.note.hint}</span>
      </label>

      <div className="panel flex flex-col gap-1 p-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            name="noCheckpoints"
            value="1"
            checked={noCheckpoints}
            onChange={(e) => setNoCheckpoints(e.target.checked)}
            className="h-3.5 w-3.5 rounded accent-ink-600"
          />
          <span className="text-13 text-fg">{F.noCheckpoints.label}</span>
        </label>
        <span className="hint pl-5.5">{F.noCheckpoints.hint}</span>
      </div>

      {!noCheckpoints && (
        <label className="flex flex-col gap-1.5">
          <span className={label}>
            {F.customCheckDate.label} <span className={optional}>{F.customCheckDate.optional}</span>
          </span>
          <input type="date" name="customCheckDate" className="field w-auto self-start" />
          <span className="hint">{F.customCheckDate.hint}</span>
        </label>
      )}

      <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
        <div className="flex items-center gap-3">
          <button type="submit" className="btn btn-primary">
            {noCheckpoints ? COPY.cta.createActionNoCheckpoints : COPY.cta.createAction}
          </button>
          <a href="/diary" className="btn btn-ghost">
            {COPY.cta.dontSave}
          </a>
        </div>
        <p className="hint" title={COPY.tooltips.checkpoints}>
          {noCheckpoints
            ? "Правка попадёт в дневник без проверок — вернуться к ней можно вручную."
            : "Проверим через сутки, через неделю и через месяц после даты правки."}
        </p>
      </div>
    </form>
  );
}
