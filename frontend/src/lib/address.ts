/** Address utilities — structured address model + MX states dictionary. */

export interface StructuredAddress {
  street: string;
  ext_number: string;
  int_number?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

export const EMPTY_ADDRESS: StructuredAddress = {
  street: "",
  ext_number: "",
  int_number: "",
  neighborhood: "",
  city: "",
  state: "",
  zip_code: "",
  country: "MX",
};

export const MX_STATES: string[] = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de México",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
];

/** Format a structured address into a single line. */
export function formatAddress(a: StructuredAddress): string {
  const parts: string[] = [];
  if (a.street) {
    let line = a.street;
    if (a.ext_number) line += ` #${a.ext_number}`;
    if (a.int_number) line += ` Int. ${a.int_number}`;
    parts.push(line);
  }
  if (a.neighborhood) parts.push(`Col. ${a.neighborhood}`);
  if (a.city) parts.push(a.city);
  if (a.state) parts.push(a.state);
  if (a.zip_code) parts.push(`C.P. ${a.zip_code}`);
  return parts.join(", ");
}

/** Parse a flat address string into structured format (best-effort). */
export function parseAddress(flat: string): StructuredAddress {
  return {
    ...EMPTY_ADDRESS,
    street: flat,
  };
}
