import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The app calls "/api/..." on its own address. Vite forwards those calls to the backend.
// Because of this, ONE https tunnel (ngrok / cloudflared) is enough to test on a phone.
const backend = process.env.BACKEND_URL || "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: { "/api": { target: backend, changeOrigin: true } },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
    proxy: { "/api": { target: backend, changeOrigin: true } },
  },
});
