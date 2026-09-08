"use client";

import { createContext, useContext, useState } from "react";

const ProjectEditContext = createContext<{ editing: boolean; setEditing: (v: boolean) => void } | null>(
  null,
);

export function ProjectEditProvider({ children }: { children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  return (
    <ProjectEditContext.Provider value={{ editing, setEditing }}>{children}</ProjectEditContext.Provider>
  );
}

// Единый режим редактирования карточки проекта — включается одним карандашиком в шапке,
// все секции (вводные, ссылки, разделы, карта целей) читают его отсюда вместо своего.
export function useProjectEditing(): boolean {
  const ctx = useContext(ProjectEditContext);
  if (!ctx) throw new Error("useProjectEditing must be used within ProjectEditProvider");
  return ctx.editing;
}

export function useProjectEditToggle() {
  const ctx = useContext(ProjectEditContext);
  if (!ctx) throw new Error("useProjectEditToggle must be used within ProjectEditProvider");
  return ctx;
}
