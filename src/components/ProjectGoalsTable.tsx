import { createProjectGoal } from "@/app/actions";
import { COPY } from "@/lib/microcopy";
import GoalCell from "@/components/GoalCell";
import GoalDeleteButton from "@/components/GoalDeleteButton";
import { IconPlus } from "@/components/icons";

type Goal = {
  id: string;
  goalId: string;
  name: string;
  level: string;
  description: string | null;
  validDatesNote: string | null;
};

const F = COPY.goalFields;
const LEVEL_OPTIONS = [
  { value: "MACRO", label: "Макро" },
  { value: "MICRO", label: "Микро" },
];

export default function ProjectGoalsTable({ projectId, goals }: { projectId: string; goals: Goal[] }) {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <h2 className="text-base font-semibold tracking-tight text-fg">Карта целей</h2>

      {goals.length > 0 && (
        <div className="overflow-x-clip rounded-md border border-line max-xl:overflow-x-auto">
          <table className="tbl table-fixed min-w-[52rem]">
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "32%" }} />
              <col style={{ width: "27%" }} />
              <col style={{ width: "5%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>{F.goalId.label}</th>
                <th>{F.name.label}</th>
                <th>{F.level.label}</th>
                <th>{F.description.label}</th>
                <th>{F.validDatesNote.label}</th>
                <th aria-hidden></th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => (
                <tr key={goal.id} className="group">
                  <td>
                    <GoalCell id={goal.id} projectId={projectId} field="goalId" value={goal.goalId} />
                  </td>
                  <td>
                    <GoalCell id={goal.id} projectId={projectId} field="name" value={goal.name} />
                  </td>
                  <td>
                    <GoalCell
                      id={goal.id}
                      projectId={projectId}
                      field="level"
                      value={goal.level}
                      select={LEVEL_OPTIONS}
                    />
                  </td>
                  <td>
                    <GoalCell
                      id={goal.id}
                      projectId={projectId}
                      field="description"
                      value={goal.description ?? ""}
                      placeholder={F.description.placeholder}
                    />
                  </td>
                  <td>
                    <GoalCell
                      id={goal.id}
                      projectId={projectId}
                      field="validDatesNote"
                      value={goal.validDatesNote ?? ""}
                      placeholder={F.validDatesNote.placeholder}
                    />
                  </td>
                  <td className="text-center">
                    <GoalDeleteButton id={goal.id} projectId={projectId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        action={createProjectGoal}
        className="flex flex-wrap items-end gap-2 border-t border-line-soft pt-3"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <label className="flex w-24 flex-col gap-1">
          <span className="micro">{F.goalId.label}</span>
          <input type="text" name="goalId" required placeholder={F.goalId.placeholder} className="field" />
        </label>
        <label className="flex flex-1 basis-32 flex-col gap-1">
          <span className="micro">{F.name.label}</span>
          <input type="text" name="name" required placeholder={F.name.placeholder} className="field" />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="micro">{F.level.label}</span>
          <select name="level" defaultValue="MACRO" className="field">
            {LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-secondary shrink-0">
          <IconPlus className="h-3.5 w-3.5" />
          {COPY.cta.addGoal}
        </button>
      </form>
    </div>
  );
}
