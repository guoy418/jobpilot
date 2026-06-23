import { useEffect, useState } from "react";

export type AiSettings = {
  provider: "none" | "openai" | "anthropic" | "custom";
  model: string;
  apiKey: string;
  parseMode: "mock" | "assist";
  transcriptionMode: "mock" | "assist";
  endpoint: string;
  notes: string;
};

const aiSettingsStorageKey = "jobpilot.aiSettings.v1";

export const defaultAiSettings: AiSettings = {
  provider: "none",
  model: "",
  apiKey: "",
  parseMode: "mock",
  transcriptionMode: "mock",
  endpoint: "",
  notes: "",
};

const loadAiSettings = (): AiSettings => {
  try {
    const saved = window.localStorage.getItem(aiSettingsStorageKey);
    return saved ? { ...defaultAiSettings, ...JSON.parse(saved) } : defaultAiSettings;
  } catch {
    return defaultAiSettings;
  }
};

export function useAiSettings() {
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadAiSettings());

  useEffect(() => {
    window.localStorage.setItem(aiSettingsStorageKey, JSON.stringify(aiSettings));
  }, [aiSettings]);

  const updateAiSettings = (patch: Partial<AiSettings>) => {
    setAiSettings((settings) => ({ ...settings, ...patch }));
  };

  const resetAiSettings = () => {
    setAiSettings(defaultAiSettings);
  };

  return {
    aiSettings,
    updateAiSettings,
    resetAiSettings,
  };
}
