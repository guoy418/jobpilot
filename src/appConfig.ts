/** Public static demo: mock data only, no API calls. */
export const isPublicDemo = import.meta.env.VITE_PUBLIC_DEMO === "true";

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

export const apiBaseUrl = configuredApiBase || (isPublicDemo ? "" : "http://127.0.0.1:8787");

export const isApiEnabled = !isPublicDemo && apiBaseUrl.length > 0;
