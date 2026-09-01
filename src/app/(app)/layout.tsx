import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { startOfToday } from "@/lib/dates";
import { COPY } from "@/lib/microcopy";

// Личные данные меняются каждую минуту — незачем и нельзя кэшировать эти страницы
// при сборке (на Vercel билд-машина ещё не видит боевую базу так, как рантайм).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const dueCount = await prisma.checkpoint.count({
    where: { status: "PENDING", plannedDate: { lte: startOfToday() } },
  });

  const nav = [
    { href: "/diary", label: COPY.nav.diary },
    { href: "/today", label: COPY.nav.today, count: dueCount },
    { href: "/projects", label: COPY.nav.projects },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="flex items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-ink-700">{COPY.brand}</span>
            <nav className="flex gap-4 text-sm">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 text-neutral-600 hover:text-ink-600"
                >
                  {item.label}
                  {!!item.count && (
                    <span
                      title={`Проверок ждёт результата: ${item.count}`}
                      className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-medium text-white"
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
          <Link
            href="/diary/add"
            className="rounded bg-ink-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-ink-700"
          >
            {COPY.cta.addActionShort}
          </Link>
        </div>
      </header>
      <main className="w-full flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
