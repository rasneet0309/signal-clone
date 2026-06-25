import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

const api = axios.create({ baseURL: API_URL });

// Before every request, attach the saved login token (if we have one)
// as an "Authorization: Bearer <token>" header - this is how the backend
// knows which user is making the request.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("signal_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// If the backend ever says "401 Unauthorized" (token expired/invalid),
// automatically log the user out and send them back to /login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("signal_token");
      localStorage.removeItem("signal_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
