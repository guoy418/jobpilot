import { useState } from "react";
import { getDashboardSummaryApi, getTodayActionsApi } from "../apiClient";
import { isApiEnabled } from "../appConfig";
import type { ApiDashboardSummary, ApiTodayAction } from "../utils/todayActions";

export function useApiInsights() {
  const [apiDashboardSummary, setApiDashboardSummary] = useState<ApiDashboardSummary | null>(null);
  const [apiTodayActions, setApiTodayActions] = useState<ApiTodayAction[] | null>(null);

  const replaceApiInsights = (summary: ApiDashboardSummary | null, actions: ApiTodayAction[] | null) => {
    setApiDashboardSummary(summary);
    setApiTodayActions(actions);
  };

  const refreshApiInsights = () => {
    if (!isApiEnabled) return;
    void Promise.all([getDashboardSummaryApi(), getTodayActionsApi()])
      .then(([summary, actions]) => {
        setApiDashboardSummary(summary);
        setApiTodayActions(actions);
      })
      .catch(() => {
        setApiDashboardSummary(null);
        setApiTodayActions(null);
      });
  };

  const invalidateApiInsights = () => {
    setApiDashboardSummary(null);
    setApiTodayActions(null);
  };

  const invalidateTodayActions = () => {
    setApiTodayActions(null);
  };

  return {
    apiDashboardSummary,
    apiTodayActions,
    replaceApiInsights,
    refreshApiInsights,
    invalidateApiInsights,
    invalidateTodayActions,
  };
}
