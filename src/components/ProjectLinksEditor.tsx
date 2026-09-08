import { createProjectLink, deleteProjectLink } from "@/app/actions";
import { COPY } from "@/lib/microcopy";
import { IconExternal, IconPlus, IconTrash } from "@/components/icons";

type Link = { id: string; label: string; url: string };

export default function ProjectLinksEditor({
  projectId,
  links,
}: {
  projectId: string;
  links: Link[];
}) {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <h2 className="text-base font-semibold tracking-tight text-fg">Важные ссылки</h2>

      {links.length > 0 && (
        <ul className="flex flex-col divide-y divide-line-soft">
          {links.map((link) => (
            <li key={link.id} className="group flex items-center gap-2 py-2">
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="link inline-flex min-w-0 flex-1 items-center gap-1.5 text-13"
              >
                <IconExternal className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{link.label}</span>
              </a>
              <form action={deleteProjectLink}>
                <input type="hidden" name="id" value={link.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <button
                  type="submit"
                  title="Удалить ссылку"
                  aria-label="Удалить ссылку"
                  className="btn-icon btn-icon-danger opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={createProjectLink} className="flex flex-wrap items-end gap-2 border-t border-line-soft pt-3">
        <input type="hidden" name="projectId" value={projectId} />
        <label className="flex flex-1 basis-40 flex-col gap-1">
          <span className="micro">Название</span>
          <input type="text" name="label" required placeholder="Клиентский отчёт" className="field" />
        </label>
        <label className="flex flex-1 basis-56 flex-col gap-1">
          <span className="micro">Ссылка</span>
          <input type="url" name="url" required placeholder="https://…" className="field" />
        </label>
        <button type="submit" className="btn btn-secondary shrink-0">
          <IconPlus className="h-3.5 w-3.5" />
          {COPY.cta.addLink}
        </button>
      </form>
    </div>
  );
}
