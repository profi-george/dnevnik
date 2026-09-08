import { COPY } from "@/lib/microcopy";
import ProjectInfoField from "@/components/ProjectInfoField";

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="micro">{title}</h3>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export default function ProjectInfoForm({ project }: { project: Project }) {
  const p = project.id;

  return (
    <div className="card flex flex-col gap-5 p-5">
      <h2 className="text-base font-semibold tracking-tight text-fg">Вводные</h2>

      <Section title="О клиенте">
        <ProjectInfoField projectId={p} field="topic" label={F.topic.label} value={project.topic} />
        <ProjectInfoField projectId={p} field="site" label={F.site.label} value={project.site} />
        <ProjectInfoField projectId={p} field="budget" label={F.budget.label} value={project.budget} />
        <ProjectInfoField projectId={p} field="regions" label={F.regions.label} value={project.regions} />
        <ProjectInfoField
          projectId={p}
          field="directLogin"
          label={F.directLogin.label}
          value={project.directLogin}
        />
      </Section>

      <div className="border-t border-line-soft" />

      <Section title="Стратегия">
        <ProjectInfoField
          projectId={p}
          field="priorities"
          label={F.priorities.label}
          value={project.priorities}
        />
        <ProjectInfoField
          projectId={p}
          field="businessGoals"
          label={F.businessGoals.label}
          value={project.businessGoals}
        />
        <ProjectInfoField
          projectId={p}
          field="qualifiedLeadParams"
          label={F.qualifiedLeadParams.label}
          value={project.qualifiedLeadParams}
          hint={F.qualifiedLeadParams.hint}
        />
      </Section>

      <div className="border-t border-line-soft" />

      <Section title="Клиент">
        <ProjectInfoField
          projectId={p}
          field="clientWishes"
          label={F.clientWishes.label}
          value={project.clientWishes}
        />
        <ProjectInfoField
          projectId={p}
          field="constraints"
          label={F.constraints.label}
          value={project.constraints}
        />
      </Section>
    </div>
  );
}
