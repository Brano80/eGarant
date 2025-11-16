import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// --- Defines __dirname for ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- End ---

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Replit pluginy sú zakomentované, nepotrebujeme ich lokálne
  ],
  resolve: {
    alias: {
      // Cesty pre importy
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  // Hovorí Vitu, kde je "koreň" frontendu (kde nájde index.html)
  root: path.resolve(__dirname, "client"),
  build: {
    // Kam má ukladať skompilovaný frontend
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    // Proxy pre API volania (opravené na port 3000)
    proxy: {
      // Pravidlo pre API volania (napr. /api/current-user)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Pravidlo pre autentifikáciu (napr. /auth/mock-login)
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});