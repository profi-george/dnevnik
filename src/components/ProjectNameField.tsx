import { renameProject } from "@/app/actions";
import { COPY } from "@/lib/microcopy";

export default function ProjectNameField({ id, name }: { id: string; name: string }) {
  return (
    <form action={renameProject} className="group flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        type="text"
        name="name"
        defaultValue={name}
        aria-label={COPY.fields.projectName.label}
        className="field w-auto min-w-0 flex-1 border-transparent bg-transparent px-1 py-0 text-lg font-semibold tracking-tight text-fg hover:border-line focus:border-line"
      />
      <button
        type="submit"
        className="btn btn-ghost btn-sm shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {COPY.cta.saveName}
      </button>
    </form>
  );
}
