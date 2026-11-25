import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

/** Server-only packages load from node_modules at runtime instead of being bundled. */
const serverExternal = ["@prisma/client", "@prisma/adapter-pg", "pg", "better-auth", "mermaid", "playwright", "@aws-sdk/client-s3", "mammoth", "pdfjs-dist"];

export default defineConfig({
  server: { port: 4317, strictPort: true },
  envDir: "../..",
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart({ srcDirectory: "src" }), nitro({ preset: "node-server" }), viteReact()],
  ssr: { external: serverExternal },
});
