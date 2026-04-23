/** Phone utilities — country codes, validation, formatting. */

export interface CountryCode {
  code: string;
  dial: string;
  flag: string;
  name: string;
  digits: number;
  format: (d: string) => string;
}

const fmt2_4_4 = (d: string): string => {
  if (d.length <= 2) return d;
  if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6, 10)}`;
};

const fmt3_3_4 = (d: string): string => {
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)}`;
};

const fmt3_4_4 = (d: string): string => {
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7, 11)}`;
};

export const COUNTRIES: CountryCode[] = [
  { code: "MX", dial: "+52", flag: "🇲🇽", name: "México", digits: 10, format: fmt2_4_4 },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "Estados Unidos", digits: 10, format: fmt3_3_4 },
  { code: "CO", dial: "+57", flag: "🇨🇴", name: "Colombia", digits: 10, format: fmt3_3_4 },
  { code: "AR", dial: "+54", flag: "🇦🇷", name: "Argentina", digits: 10, format: fmt2_4_4 },
  { code: "ES", dial: "+34", flag: "🇪🇸", name: "España", digits: 9, format: fmt3_3_4 },
  { code: "CL", dial: "+56", flag: "🇨🇱", name: "Chile", digits: 9, format: fmt3_3_4 },
  { code: "PE", dial: "+51", flag: "🇵🇪", name: "Perú", digits: 9, format: fmt3_3_4 },
  { code: "BR", dial: "+55", flag: "🇧🇷", name: "Brasil", digits: 11, format: fmt3_4_4 },
  { code: "EC", dial: "+593", flag: "🇪🇨", name: "Ecuador", digits: 9, format: fmt3_3_4 },
  { code: "GT", dial: "+502", flag: "🇬🇹", name: "Guatemala", digits: 8, format: fmt3_3_4 },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // México

/**
 * Normalize a raw phone input to E.164 format.
 * Returns `+{dial}{digits}` or the raw string if it can't normalize.
 */
export function normalizePhone(raw: string, country: CountryCode): string {
  const digits = raw.replace(/\D/g, "");
  const dialDigits = country.dial.replace("+", "");

  if (digits.length === country.digits) {
    return `${country.dial}${digits}`;
  }
  if (digits.startsWith(dialDigits) && digits.length === dialDigits.length + country.digits) {
    return `+${digits}`;
  }
  if (raw.startsWith("+")) return raw.replace(/[^\d+]/g, "");
  return raw;
}

/**
 * Validate a phone in E.164 format for a given country.
 */
export function validatePhone(e164: string, country: CountryCode): boolean {
  const dialDigits = country.dial.replace("+", "");
  const re = new RegExp(`^\\+${dialDigits}\\d{${country.digits}}$`);
  return re.test(e164);
}

/**
 * Format digits for display using the country's format function.
 */
export function formatPhoneDisplay(raw: string, country: CountryCode): string {
  const digits = raw.replace(/\D/g, "");
  const dialDigits = country.dial.replace("+", "");
  const local = digits.startsWith(dialDigits) ? digits.slice(dialDigits.length) : digits;
  return country.format(local);
}

/**
 * Detect country from an E.164 phone string. Defaults to MX.
 */
export function detectCountry(e164: string): CountryCode {
  if (!e164 || !e164.startsWith("+")) return DEFAULT_COUNTRY;
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (e164.startsWith(c.dial)) return c;
  }
  return DEFAULT_COUNTRY;
}

/** E.164 general regex: + followed by 7-15 digits. */
export const E164_REGEX = /^\+\d{7,15}$/;

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
