import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter: латиница + кириллица, переменное начертание.
// Табличные цифры включены глобально в globals.css — даты в таблице не «прыгают».
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Дневник ведения",
  description: "Дневник фиксации правок в рекламных кампаниях и контроля результатов",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
