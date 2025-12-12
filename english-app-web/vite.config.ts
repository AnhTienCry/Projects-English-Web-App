import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 🧩 Load toàn bộ biến môi trường (từ file .env, .env.local, v.v.)
  const env = loadEnv(mode, process.cwd(), '');

  console.log('🌍 Loaded ENV Variables:');
  console.log('   VITE_API_BASE_URL =', env.VITE_API_BASE_URL);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      open: true,
      cors: true,
      proxy: {
        // Nếu muốn proxy API trực tiếp (tùy chọn)
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    define: {
      'process.env': env, // ✅ đảm bảo import.meta.env hoạt động đúng
    },
  };
});
