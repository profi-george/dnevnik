"use client";

import { COPY } from "@/lib/microcopy";

type Props = {
  projectName: string;
  actionsCount: number;
};

export default function DeleteProjectButton({ projectName, actionsCount }: Props) {
  return (
    <button
      type="submit"
      title={COPY.tooltips.deleteProject}
      onClick={(e) => {
        const confirmed = window.confirm(
          `${COPY.success.confirmDeleteProjectTitle(projectName)}\n\n${COPY.success.confirmDeleteProjectBody(actionsCount)}`,
        );
        if (!confirmed) e.preventDefault();
      }}
      className="text-xs text-red-500 hover:text-red-700"
    >
      {COPY.cta.deleteProject}
    </button>
  );
}
