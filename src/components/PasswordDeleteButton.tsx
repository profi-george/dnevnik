"use client";

import { useTransition } from "react";
import { deleteProjectPassword } from "@/app/actions";
import { IconTrash } from "@/components/icons";

export default function PasswordDeleteButton({ id, projectId }: { id: string; projectId: string }) {
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(() => {
          deleteProjectPassword(id, projectId);
        })
      }
      title="Удалить"
      aria-label="Удалить"
      className="btn-icon btn-icon-danger shrink-0"
    >
      <IconTrash className="h-3.5 w-3.5" />
    </button>
  );
}
