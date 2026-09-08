"use client";

import { useState } from "react";
import { ProjectEditProvider, useProjectEditToggle } from "@/components/ProjectEditContext";
import { IconCheck, IconPencil } from "@/components/icons";

type Tab = { id: string; label: string; content: React.ReactNode };

function EditToggle() {
  const { editing, setEditing } = useProjectEditToggle();
  return (
    <button
      type="button"
      onClick={() => setEditing(!editing)}
      title={editing ? "Готово" : "Редактировать карточку"}
      aria-label={editing ? "Готово" : "Редактировать карточку"}
      aria-pressed={editing}
      className={`btn-icon h-8 w-8 shrink-0 ${editing ? "border border-ink-500/40 bg-ink-50 text-ink-600" : ""}`}
    >
      {editing ? <IconCheck className="h-4 w-4" /> : <IconPencil className="h-4 w-4" />}
    </button>
  );
}

function TabBar({ tabs, active, onSelect }: { tabs: Tab[]; active: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-line bg-subtle p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          aria-current={active === tab.id ? "page" : undefined}
          className={`shrink-0 rounded-md px-3 py-1.5 text-13 font-medium transition-colors ${
            active === tab.id
              ? "bg-surface text-fg shadow-sm"
              : "text-fg-muted hover:bg-hover hover:text-fg"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function ProjectTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <ProjectEditProvider>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <EditToggle />
          <TabBar tabs={tabs} active={active} onSelect={setActive} />
        </div>
        {tabs.map((tab) => (
          <div key={tab.id} hidden={active !== tab.id} className="flex flex-col gap-4">
            {tab.content}
          </div>
        ))}
      </div>
    </ProjectEditProvider>
  );
}
