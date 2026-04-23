/** Reusable phone input with country code selector. */

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  detectCountry,
  formatPhoneDisplay,
  normalizePhone,
  validatePhone,
  type CountryCode,
} from "@/lib/phone";

interface PhoneInputProps {
  value: string;
  onChange: (e164: string, raw: string, country: CountryCode) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
}

const inputCls =
  "w-full rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] transition-all focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold]/20";

export function PhoneInput({
  value,
  onChange,
  label,
  required,
  placeholder,
  className = "",
  error: externalError,
}: PhoneInputProps): React.JSX.Element {
  const [country, setCountry] = useState<CountryCode>(() =>
    value ? detectCountry(value) : DEFAULT_COUNTRY
  );
  const [raw, setRaw] = useState(() => {
    if (!value) return "";
    const dialDigits = country.dial.replace("+", "");
    const digits = value.replace(/\D/g, "");
    return digits.startsWith(dialDigits) ? digits.slice(dialDigits.length) : digits;
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  // Sync external value changes
  useEffect(() => {
    if (!value) {
      setRaw("");
      return;
    }
    const detected = detectCountry(value);
    setCountry(detected);
    const dialDigits = detected.dial.replace("+", "");
    const digits = value.replace(/\D/g, "");
    setRaw(digits.startsWith(dialDigits) ? digits.slice(dialDigits.length) : digits);
  }, [value]);

  const handleRawChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const cleaned = e.target.value.replace(/[^\d\s\-().]/g, "");
      setRaw(cleaned);
      const e164 = normalizePhone(cleaned, country);
      onChange(e164, cleaned, country);
    },
    [country, onChange]
  );

  const handleCountrySelect = useCallback(
    (c: CountryCode) => {
      setCountry(c);
      setDropdownOpen(false);
      const e164 = normalizePhone(raw, c);
      onChange(e164, raw, c);
    },
    [raw, onChange]
  );

  const digits = raw.replace(/\D/g, "");
  const e164 = normalizePhone(raw, country);
  const isValid = !raw || validatePhone(e164, country);
  const phoneError =
    externalError ||
    (raw && !isValid ? `Formato: ${country.digits} dígitos` : "");

  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-[--tx-primary]">
          {label}
          {required && " *"}
        </label>
      )}
      <div className="flex gap-2">
        {/* Country selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex h-full items-center gap-1 rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-3 text-sm transition-all hover:border-[--gold] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold]/20"
          >
            <span className="text-base">{country.flag}</span>
            <span className="text-[--tx-muted]">{country.dial}</span>
            <ChevronDown className="h-3 w-3 text-[--tx-disabled]" />
          </button>
          {dropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-56 overflow-y-auto rounded-xl border border-[--bd-default] bg-[--bg-elevated] shadow-xl">
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-[--bg-muted] ${
                    c.code === country.code ? "bg-[--gold-bg] text-[--gold]" : "text-[--tx-primary]"
                  }`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 text-left">{c.name}</span>
                  <span className="text-[--tx-disabled]">{c.dial}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phone number input */}
        <input
          type="tel"
          value={raw}
          onChange={handleRawChange}
          placeholder={placeholder ?? `${"0".repeat(country.digits)}`}
          inputMode="tel"
          maxLength={country.digits + 5}
          required={required}
          className={`${inputCls} flex-1 ${phoneError ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : ""}`}
        />
      </div>
      {phoneError ? (
        <p className="mt-1 text-xs text-red-400">{phoneError}</p>
      ) : raw && digits.length > 0 ? (
        <p className="mt-1 text-xs text-emerald-400">
          {country.dial} {formatPhoneDisplay(raw, country)}
        </p>
      ) : (
        <p className="mt-1 text-xs text-[--tx-disabled]">
          Se agregará {country.dial} automáticamente
        </p>
      )}
    </div>
  );
}
