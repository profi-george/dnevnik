import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AddActionForm from "@/components/AddActionForm";

export default async function AddActionPage() {
  const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });

  if (projects.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <h1 className="text-xl font-semibold text-ink-700">Добавить действие</h1>
        <p className="text-sm text-neutral-500">
          Сначала заведите хотя бы один проект.
        </p>
        <Link href="/projects" className="text-sm text-ink-600 hover:underline">
          Перейти к проектам →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-700">Добавить действие</h1>
        <Link href="/diary/bulk" className="text-sm text-ink-600 hover:underline">
          Вставить сразу несколько через ИИ →
        </Link>
      </div>
      <AddActionForm projects={projects} />
    </div>
  );
}
