import { prisma } from "@/lib/prisma";
import { COPY } from "@/lib/microcopy";
import NotesBoard from "@/components/NotesBoard";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const [notes, projects] = await Promise.all([
    prisma.note.findMany({
      orderBy: { updatedAt: "desc" },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.project.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-lg font-semibold tracking-tight text-fg">{COPY.nav.notes}</h1>
        <span className="text-13 tabular-nums text-fg-subtle">{notes.length}</span>
      </div>
      <NotesBoard notes={notes} projects={projects} />
    </div>
  );
}
