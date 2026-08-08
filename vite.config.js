import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",     // listen on all interfaces — required inside Docker
    port: 5173,
    allowedHosts: ["empdiary.raccoon-ai.io"],
    watch: {
      usePolling: true,  // required for hot-reload to work with Docker volumes
    },
  },
});
