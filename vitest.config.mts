import react from "@vitejs/plugin-react"
import { resolve } from "path"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    env: loadEnv(mode ?? "test", process.cwd(), ""),
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
}))
