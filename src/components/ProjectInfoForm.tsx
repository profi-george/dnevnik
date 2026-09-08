import { updateProjectInfo } from "@/app/actions";
import { COPY } from "@/lib/microcopy";

type Project = {
  id: string;
  topic: string | null;
  site: string | null;
  budget: string | null;
  regions: string | null;
  priorities: string | null;
  businessGoals: string | null;
  qualifiedLeadParams: string | null;
  clientWishes: string | null;
  constraints: string | null;
  directLogin: string | null;
};

const F = COPY.projectInfo;
const label = "text-13 font-medium text-fg";

function Field({
  name,
  label: fieldLabel,
  value,
  hint,
}: {
  name: keyof typeof F;
  label: string;
  value: string | null;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={label}>{fieldLabel}</span>
      <input type="text" name={name} defaultValue={value ?? ""} className="field" />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export default function ProjectInfoForm({ project }: { project: Project }) {
  return (
    <form action={updateProjectInfo} className="card flex flex-col gap-4 p-5">
      <input type="hidden" name="id" value={project.id} />
      <h2 className="text-base font-semibold tracking-tight text-fg">Вводные</h2>

      <div className="grid grid-cols-2 gap-4">
        <Field name="topic" label={F.topic.label} value={project.topic} />
        <Field name="site" label={F.site.label} value={project.site} />
        <Field name="budget" label={F.budget.label} value={project.budget} />
        <Field name="regions" label={F.regions.label} value={project.regions} />
        <Field name="priorities" label={F.priorities.label} value={project.priorities} />
        <Field name="businessGoals" label={F.businessGoals.label} value={project.businessGoals} />
        <Field
          name="qualifiedLeadParams"
          label={F.qualifiedLeadParams.label}
          value={project.qualifiedLeadParams}
          hint={F.qualifiedLeadParams.hint}
        />
        <Field name="clientWishes" label={F.clientWishes.label} value={project.clientWishes} />
        <Field name="constraints" label={F.constraints.label} value={project.constraints} />
        <Field name="directLogin" label={F.directLogin.label} value={project.directLogin} />
      </div>

      <div className="border-t border-line-soft pt-4">
        <button type="submit" className="btn btn-primary">
          {COPY.cta.saveInfo}
        </button>
      </div>
    </form>
  );
}
