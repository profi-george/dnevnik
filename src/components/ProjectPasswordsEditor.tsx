"use client";

import { createProjectPassword } from "@/app/actions";
import { COPY } from "@/lib/microcopy";
import { useProjectEditing } from "@/components/ProjectEditContext";
import PasswordRow from "@/components/PasswordRow";
import { IconPlus } from "@/components/icons";

type Password = { id: string; label: string; value: string };

const F = COPY.passwordFields;

export default function ProjectPasswordsEditor({
  projectId,
  passwords,
}: {
  projectId: string;
  passwords: Password[];
}) {
  const editing = useProjectEditing();

  return (
    <div className="card flex flex-col gap-3 p-5">
      <h2 className="text-base font-semibold tracking-tight text-fg">Пароли</h2>

      {passwords.length > 0 && (
        <ul className="flex flex-col divide-y divide-line-soft">
          {passwords.map((p) => (
            <li key={p.id}>
              <PasswordRow id={p.id} projectId={projectId} label={p.label} value={p.value} />
            </li>
          ))}
        </ul>
      )}

      {passwords.length === 0 && !editing && <p className="text-13 text-fg-subtle">—</p>}

      {editing && (
        <form
          action={createProjectPassword}
          className="flex flex-wrap items-end gap-2 border-t border-line-soft pt-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <label className="flex flex-1 basis-40 flex-col gap-1">
            <span className="micro">{F.label.label}</span>
            <input type="text" name="label" required placeholder={F.label.placeholder} className="field" />
          </label>
          <label className="flex flex-1 basis-56 flex-col gap-1">
            <span className="micro">{F.value.label}</span>
            <input type="text" name="value" required placeholder={F.value.placeholder} className="field" />
          </label>
          <button type="submit" className="btn btn-secondary shrink-0">
            <IconPlus className="h-3.5 w-3.5" />
            {COPY.cta.addPassword}
          </button>
        </form>
      )}
    </div>
  );
}
