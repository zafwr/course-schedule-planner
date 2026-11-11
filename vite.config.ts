/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative asset paths so the build works on GitHub Pages (served from /course-schedule-planner/).
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
