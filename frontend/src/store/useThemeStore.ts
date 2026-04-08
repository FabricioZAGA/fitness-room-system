/**
 * Theme store — manages brand and color mode settings.
 * Persisted to localStorage so preferences survive page refreshes.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type ThemeConfig, applyTheme, defaultTheme } from "@/config/theme";

interface ThemeState {
  theme: ThemeConfig;
  setTheme: (overrides: Partial<ThemeConfig>) => void;
  toggleMode: () => void;
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

      toggleMode: (): void => {
        set((state) => {
          const next: ThemeConfig = {
            ...state.theme,
            mode: state.theme.mode === "dark" ? "light" : "dark",
          };
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
      // Re-apply theme on hydration from localStorage
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyTheme(state.theme);
        }
      },
    }
  )
);
