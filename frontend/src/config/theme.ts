/**
 * Theme configuration for Fitness Room System.
 *
 * Brand identity: Black & Gold — professional, premium.
 * Supports dark mode (default) and light mode.
 *
 * CSS variables are applied in src/index.css and consumed everywhere.
 * Call applyTheme() on app init and on mode change.
 */

export interface ThemeConfig {
  /** Studio display name shown in sidebar and browser title */
  studioName: string;
  /** Path to the logo image (relative to /public) */
  logoPath: string;
  /** Default border radius */
  borderRadius: "none" | "sm" | "md" | "lg" | "full";
  /** Font family */
  fontFamily: string;
  /** Color mode */
  mode: "dark" | "light";
}

export const defaultTheme: ThemeConfig = {
  studioName: import.meta.env.VITE_APP_NAME ?? "Fitness Room",
  logoPath: "/logo.svg",
  borderRadius: "lg",
  fontFamily: "'Inter', 'system-ui', sans-serif",
  mode: "dark",
};

/**
 * Apply theme to document root.
 * Sets data-theme attribute and CSS variable overrides.
 */
export function applyTheme(theme: Partial<ThemeConfig> = {}): void {
  const merged: ThemeConfig = { ...defaultTheme, ...theme };
  const root = document.documentElement;

  // Toggle dark/light mode via data-theme attribute
  root.setAttribute("data-theme", merged.mode);

  // Border radius
  const radiusMap: Record<ThemeConfig["borderRadius"], string> = {
    none: "0rem",
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    full: "9999px",
  };
  root.style.setProperty("--radius", radiusMap[merged.borderRadius]);
  root.style.setProperty("--font-family", merged.fontFamily);

  // Browser title
  document.title = merged.studioName;
}
