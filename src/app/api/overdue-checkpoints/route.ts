import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfToday } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Публичный, только для чтения — отдаёт исключительно число просроченных
// проверок, без клиентских данных. Нужен ПД-ИД, чтобы показывать это число
// как задачу в личном плане дня (см. интеграцию "Записать в Дневник").
// Инструмент однопользовательский и без входа, поэтому отдельная авторизация
// здесь не добавляет реальной защиты — риск ограничен утечкой одного числа.
export async function GET() {
  const count = await prisma.checkpoint.count({
    where: { status: "PENDING", plannedDate: { lt: startOfToday() } },
  });
  return NextResponse.json({ overdueCount: count });
}
