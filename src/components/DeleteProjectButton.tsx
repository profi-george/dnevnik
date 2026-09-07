"use client";

import { COPY } from "@/lib/microcopy";
import { IconTrash } from "@/components/icons";

type Props = {
  projectName: string;
  actionsCount: number;
};

export default function DeleteProjectButton({ projectName, actionsCount }: Props) {
  return (
    <button
      type="submit"
      title={COPY.tooltips.deleteProject}
      aria-label={COPY.cta.deleteProject}
      onClick={(e) => {
        const confirmed = window.confirm(
          `${COPY.success.confirmDeleteProjectTitle(projectName)}\n\n${COPY.success.confirmDeleteProjectBody(actionsCount)}`,
        );
        if (!confirmed) e.preventDefault();
      }}
      className="btn-icon btn-icon-danger opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
    >
      <IconTrash className="h-3.5 w-3.5" />
    </button>
  );
}
