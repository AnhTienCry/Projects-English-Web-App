import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
console.log("🌐 Base URL:", baseURL);

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🧩 Thêm token từ localStorage vào mọi request
api.interceptors.request.use((config) => {
  const access = localStorage.getItem("accessToken");

  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
    console.log("🟢 Sending token:", access.slice(0, 25) + "..."); // log debug
  } else {
    console.warn("⚠️ No accessToken found in localStorage!");
  }

  return config;
});

let isRefreshing = false;
let queue: Array<(t: string) => void> = [];

// 🧠 Xử lý khi accessToken hết hạn
api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshToken = localStorage.getItem("refreshToken");
          if (!refreshToken) throw new Error("No refresh token found");

          console.log("♻️ Refreshing access token...");

          // ⚠️ Dùng cùng baseURL, không nên gọi axios gốc
          const { data } = await api.post("/api/auth/refresh", { refreshToken });

          localStorage.setItem("accessToken", data.accessToken);
          console.log("✅ Token refreshed successfully");

          queue.forEach((cb) => cb(data.accessToken));
          queue = [];

          // Gắn token mới cho request ban đầu
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch (e) {
          console.error("❌ Refresh token failed:", e);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
          return Promise.reject(e);
        } finally {
          isRefreshing = false;
        }
      }

      // Nếu refresh đang chạy — đợi nó xong
      return new Promise((resolve) => {
        queue.push((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(original));
        });
      });
    }

    return Promise.reject(error);
  }
);

export default api;
