"use client";

import { COPY } from "@/lib/microcopy";

export default function DeleteActionButton() {
  return (
    <button
      type="submit"
      title={COPY.success.confirmDeleteActionCta}
      onClick={(e) => {
        if (!window.confirm(COPY.success.confirmDeleteAction)) e.preventDefault();
      }}
      className="text-neutral-300 hover:text-red-600"
    >
      ✕
    </button>
  );
}
