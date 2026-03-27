/**
 * Theme configuration for Fitness Room System.
 *
 * All brand colors, fonts, and visual identity settings live here.
 * Change these values to re-brand the application for a different studio.
 *
 * CSS variables are applied in src/index.css and consumed via Tailwind classes.
 */

export interface ThemeConfig {
  /** Studio display name shown in the sidebar and browser title */
  studioName: string;
  /** Path to the logo image (relative to /public) */
  logoPath: string;
  /** Primary brand color (hex) */
  primaryColor: string;
  /** Primary foreground (text on primary) */
  primaryForeground: string;
  /** Accent color for highlights and active states */
  accentColor: string;
  /** Background color */
  backgroundColor: string;
  /** Card/surface background */
  cardColor: string;
  /** Default border radius multiplier */
  borderRadius: "none" | "sm" | "md" | "lg" | "full";
  /** Font family */
  fontFamily: string;
}

export const defaultTheme: ThemeConfig = {
  studioName: import.meta.env.VITE_APP_NAME ?? "Fitness Room",
  logoPath: "/logo.svg",
  primaryColor: "#6d28d9",
  primaryForeground: "#ffffff",
  accentColor: "#a855f7",
  backgroundColor: "#09090b",
  cardColor: "#18181b",
  borderRadius: "lg",
  fontFamily: "'Inter', 'system-ui', sans-serif",
};

/**
 * Apply theme CSS variables to the document root.
 * Call this on app initialization and whenever the theme changes.
 */
export function applyTheme(theme: Partial<ThemeConfig> = {}): void {
  const merged: ThemeConfig = { ...defaultTheme, ...theme };
  const root = document.documentElement;

  root.style.setProperty("--color-primary", merged.primaryColor);
  root.style.setProperty("--color-primary-foreground", merged.primaryForeground);
  root.style.setProperty("--color-accent", merged.accentColor);
  root.style.setProperty("--color-background", merged.backgroundColor);
  root.style.setProperty("--color-card", merged.cardColor);
  root.style.setProperty("--font-family", merged.fontFamily);

  const radiusMap: Record<ThemeConfig["borderRadius"], string> = {
    none: "0rem",
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    full: "9999px",
  };
  root.style.setProperty("--radius", radiusMap[merged.borderRadius]);

  document.title = merged.studioName;
}
