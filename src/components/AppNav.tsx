"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; count?: number };

/**
 * Сегментированные вкладки шапки. Клиентский компонент нужен только ради
 * подсветки активного раздела — раньше активной вкладки не было видно вовсе.
 */
export default function AppNav({ items }: { items: Item[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 rounded-lg border border-line-soft bg-subtle p-0.5">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-13 font-medium transition-colors ${
              active
                ? "bg-surface text-fg shadow-card"
                : "text-fg-muted hover:bg-hover hover:text-fg"
            }`}
          >
            {item.label}
            {!!item.count && (
              <span
                title={`Проверок ждёт результата: ${item.count}`}
                className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-2xs font-semibold tabular-nums text-white"
              >
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
