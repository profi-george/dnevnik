import { prisma } from "@/lib/prisma";
import { createProject, deleteProject, renameProject } from "@/app/actions";
import { COPY, actionWord } from "@/lib/microcopy";
import DeleteProjectButton from "@/components/DeleteProjectButton";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { actions: true } } },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-700">{COPY.nav.projects}</h1>

      <form action={createProject} className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <input
            type="text"
            name="name"
            required
            aria-label={COPY.fields.projectName.label}
            placeholder={COPY.fields.projectName.placeholder}
            className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-ink-600 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700"
          >
            {COPY.cta.addProject}
          </button>
        </div>
        <p className="text-xs text-neutral-400">{COPY.fields.projectName.hint}</p>
      </form>

      <ul className="flex flex-col divide-y divide-neutral-200 rounded border border-neutral-200 bg-white">
        {projects.map((project) => (
          <li key={project.id} className="flex items-center gap-3 px-4 py-3">
            <form action={renameProject} className="flex flex-1 items-center gap-2">
              <input type="hidden" name="id" value={project.id} />
              <input
                type="text"
                name="name"
                defaultValue={project.name}
                aria-label={COPY.fields.projectName.label}
                className="flex-1 rounded border border-transparent px-2 py-1 text-sm hover:border-neutral-300 focus:border-neutral-300"
              />
              <button type="submit" className="text-xs text-neutral-500 hover:text-ink-600">
                {COPY.cta.saveName}
              </button>
            </form>
            <span className="text-xs text-neutral-400">
              {project._count.actions} {actionWord(project._count.actions)}
            </span>
            <form action={deleteProject}>
              <input type="hidden" name="id" value={project.id} />
              <DeleteProjectButton projectName={project.name} actionsCount={project._count.actions} />
            </form>
          </li>
        ))}
        {projects.length === 0 && (
          <li className="px-6 py-10">
            <div className="mx-auto flex max-w-md flex-col items-center gap-1.5 text-center">
              <p className="text-base font-medium text-neutral-800">
                {COPY.empty.projectsEmpty.title}
              </p>
              <p className="text-sm leading-relaxed text-neutral-500">
                {COPY.empty.projectsEmpty.body}
              </p>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}
