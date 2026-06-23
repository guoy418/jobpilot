import { useEffect, useState } from "react";

export type AppTheme = "dark" | "light";

const themeStorageKey = "jobpilot.theme.v1";

const loadThemePreference = (): AppTheme => {
  try {
    const saved = window.localStorage.getItem(themeStorageKey);
    return saved === "dark" || saved === "light" ? saved : "light";
  } catch {
    return "light";
  }
};

export function useThemePreference() {
  const [theme, setTheme] = useState<AppTheme>(() => loadThemePreference());

  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return {
    theme,
    toggleTheme,
  };
}
