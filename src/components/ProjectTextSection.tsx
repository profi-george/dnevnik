"use client";

import { updateProjectTextSection } from "@/app/actions";
import { COPY } from "@/lib/microcopy";
import { useProjectEditing } from "@/components/ProjectEditContext";

type Field = "history" | "problems" | "questions";

export default function ProjectTextSection({
  projectId,
  field,
  value,
}: {
  projectId: string;
  field: Field;
  value: string | null;
}) {
  const copy = COPY.projectInfo[field];
  const editing = useProjectEditing();

  return (
    <div className="card flex flex-col gap-2.5 p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold tracking-tight text-fg">{copy.label}</h2>
        <p className="hint">{copy.hint}</p>
      </div>

      {editing ? (
        <form action={updateProjectTextSection} className="flex flex-col gap-2.5">
          <input type="hidden" name="id" value={projectId} />
          <input type="hidden" name="field" value={field} />
          <textarea
            name="value"
            rows={8}
            defaultValue={value ?? ""}
            placeholder={copy.placeholder}
            className="field"
          />
          <button type="submit" className="btn btn-secondary self-start">
            {COPY.cta.saveInfo}
          </button>
        </form>
      ) : (
        <p className={`whitespace-pre-wrap text-13 ${value ? "text-fg" : "text-fg-subtle"}`}>
          {value || "—"}
        </p>
      )}
    </div>
  );
}
