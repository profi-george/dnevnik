import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BulkAddForm from "@/components/BulkAddForm";
import { IconArrowLeft, IconArrowRight } from "@/components/icons";

export default async function BulkAddPage() {
  const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });

  if (projects.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-fg">Разобрать через ИИ</h1>
        <p className="text-13 text-fg-muted">Сначала заведите хотя бы один проект.</p>
        <Link href="/projects" className="link inline-flex w-fit items-center gap-1.5 text-13">
          Перейти к проектам
          <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold tracking-tight text-fg">Разобрать через ИИ</h1>
        <Link href="/diary/add" className="link inline-flex items-center gap-1.5 text-13">
          <IconArrowLeft className="h-3.5 w-3.5" />
          Одна правка вручную
        </Link>
      </div>
      <BulkAddForm projects={projects} />
    </div>
  );
}
