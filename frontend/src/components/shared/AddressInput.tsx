/** Structured address input with MX states dictionary. */

import { MX_STATES, type StructuredAddress } from "@/lib/address";

interface AddressInputProps {
  value: StructuredAddress;
  onChange: (address: StructuredAddress) => void;
}

const inputCls =
  "w-full rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] transition-all focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold]/20";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[--tx-primary]">
        {label}
      </label>
      {children}
    </div>
  );
}

export function AddressInput({
  value,
  onChange,
}: AddressInputProps): React.JSX.Element {
  function handleChange(field: keyof StructuredAddress, v: string): void {
    onChange({ ...value, [field]: v });
  }

  return (
    <div className="space-y-3">
      <Field label="Calle">
        <input
          value={value.street}
          onChange={(e) => handleChange("street", e.target.value)}
          placeholder="Av. Reforma"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="# Exterior">
          <input
            value={value.ext_number}
            onChange={(e) => handleChange("ext_number", e.target.value)}
            placeholder="123"
            className={inputCls}
          />
        </Field>
        <Field label="# Interior">
          <input
            value={value.int_number ?? ""}
            onChange={(e) => handleChange("int_number", e.target.value)}
            placeholder="4B"
            className={inputCls}
          />
        </Field>
        <Field label="C.P.">
          <input
            value={value.zip_code}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 5);
              handleChange("zip_code", digits);
            }}
            placeholder="06600"
            inputMode="numeric"
            maxLength={5}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Colonia">
          <input
            value={value.neighborhood}
            onChange={(e) => handleChange("neighborhood", e.target.value)}
            placeholder="Juárez"
            className={inputCls}
          />
        </Field>
        <Field label="Ciudad">
          <input
            value={value.city}
            onChange={(e) => handleChange("city", e.target.value)}
            placeholder="Ciudad de México"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Estado">
        <select
          value={value.state}
          onChange={(e) => handleChange("state", e.target.value)}
          className={inputCls}
        >
          <option value="">— Selecciona estado —</option>
          {MX_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
