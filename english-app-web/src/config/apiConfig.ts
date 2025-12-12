// src/config/apiConfig.ts
export const ApiConfig = {
  baseUrl: (() => {
    const h = (typeof window !== "undefined" ? window.location.hostname : "") || "localhost";

    // Dev web trên máy tính
    if (h === "localhost" || h === "127.0.0.1") return "http://localhost:4000";

    // Trường hợp mở app trong Android WebView/emulator (mới cần 10.0.2.2)
    if (h === "10.0.2.2") return "http://10.0.2.2:4000";

    // Nếu bạn build ra mạng LAN (vd 192.168.x.x), backend cũng đang cùng máy đó:
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(h)) return `http://${h}:4000`;

    // Fallback
    return "http://localhost:4000";
  })(),
};
