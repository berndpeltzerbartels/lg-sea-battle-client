import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/sea-battle/",
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        webgpu: resolve(__dirname, "webgpu.html")
      }
    }
  }
});
