"use client";

import { useEffect, useState, useTransition } from "react";
import { createAction, createProjectAndReturn, getPlacesForProject } from "@/app/actions";
import { toDateInputValue } from "@/lib/dates";
import { COPY } from "@/lib/microcopy";

type Project = { id: string; name: string };

const F = COPY.fields;

export default function AddActionForm({ projects: initialProjects }: { projects: Project[] }) {
  const [projectList, setProjectList] = useState(initialProjects);
  const [projectId, setProjectId] = useState(initialProjects[0]?.id ?? "");
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

  const label = "text-sm font-medium text-neutral-700";
  const optional = "font-normal text-neutral-400";
  const hint = "text-xs text-neutral-400";
  const input = "rounded border border-neutral-300 px-3 py-2 text-sm";

  return (
    <form
      action={createAction}
      className="flex flex-col gap-4 rounded border border-neutral-200 bg-white p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-neutral-900">Записать правку</h2>
        <p className={hint}>
          {noCheckpoints
            ? "Проверки не планируем — напоминаний не будет"
            : "Три проверки создадутся автоматически"}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <span className={label}>{F.project.label}</span>
        <select
          name="projectId"
          required
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className={input}
        >
          {projectList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {!addingProject ? (
          <>
            <button
              type="button"
              onClick={() => setAddingProject(true)}
              className="self-start text-xs text-ink-600 hover:underline"
            >
              + Новый проект
            </button>
            <span className={hint}>{F.project.hint}</span>
          </>
        ) : (
          <div className="flex flex-col gap-1.5 rounded border border-neutral-200 bg-neutral-50 p-2.5">
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
                className={`${input} flex-1 bg-white`}
              />
              <button
                type="button"
                onClick={createNewProject}
                className="rounded bg-ink-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-ink-700"
              >
                Создать
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingProject(false);
                  setNewProjectError(null);
                }}
                className="text-xs text-neutral-500 hover:text-ink-600"
              >
                Отмена
              </button>
            </div>
            {newProjectError && <p className="text-xs text-red-600">⚠ {newProjectError}</p>}
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className={label}>{F.date.label}</span>
        <input
          type="date"
          name="date"
          required
          defaultValue={toDateInputValue(new Date())}
          className={input}
        />
        <span className={hint}>{F.date.hint}</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className={label}>{F.place.label}</span>
        <input
          type="text"
          name="place"
          required
          list="place-suggestions"
          placeholder={F.place.placeholder}
          className={input}
        />
        <datalist id="place-suggestions">
          {places.map((place) => (
            <option key={place} value={place} />
          ))}
        </datalist>
        <span className={hint}>
          {places.length === 0 ? COPY.empty.placeFirstTime : F.place.hint}
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className={label}>{F.description.label}</span>
        <textarea
          name="description"
          required
          rows={3}
          placeholder={F.description.placeholder}
          className={input}
        />
        <span className={hint}>{F.description.hint}</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className={label}>
          {F.justification.label} <span className={optional}>{F.justification.optional}</span>
        </span>
        <textarea
          name="justification"
          rows={2}
          placeholder={F.justification.placeholder}
          className={input}
        />
        <span className={hint}>{F.justification.hint}</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className={label}>
          {F.reportUrl.label} <span className={optional}>{F.reportUrl.optional}</span>
        </span>
        <input
          type="url"
          name="reportUrl"
          placeholder={F.reportUrl.placeholder}
          className={input}
        />
        <span className={hint}>{F.reportUrl.hint}</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className={label}>
          {F.note.label} <span className={optional}>{F.note.optional}</span>
        </span>
        <textarea name="note" rows={2} placeholder={F.note.placeholder} className={input} />
        <span className={hint}>{F.note.hint}</span>
      </label>

      <div className="flex flex-col gap-1 rounded border border-neutral-200 bg-neutral-50 p-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="noCheckpoints"
            value="1"
            checked={noCheckpoints}
            onChange={(e) => setNoCheckpoints(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300"
          />
          <span className="text-sm text-neutral-700">{F.noCheckpoints.label}</span>
        </label>
        <span className={`${hint} pl-6`}>{F.noCheckpoints.hint}</span>
      </div>

      {!noCheckpoints && (
        <label className="flex flex-col gap-1">
          <span className={label}>
            {F.customCheckDate.label} <span className={optional}>{F.customCheckDate.optional}</span>
          </span>
          <input type="date" name="customCheckDate" className={input} />
          <span className={hint}>{F.customCheckDate.hint}</span>
        </label>
      )}

      <div className="flex items-center gap-4 border-t border-neutral-100 pt-4">
        <button
          type="submit"
          className="rounded bg-ink-600 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700"
        >
          {noCheckpoints ? COPY.cta.createActionNoCheckpoints : COPY.cta.createAction}
        </button>
        <a href="/diary" className="text-sm text-neutral-500 hover:text-ink-600">
          {COPY.cta.dontSave}
        </a>
      </div>

      <p className={hint} title={COPY.tooltips.checkpoints}>
        {noCheckpoints
          ? "Правка попадёт в дневник без проверок — вернуться к ней можно вручную."
          : "Проверим через сутки, через неделю и через месяц после даты правки."}
      </p>
    </form>
  );
}
