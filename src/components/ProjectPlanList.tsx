"use client";

import { createProjectPlanItem } from "@/app/actions";
import { COPY } from "@/lib/microcopy";
import { useProjectEditing } from "@/components/ProjectEditContext";
import PlanItemRow from "@/components/PlanItemRow";
import { IconPlus } from "@/components/icons";

type PlanItem = { id: string; text: string; done: boolean; dueDate: Date | null };

const F = COPY.planFields;

export default function ProjectPlanList({ projectId, items }: { projectId: string; items: PlanItem[] }) {
  const editing = useProjectEditing();

  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold tracking-tight text-fg">{COPY.planSection.title}</h2>
        <p className="hint">{COPY.planSection.hint}</p>
      </div>

      {items.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line-soft">
          {items.map((item) => (
            <PlanItemRow
              key={item.id}
              id={item.id}
              projectId={projectId}
              text={item.text}
              done={item.done}
              dueDate={item.dueDate}
            />
          ))}
        </ul>
      ) : (
        !editing && <p className="text-13 text-fg-subtle">—</p>
      )}

      {editing && (
        <form
          action={createProjectPlanItem}
          className="flex flex-wrap items-end gap-2 border-t border-line-soft pt-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <label className="flex flex-1 basis-56 flex-col gap-1">
            <span className="micro">{F.text.label}</span>
            <input type="text" name="text" required placeholder={F.text.placeholder} className="field" />
          </label>
          <label className="flex w-40 flex-col gap-1">
            <span className="micro">
              {F.dueDate.label} <span className="font-normal text-fg-subtle">{F.dueDate.optional}</span>
            </span>
            <input type="date" name="dueDate" className="field" />
          </label>
          <button type="submit" className="btn btn-secondary shrink-0">
            <IconPlus className="h-3.5 w-3.5" />
            {COPY.cta.addPlanItem}
          </button>
        </form>
      )}
    </div>
  );
}
