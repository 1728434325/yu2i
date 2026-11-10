import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// 纯静态输出：产物为 HTML/CSS/JS/资源，无 Node 常驻依赖。
export default defineConfig({
  site: "http://175.178.200.224:2778",
  output: "static",
  trailingSlash: "always",
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
