"use client";

import { useTransition } from "react";
import { deleteProjectRisk } from "@/app/actions";
import { IconTrash } from "@/components/icons";

export default function RiskDeleteButton({ id, projectId }: { id: string; projectId: string }) {
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(() => {
          deleteProjectRisk(id, projectId);
        })
      }
      title="Удалить риск"
      aria-label="Удалить риск"
      className="btn-icon btn-icon-danger"
    >
      <IconTrash className="h-3.5 w-3.5" />
    </button>
  );
}
