/** Shared utility functions for Fitness Room frontend. */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/** Merge Tailwind CSS classes safely (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format an ISO date string as a human-readable Spanish date. */
export function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), "d 'de' MMMM yyyy", { locale: es });
}

/** Format an ISO date string as a short date (e.g. "15 Jun 2026"). */
export function formatShortDate(isoDate: string): string {
  return format(parseISO(isoDate), "d MMM yyyy", { locale: es });
}

/** Format a time string (HH:MM:SS) as HH:MM. */
export function formatTime(timeStr: string): string {
  return timeStr.substring(0, 5);
}

/** Format a currency value in MXN. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

/** Return initials from a full name (up to 2 chars). */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/** Return true if the ISO date string is in the past. */
export function isPast(isoDate: string): boolean {
  return parseISO(isoDate) < new Date();
}

/** Return true if the ISO date string is today. */
export function isToday(isoDate: string): boolean {
  const date = parseISO(isoDate);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}
