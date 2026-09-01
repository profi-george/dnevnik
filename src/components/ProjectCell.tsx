"use client";

import { useEffect, useState, useTransition } from "react";
import { updateActionField } from "@/app/actions";

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
        className="w-full min-w-0 rounded border border-ink-500 bg-white px-1.5 py-1 text-sm"
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
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="block w-full min-w-0 whitespace-pre-wrap break-words rounded px-1.5 py-1 text-left text-sm text-neutral-500 underline decoration-dotted decoration-neutral-300 underline-offset-4 hover:bg-neutral-100 hover:decoration-ink-500"
      >
        {projectName}
      </button>
      {status && (
        <span
          className={`px-1.5 text-xs ${status.kind === "error" ? "text-red-600" : "text-emerald-600"}`}
        >
          {status.kind === "error" ? "⚠ " : "✓ "}
          {status.text}
        </span>
      )}
    </div>
  );
}
