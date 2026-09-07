import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { startOfToday } from "@/lib/dates";
import { COPY } from "@/lib/microcopy";
import AppNav from "@/components/AppNav";
import { IconPlus } from "@/components/icons";

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
      {/* Шапка липкая: инструмент открыт весь день, навигация должна быть под рукой.
          Её высота (--header-h) задаёт точку прилипания шапки таблицы дневника. */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-6 border-b border-line bg-surface px-4"
        style={{ height: "var(--header-h)" }}
      >
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/diary" className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden
              className="flex h-6 w-6 items-center justify-center rounded-md bg-ink-600 text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" focusable="false">
                <path
                  d="m5 12.5 4.5 4.5L19 7"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="hidden text-13 font-semibold tracking-tight text-fg sm:block">
              {COPY.brand}
            </span>
          </Link>
          <AppNav items={nav} />
        </div>

        <Link href="/diary/bulk" className="btn btn-primary shrink-0">
          <IconPlus className="h-3.5 w-3.5" />
          {COPY.cta.addActionShort}
        </Link>
      </header>

      <main className="w-full flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
