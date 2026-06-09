import axios from "axios";

// Hardcoding the local address bypasses the environment variable lookup and prevents global script hijacking
export const API = "/api";

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Attach bearer token fallback (multi-device / cookie-less environments)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("iru_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
