import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createProject, deleteProject } from "@/app/actions";
import { COPY, actionWord } from "@/lib/microcopy";
import DeleteProjectButton from "@/components/DeleteProjectButton";
import { IconArrowRight, IconPlus } from "@/components/icons";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { actions: true } } },
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-lg font-semibold tracking-tight text-fg">{COPY.nav.projects}</h1>
        <span className="text-13 tabular-nums text-fg-subtle">{projects.length}</span>
      </div>

      <form action={createProject} className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <input
            type="text"
            name="name"
            required
            aria-label={COPY.fields.projectName.label}
            placeholder={COPY.fields.projectName.placeholder}
            className="field flex-1"
          />
          <button type="submit" className="btn btn-primary shrink-0">
            <IconPlus className="h-3.5 w-3.5" />
            {COPY.cta.addProject}
          </button>
        </div>
        <p className="hint">{COPY.fields.projectName.hint}</p>
      </form>

      <ul className="card divide-y divide-line-soft">
        {projects.map((project) => (
          <li key={project.id} className="group flex items-center gap-2 px-2.5 py-1">
            <Link
              href={`/projects/${project.id}`}
              className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1.5 hover:bg-hover-soft"
            >
              <span className="min-w-0 flex-1 truncate text-13 font-medium text-fg">{project.name}</span>
              <span className="shrink-0 text-2xs tabular-nums text-fg-subtle">
                {project._count.actions} {actionWord(project._count.actions)}
              </span>
              <IconArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            </Link>
            <form action={deleteProject} className="shrink-0">
              <input type="hidden" name="id" value={project.id} />
              <DeleteProjectButton
                projectName={project.name}
                actionsCount={project._count.actions}
              />
            </form>
          </li>
        ))}
        {projects.length === 0 && (
          <li className="px-6 py-12">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5 text-center">
              <p className="text-base font-medium text-fg">{COPY.empty.projectsEmpty.title}</p>
              <p className="text-13 leading-relaxed text-fg-muted">
                {COPY.empty.projectsEmpty.body}
              </p>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}
