import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const buildTime = new Date().toISOString();

function gitCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch (ignored) {
    return "unknown";
  }
}

const clientBuildInfo = {
  version: packageJson.version,
  buildTime,
  commit: gitCommit()
};

export default defineConfig({
  base: "/sea-battle/",
  plugins: [
    {
      name: "sea-battle-build-info",
      transformIndexHtml(html) {
        return html.replace(
          "%SEA_BATTLE_CLIENT_VERSION_SCRIPT%",
          `<script>window.__SEA_BATTLE_CLIENT_VERSION__ = ${JSON.stringify(clientBuildInfo)};</script>`
        );
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        webgpu: resolve(__dirname, "webgpu.html")
      }
    }
  }
});
