"use client";

import { useEffect, useState, useTransition } from "react";
import { updateActionField } from "@/app/actions";
import { IconAlert, IconCheck } from "@/components/icons";

type Project = { id: string; name: string };

type Props = {
  id: string;
  projectId: string;
  projectName: string;
  projects: Project[];
};

type Status = { kind: "success" | "error"; text: string } | null;

export default function ProjectCell({ id, projectId, projectName, projects }: Props) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2400);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={projectId}
        onChange={(e) => {
          const value = e.target.value;
          setEditing(false);
          if (value !== projectId) {
            startTransition(async () => {
              const result = await updateActionField(id, "projectId", value);
              setStatus(
                result.ok
                  ? { kind: "success", text: "Сохранено" }
                  : { kind: "error", text: result.error },
              );
            });
          }
        }}
        onBlur={() => setEditing(false)}
        className="cell-input"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {/* Проект — якорь строки: чуть плотнее по весу, чтобы взгляд цеплялся при сортировке по проекту */}
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Клик — сменить проект"
        className="cell cell-muted font-medium"
      >
        {projectName}
      </button>
      {status && (
        <span className={`cell-status ${status.kind === "error" ? "text-danger" : "text-ok"}`}>
          {status.kind === "error" ? (
            <IconAlert className="h-3 w-3 shrink-0" />
          ) : (
            <IconCheck className="h-3 w-3 shrink-0" />
          )}
          {status.text}
        </span>
      )}
    </div>
  );
}
