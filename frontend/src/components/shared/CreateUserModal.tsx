/** Modal for creating new Cognito users. */

import { useState } from "react";
import { Dialog } from "./Dialog";
import { useCreateUser } from "@/hooks/useUsers";
import { EMAIL_REGEX } from "@/lib/phone";
import { CREATE_USER_GROUP_OPTIONS, type UserGroup } from "@/lib/userGroups";
import type { CreateUserRequest } from "@/services/userService";

const inputCls =
  "w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateUserModal({ open, onClose }: CreateUserModalProps): React.JSX.Element {
  const [form, setForm] = useState<CreateUserRequest>({
    email: "",
    name: "",
    group: "staff",
  });
  const { mutate, isPending } = useCreateUser();

  const emailError = form.email && !EMAIL_REGEX.test(form.email) ? "Email inválido" : "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (emailError) return;
    mutate(form, {
      onSuccess: () => {
        setForm({ email: "", name: "", group: "staff" });
        onClose();
      },
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nuevo Usuario" description="Crea un usuario con acceso al sistema">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">Nombre completo *</label>
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
            placeholder="Juan Pérez"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">Correo electrónico *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
            placeholder="juan@ejemplo.com"
            className={`${inputCls} ${emailError ? "border-red-500" : ""}`}
          />
          {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">Rol *</label>
          <select
            value={form.group}
            onChange={(e) => setForm((p) => ({ ...p, group: e.target.value as UserGroup }))}
            className={inputCls}
          >
            {CREATE_USER_GROUP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-[--tx-disabled]">
            Se enviará un correo con las credenciales temporales al usuario.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[--bd-default] px-5 py-2.5 text-sm font-medium text-[--tx-muted] transition-colors hover:text-[--tx-primary]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
            }}
          >
            {isPending ? "Creando..." : "Crear Usuario"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
