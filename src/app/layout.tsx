import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Дневник ведения",
  description: "Дневник фиксации правок в рекламных кампаниях и контроля результатов",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}
