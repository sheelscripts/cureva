import * as mockAnalytics from "./mock/analytics";

const getApiUrl = (path: string): string => {
  if (typeof window !== "undefined") return path;
  const host = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  return `${host}${path}`;
};

export const getAgentMetrics = async () => {
  try {
    const res = await fetch(getApiUrl("/api/admin/agents"));
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("getAgentMetrics fetch failed:", e);
  }
  return mockAnalytics.agentMetrics;
};

export const getPromptMetrics = async () => {
  try {
    const res = await fetch(getApiUrl("/api/admin/prompts"));
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("getPromptMetrics fetch failed:", e);
  }
  return mockAnalytics.promptMetrics;
};

export const getDoctorMetrics = async () => {
  try {
    const res = await fetch(getApiUrl("/api/admin/doctors"));
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("getDoctorMetrics fetch failed:", e);
  }
  return mockAnalytics.doctorMetrics;
};

export const getRevenueMetrics = async () => {
  try {
    const res = await fetch(getApiUrl("/api/admin/revenue"));
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("getRevenueMetrics fetch failed:", e);
  }
  return mockAnalytics.revenueMetrics;
};

export const getClinicOverview = async () => {
  try {
    const res = await fetch(getApiUrl("/api/admin/doctors"));
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("getClinicOverview fetch failed:", e);
  }
  return mockAnalytics.clinicOverview;
};

export const getAgentDefinitions = async () => {
  try {
    const res = await fetch(getApiUrl("/api/agents"));
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("getAgentDefinitions fetch failed:", e);
  }
  return null;
};

export const getSlotSaverMetricsAdmin = async () => {
  try {
    const res = await fetch(getApiUrl("/api/slotsaver"));
    if (res.ok) {
      const data = await res.json();
      // Shape detection: aggregate metrics have `.month`, live data has `.tomorrowRiskScores`
      if (data && typeof data === "object" && data.month && typeof data.month.protectionRate === "number") {
        return data;
      }
      console.warn("getSlotSaverMetricsAdmin: response shape mismatch, using mock");
    }
  } catch (e) {
    console.warn("getSlotSaverMetricsAdmin fetch failed:", e);
  }
  return mockAnalytics.slotSaverMetricsAdmin;
};

export const getEscalations = async () => {
  try {
    const res = await fetch(getApiUrl("/api/admin/escalations"));
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("getEscalations fetch failed:", e);
  }
  return mockAnalytics.escalations;
};