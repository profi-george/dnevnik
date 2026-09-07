"use client";

import { COPY } from "@/lib/microcopy";
import { IconTrash } from "@/components/icons";

export default function DeleteActionButton() {
  return (
    <button
      type="submit"
      title={COPY.success.confirmDeleteActionCta}
      aria-label={COPY.success.confirmDeleteActionCta}
      onClick={(e) => {
        if (!window.confirm(COPY.success.confirmDeleteAction)) e.preventDefault();
      }}
      // Появляется при наведении на строку — в состоянии покоя таблица чистая,
      // место под кнопку зарезервировано, поэтому строки не «прыгают».
      className="btn-icon btn-icon-danger opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
    >
      <IconTrash className="h-3.5 w-3.5" />
    </button>
  );
}
