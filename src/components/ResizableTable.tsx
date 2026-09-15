"use client";

import { useEffect, useRef, useState } from "react";

export type ResizableColumn = {
  key: string;
  label: React.ReactNode;
  width: number;
  minWidth?: number;
  title?: string;
  hiddenLabel?: boolean;
};

type Props = {
  storageKey: string;
  columns: ResizableColumn[];
  children: React.ReactNode;
};

const DEFAULT_MIN_WIDTH = 60;

export default function ResizableTable({ storageKey, columns, children }: Props) {
  const [widths, setWidths] = useState(() => columns.map((c) => c.width));
  // Индекс резака, за который сейчас тянут — нужен только для подсветки:
  // курсор уходит далеко за пределы заголовка, а линия должна оставаться активной.
  const [dragging, setDragging] = useState<number | null>(null);
  const dragRef = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  // Сохранённые ширины читаем только после монтирования — на сервере localStorage нет,
  // а значения по умолчанию должны совпасть при гидратации, чтобы не было дёрганья.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as number[];
      if (Array.isArray(parsed) && parsed.length === columns.length) {
        setWidths(parsed);
      }
    } catch {
      // повреждённое значение в localStorage — остаёмся на ширинах по умолчанию
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = e.clientX - drag.startX;
      const min = columns[drag.index].minWidth ?? DEFAULT_MIN_WIDTH;
      const next = Math.max(min, Math.round(drag.startWidth + delta));
      setWidths((prev) => {
        if (prev[drag.index] === next) return prev;
        const updated = [...prev];
        updated[drag.index] = next;
        return updated;
      });
    }
    function handleUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      setDragging(null);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      setWidths((current) => {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(current));
        } catch {
          // приватный режим или заполненное хранилище — переживём без сохранения
        }
        return current;
      });
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function startDrag(index: number, e: React.PointerEvent) {
    e.preventDefault();
    dragRef.current = { index, startX: e.clientX, startWidth: widths[index] };
    setDragging(index);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  // Клавиатурная альтернатива перетаскиванию (WCAG 2.5.7): стрелки на сфокусированном
  // разделителе меняют ширину с тем же шагом и минимумом, что и мышь.
  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 10 : -10;
    const min = columns[index].minWidth ?? DEFAULT_MIN_WIDTH;
    setWidths((prev) => {
      const next = Math.max(min, prev[index] + step);
      if (next === prev[index]) return prev;
      const updated = [...prev];
      updated[index] = next;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // приватный режим или заполненное хранилище — переживём без сохранения
      }
      return updated;
    });
  }

  const totalWidth = widths.reduce((sum, w) => sum + w, 0);

  return (
    <table className="tbl table-fixed" style={{ width: totalWidth }}>
      <colgroup>
        {widths.map((w, i) => (
          <col key={columns[i].key} style={{ width: w }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th
              key={c.key}
              // Подпись обрезается многоточием, поэтому полное название нужно
              // держать в подсказке — иначе узкая колонка становится безымянной.
              title={c.title ?? (typeof c.label === "string" ? c.label : undefined)}
              className="th-resizable"
            >
              {c.hiddenLabel ? (
                <span className="sr-only">{c.label}</span>
              ) : (
                <span className="block truncate">{c.label}</span>
              )}
              {i < columns.length - 1 && (
                <div
                  onPointerDown={(e) => startDrag(i, e)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Ширина колонки «${typeof c.label === "string" ? c.label : c.key}»`}
                  aria-valuenow={widths[i]}
                  aria-valuemin={columns[i].minWidth ?? DEFAULT_MIN_WIDTH}
                  tabIndex={0}
                  data-dragging={dragging === i ? "true" : undefined}
                  title="Потяните мышью или используйте стрелки влево/вправо"
                  className="col-resizer"
                />
              )}
            </th>
          ))}
        </tr>
      </thead>
      {children}
    </table>
  );
}
