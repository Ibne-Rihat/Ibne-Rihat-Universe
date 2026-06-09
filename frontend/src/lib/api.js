import axios from "axios";

export const API =
  process.env.REACT_APP_API_URL || "/api";

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("iru_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function formatApiError(detail) {
  if (!detail)
    return "Something went wrong.";

  if (typeof detail === "string")
    return detail;

  if (Array.isArray(detail))
    return detail
      .map((e) => e?.msg || JSON.stringify(e))
      .join(" ");

  if (detail?.msg)
    return detail.msg;

  return String(detail);
}

export default api;
