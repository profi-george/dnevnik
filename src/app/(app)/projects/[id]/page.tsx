import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { actionWord } from "@/lib/microcopy";
import { IconArrowLeft, IconArrowRight } from "@/components/icons";
import ProjectNameField from "@/components/ProjectNameField";
import ProjectInfoForm from "@/components/ProjectInfoForm";
import ProjectTextSection from "@/components/ProjectTextSection";
import ProjectLinksEditor from "@/components/ProjectLinksEditor";
import ProjectGoalsTable from "@/components/ProjectGoalsTable";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      _count: { select: { actions: true } },
      links: { orderBy: { order: "asc" } },
      goals: { orderBy: { order: "asc" } },
    },
  });

  if (!project) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <Link href="/projects" className="link inline-flex w-fit items-center gap-1 text-13">
            <IconArrowLeft className="h-3.5 w-3.5" />
            К проектам
          </Link>
          <ProjectNameField id={project.id} name={project.name} />
        </div>
        <Link
          href={`/diary?projectId=${project.id}`}
          className="btn btn-secondary"
        >
          Дневник по проекту · {project._count.actions} {actionWord(project._count.actions)}
          <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ProjectInfoForm project={project} />
      <ProjectLinksEditor projectId={project.id} links={project.links} />
      <ProjectTextSection projectId={project.id} field="history" value={project.history} />
      <ProjectTextSection projectId={project.id} field="problems" value={project.problems} />
      <ProjectTextSection projectId={project.id} field="questions" value={project.questions} />
      <ProjectGoalsTable projectId={project.id} goals={project.goals} />
    </div>
  );
}
