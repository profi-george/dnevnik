"use client";

import { createProjectRisk } from "@/app/actions";
import { COPY } from "@/lib/microcopy";
import { useProjectEditing } from "@/components/ProjectEditContext";
import RiskCell from "@/components/RiskCell";
import RiskDeleteButton from "@/components/RiskDeleteButton";
import { IconExternal, IconPlus } from "@/components/icons";

type Risk = { id: string; risk: string; url: string | null; frequency: string | null };

const F = COPY.riskFields;

export default function ProjectRisksTable({ projectId, risks }: { projectId: string; risks: Risk[] }) {
  const editing = useProjectEditing();

  return (
    <div className="card flex flex-col gap-3 p-5">
      <h2 className="text-base font-semibold tracking-tight text-fg">Риски</h2>

      {risks.length > 0 ? (
        <div className="overflow-x-clip rounded-md border border-line max-xl:overflow-x-auto">
          <table className="tbl table-fixed min-w-[36rem]">
            <colgroup>
              <col style={{ width: "45%" }} />
              <col style={{ width: "35%" }} />
              <col style={{ width: "20%" }} />
              {editing && <col style={{ width: "5%" }} />}
            </colgroup>
            <thead>
              <tr>
                <th>{F.risk.label}</th>
                <th>{F.url.label}</th>
                <th>{F.frequency.label}</th>
                {editing && <th aria-hidden></th>}
              </tr>
            </thead>
            <tbody>
              {risks.map((risk) => (
                <tr key={risk.id} className="group">
                  <td>
                    <RiskCell
                      id={risk.id}
                      projectId={projectId}
                      field="risk"
                      value={risk.risk}
                      placeholder={F.risk.placeholder}
                      readOnly={!editing}
                    />
                  </td>
                  <td>
                    {editing ? (
                      <RiskCell
                        id={risk.id}
                        projectId={projectId}
                        field="url"
                        value={risk.url ?? ""}
                        placeholder={F.url.placeholder}
                      />
                    ) : risk.url ? (
                      <a
                        href={risk.url}
                        target="_blank"
                        rel="noreferrer"
                        className="link inline-flex items-center gap-1.5 text-13"
                      >
                        <IconExternal className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{risk.url}</span>
                      </a>
                    ) : (
                      <span className="cell cell-empty">—</span>
                    )}
                  </td>
                  <td>
                    <RiskCell
                      id={risk.id}
                      projectId={projectId}
                      field="frequency"
                      value={risk.frequency ?? ""}
                      placeholder={F.frequency.placeholder}
                      readOnly={!editing}
                    />
                  </td>
                  {editing && (
                    <td className="text-center">
                      <RiskDeleteButton id={risk.id} projectId={projectId} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !editing && <p className="text-13 text-fg-subtle">—</p>
      )}

      {editing && (
        <form
          action={createProjectRisk}
          className="flex flex-wrap items-end gap-2 border-t border-line-soft pt-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <label className="flex flex-1 basis-48 flex-col gap-1">
            <span className="micro">{F.risk.label}</span>
            <input type="text" name="risk" required placeholder={F.risk.placeholder} className="field" />
          </label>
          <label className="flex flex-1 basis-40 flex-col gap-1">
            <span className="micro">{F.url.label}</span>
            <input type="url" name="url" placeholder={F.url.placeholder} className="field" />
          </label>
          <label className="flex w-28 flex-col gap-1">
            <span className="micro">{F.frequency.label}</span>
            <input type="text" name="frequency" placeholder={F.frequency.placeholder} className="field" />
          </label>
          <button type="submit" className="btn btn-secondary shrink-0">
            <IconPlus className="h-3.5 w-3.5" />
            {COPY.cta.addRisk}
          </button>
        </form>
      )}
    </div>
  );
}
