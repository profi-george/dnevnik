import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BulkAddForm from "@/components/BulkAddForm";

export default async function BulkAddPage() {
  const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });

  if (projects.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <h1 className="text-xl font-semibold text-ink-700">Разобрать через ИИ</h1>
        <p className="text-sm text-neutral-500">Сначала заведите хотя бы один проект.</p>
        <Link href="/projects" className="text-sm text-ink-600 hover:underline">
          Перейти к проектам →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-700">Разобрать через ИИ</h1>
        <Link href="/diary/add" className="text-sm text-ink-600 hover:underline">
          ← Одна правка вручную
        </Link>
      </div>
      <BulkAddForm projects={projects} />
    </div>
  );
}
