import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateRu } from "@/lib/dates";
import { IconArrowRight, IconSearch } from "@/components/icons";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

type ResultGroup = {
  title: string;
  items: { key: string; href: string; primary: string; secondary?: string }[];
};

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const needle = query.toLowerCase();

  let groups: ResultGroup[] = [];

  if (needle) {
    const [projects, actions, notes, risks, links, planItems] = await Promise.all([
      prisma.project.findMany({ select: { id: true, name: true } }),
      prisma.action.findMany({ include: { project: true }, orderBy: { date: "desc" } }),
      prisma.note.findMany({
        orderBy: { updatedAt: "desc" },
        include: { project: { select: { name: true } } },
      }),
      prisma.projectRisk.findMany({ include: { project: true }, orderBy: { order: "desc" } }),
      prisma.projectLink.findMany({ include: { project: true }, orderBy: { order: "desc" } }),
      prisma.projectPlanItem.findMany({ include: { project: true }, orderBy: { createdAt: "desc" } }),
    ]);

    // SQLite не умеет регистронезависимый contains через Prisma — фильтруем в памяти
    // (тот же приём, что и в поиске /diary).
    groups = [
      {
        title: "Проекты",
        items: projects
          .filter((p) => p.name.toLowerCase().includes(needle))
          .map((p) => ({ key: p.id, href: `/projects/${p.id}`, primary: p.name })),
      },
      {
        title: "Правки",
        items: actions
          .filter(
            (a) => a.place.toLowerCase().includes(needle) || a.description.toLowerCase().includes(needle),
          )
          .slice(0, 20)
          .map((a) => ({
            key: a.id,
            href: `/diary?q=${encodeURIComponent(query)}&projectId=${a.projectId}`,
            primary: a.description,
            secondary: `${a.project.name} · ${a.place} · ${formatDateRu(a.date)}`,
          })),
      },
      {
        title: "Заметки",
        items: notes
          .filter(
            (n) => (n.title ?? "").toLowerCase().includes(needle) || n.text.toLowerCase().includes(needle),
          )
          .slice(0, 20)
          .map((n) => ({
            key: n.id,
            href: `/notes?q=${encodeURIComponent(query)}`,
            primary: n.title || n.text.slice(0, 60),
            secondary: [n.project?.name, n.title ? n.text.slice(0, 80) : null].filter(Boolean).join(" · ") || undefined,
          })),
      },
      {
        title: "Риски",
        items: risks
          .filter((r) => r.risk.toLowerCase().includes(needle))
          .slice(0, 20)
          .map((r) => ({
            key: r.id,
            href: `/projects/${r.projectId}?tab=risks`,
            primary: r.risk,
            secondary: r.project.name,
          })),
      },
      {
        title: "Важные ссылки",
        items: links
          .filter((l) => l.label.toLowerCase().includes(needle))
          .slice(0, 20)
          .map((l) => ({
            key: l.id,
            href: `/projects/${l.projectId}?tab=links`,
            primary: l.label,
            secondary: l.project.name,
          })),
      },
      {
        title: "План",
        items: planItems
          .filter((p) => p.text.toLowerCase().includes(needle))
          .slice(0, 20)
          .map((p) => ({
            key: p.id,
            href: `/projects/${p.projectId}?tab=plan`,
            primary: p.text,
            secondary: p.project.name,
          })),
      },
    ].filter((g) => g.items.length > 0);
  }

  const totalCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-lg font-semibold tracking-tight text-fg">Поиск по всему</h1>

      <form className="relative">
        <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
        <input
          type="text"
          name="q"
          defaultValue={query}
          autoFocus
          placeholder="Проекты, правки, заметки, риски, ссылки, план…"
          className="field pl-8"
        />
      </form>

      {!needle && (
        <p className="hint">
          Ищет сразу по проектам, правкам в дневнике, заметкам, рискам, важным ссылкам и плану —
          не нужно вспоминать, куда именно записывали.
        </p>
      )}

      {needle && totalCount === 0 && (
        <div className="card px-6 py-14">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
            <p className="text-base font-medium text-fg">Ничего не нашлось</p>
            <p className="text-13 leading-relaxed text-fg-muted">
              Проверьте написание или попробуйте часть слова.
            </p>
          </div>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.title} className="card flex flex-col gap-1 p-3">
          <h2 className="micro px-1.5">
            {group.title} <span className="count">{group.items.length}</span>
          </h2>
          <ul className="flex flex-col divide-y divide-line-soft">
            {group.items.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-2 rounded px-1.5 py-2 hover:bg-hover-soft"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-13 text-fg">{item.primary}</p>
                    {item.secondary && (
                      <p className="truncate text-2xs text-fg-subtle">{item.secondary}</p>
                    )}
                  </div>
                  <IconArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
