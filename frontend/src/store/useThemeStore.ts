/**
 * Theme store — manages brand customization settings.
 * Persisted to localStorage so studio branding survives page refreshes.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type ThemeConfig, applyTheme, defaultTheme } from "@/config/theme";

interface ThemeState {
  theme: ThemeConfig;
  setTheme: (overrides: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: defaultTheme,

      setTheme: (overrides: Partial<ThemeConfig>): void => {
        set((state) => {
          const next = { ...state.theme, ...overrides };
          applyTheme(next);
          return { theme: next };
        });
      },

      resetTheme: (): void => {
        applyTheme(defaultTheme);
        set({ theme: defaultTheme });
      },
    }),
    {
      name: "fitness-room-theme",
    }
  )
);
