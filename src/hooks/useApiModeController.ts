import { useState } from "react";
import { getApiHealthApi, type ApiHealth } from "../apiClient";
import { isApiEnabled, isPublicDemo } from "../appConfig";

export type ApiModeState = {
  status: "checking" | "online" | "offline" | "demo" | "mock";
  dbPath?: string;
  checkedAt?: string;
};

const checkedAt = () => new Date().toLocaleTimeString();

const fallbackApiMode = (): ApiModeState => (isPublicDemo ? { status: "demo" } : { status: "mock" });

const initialApiMode = (): ApiModeState => (isPublicDemo ? { status: "demo" } : isApiEnabled ? { status: "checking" } : { status: "mock" });

export function useApiModeController({ onMessage }: { onMessage: (message: string) => void }) {
  const [apiMode, setApiMode] = useState<ApiModeState>(() => initialApiMode());

  const useFallbackApiMode = () => {
    setApiMode(fallbackApiMode());
  };

  const markApiOnline = (health?: ApiHealth) => {
    setApiMode({ status: "online", dbPath: health?.dbPath, checkedAt: checkedAt() });
  };

  const markApiOffline = () => {
    setApiMode({ status: "offline", checkedAt: checkedAt() });
  };

  const refreshApiHealth = () => {
    if (!isApiEnabled) {
      useFallbackApiMode();
      return;
    }
    setApiMode((state) => ({ ...state, status: "checking" }));
    void getApiHealthApi()
      .then((health) => {
        if (health.ok) {
          markApiOnline(health);
          onMessage("已连接");
        } else {
          markApiOffline();
          onMessage("连接异常");
        }
      })
      .catch(() => {
        markApiOffline();
        onMessage("暂时离线");
      });
  };

  return {
    apiMode,
    markApiOnline,
    markApiOffline,
    refreshApiHealth,
    useFallbackApiMode,
  };
}
