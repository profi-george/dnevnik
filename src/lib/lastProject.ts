const KEY = "dnevnik-last-project-id";

// Раньше формы добавления правки по умолчанию выбирали жёстко зашитый проект
// (было — "Gclinic"). При нескольких активных проектах это молча подставляло
// не тот проект. Вместо этого запоминаем последний выбранный — тот, с которым
// реально работали, а не первый по алфавиту.
export function getLastProjectId(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastProjectId(id: string): void {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // приватный режим или заполненное хранилище — переживём без сохранения
  }
}
