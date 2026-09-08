"use client";

import { useTransition } from "react";
import { deleteProjectGoal } from "@/app/actions";
import { IconTrash } from "@/components/icons";

export default function GoalDeleteButton({ id, projectId }: { id: string; projectId: string }) {
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(() => {
          deleteProjectGoal(id, projectId);
        })
      }
      title="Удалить цель"
      aria-label="Удалить цель"
      className="btn-icon btn-icon-danger"
    >
      <IconTrash className="h-3.5 w-3.5" />
    </button>
  );
}
