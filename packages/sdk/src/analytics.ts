import * as mockAnalytics from "./mock/analytics";

const getApiUrl = (path: string): string => {
  if (typeof window !== "undefined") return path;
  const host = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  return `${host}${path}`;
};

// Re-export static data from analytics mock
export { mockAnalytics };