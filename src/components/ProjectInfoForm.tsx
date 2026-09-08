"use client";

import { useTransition } from "react";
import { updateProjectInfo } from "@/app/actions";
import { COPY } from "@/lib/microcopy";
import { useProjectEditing } from "@/components/ProjectEditContext";

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

function ReadRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-13 font-medium text-fg">{label}</span>
      <span className={`text-13 ${value ? "text-fg" : "text-fg-subtle"}`}>{value || "—"}</span>
    </div>
  );
}

function EditRow({
  name,
  label,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-13 font-medium text-fg">{label}</span>
      <input type="text" name={name} defaultValue={defaultValue ?? ""} className="field" />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export default function ProjectInfoForm({ project: p }: { project: Project }) {
  const editing = useProjectEditing();
  const [isPending, startTransition] = useTransition();

  function save(formData: FormData) {
    startTransition(async () => {
      await updateProjectInfo(formData);
    });
  }

  return (
    <div className="card flex flex-col gap-5 p-5">
      <h2 className="text-base font-semibold tracking-tight text-fg">Вводные</h2>

      {editing ? (
        <form action={save} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={p.id} />

          <Section title="О клиенте">
            <EditRow name="topic" label={F.topic.label} defaultValue={p.topic} />
            <EditRow name="site" label={F.site.label} defaultValue={p.site} />
            <EditRow name="budget" label={F.budget.label} defaultValue={p.budget} />
            <EditRow name="regions" label={F.regions.label} defaultValue={p.regions} />
            <EditRow name="directLogin" label={F.directLogin.label} defaultValue={p.directLogin} />
          </Section>

          <div className="border-t border-line-soft" />

          <Section title="Стратегия">
            <EditRow name="priorities" label={F.priorities.label} defaultValue={p.priorities} />
            <EditRow name="businessGoals" label={F.businessGoals.label} defaultValue={p.businessGoals} />
            <EditRow
              name="qualifiedLeadParams"
              label={F.qualifiedLeadParams.label}
              defaultValue={p.qualifiedLeadParams}
              hint={F.qualifiedLeadParams.hint}
            />
          </Section>

          <div className="border-t border-line-soft" />

          <Section title="Клиент">
            <EditRow name="clientWishes" label={F.clientWishes.label} defaultValue={p.clientWishes} />
            <EditRow name="constraints" label={F.constraints.label} defaultValue={p.constraints} />
          </Section>

          <div className="border-t border-line-soft pt-4">
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? "Сохраняю…" : COPY.cta.saveInfo}
            </button>
          </div>
        </form>
      ) : (
        <>
          <Section title="О клиенте">
            <ReadRow label={F.topic.label} value={p.topic} />
            <ReadRow label={F.site.label} value={p.site} />
            <ReadRow label={F.budget.label} value={p.budget} />
            <ReadRow label={F.regions.label} value={p.regions} />
            <ReadRow label={F.directLogin.label} value={p.directLogin} />
          </Section>

          <div className="border-t border-line-soft" />

          <Section title="Стратегия">
            <ReadRow label={F.priorities.label} value={p.priorities} />
            <ReadRow label={F.businessGoals.label} value={p.businessGoals} />
            <ReadRow label={F.qualifiedLeadParams.label} value={p.qualifiedLeadParams} />
          </Section>

          <div className="border-t border-line-soft" />

          <Section title="Клиент">
            <ReadRow label={F.clientWishes.label} value={p.clientWishes} />
            <ReadRow label={F.constraints.label} value={p.constraints} />
          </Section>
        </>
      )}
    </div>
  );
}
