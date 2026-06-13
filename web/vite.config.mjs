import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Web host for the Supabase account pages (SignIn/SignUp/Home in ../src).
// Run from the repo root with: npm run web
export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [".."] } }, // pages live in ../src
});
