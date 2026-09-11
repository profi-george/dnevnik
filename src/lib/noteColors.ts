// Палитра фонов карточек заметок — единственное место, где перечислены цвета
// (см. соответствующие --color-note-* токены в globals.css).
export const NOTE_COLORS = [
  { key: "default", label: "Без цвета", className: "bg-surface" },
  { key: "yellow", label: "Жёлтый", className: "bg-note-yellow" },
  { key: "green", label: "Зелёный", className: "bg-note-green" },
  { key: "blue", label: "Синий", className: "bg-note-blue" },
  { key: "rose", label: "Розовый", className: "bg-note-rose" },
  { key: "purple", label: "Фиолетовый", className: "bg-note-purple" },
] as const;

export type NoteColorKey = (typeof NOTE_COLORS)[number]["key"];

export function noteColorClassName(key: string): string {
  return NOTE_COLORS.find((c) => c.key === key)?.className ?? "bg-surface";
}
