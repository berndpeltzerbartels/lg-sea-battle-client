#!/usr/bin/env node

import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, cp, mkdtemp, rm, symlink } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(clientRoot, "..");
const tempParent = process.env.SEA_BATTLE_TEMP_PARENT
  ? path.resolve(process.env.SEA_BATTLE_TEMP_PARENT)
  : path.dirname(projectRoot);
const keepTemp = process.env.SEA_BATTLE_KEEP_TEMP === "1";
const tempRoot = await mkdtemp(path.join(tempParent, ".sea-battle-e2e-"));
const skippedNames = new Set([
  ".git",
  ".idea",
  "node_modules",
  "dist",
  "build",
  "test-results",
  "playwright-report",
  ".DS_Store"
]);

let serverProcess = null;
let stoppingServer = false;

try {
  console.log(`Sea Battle E2E temp: ${tempRoot}`);
  await copyProjectToTemp();
  await linkOrInstallClientDependencies();

  const serverPort = await resolvePort("SEA_BATTLE_TEST_SERVER_PORT");
  await startServer(serverPort);

  const playwrightArgs = process.argv.slice(2);
  await runCommand(
    "npx",
    ["playwright", "test", ...playwrightArgs],
    path.join(tempRoot, "client"),
    {
      ...process.env,
      SEA_BATTLE_BASE_URL: `http://127.0.0.1:${serverPort}`
    }
  );
} finally {
  await stopServer();
  if (keepTemp) {
    console.log(`Sea Battle E2E temp kept: ${tempRoot}`);
  } else {
    await removeTempRoot();
  }
}

async function copyProjectToTemp() {
  await cp(projectRoot, tempRoot, {
    recursive: true,
    dereference: false,
    filter(source) {
      return !skippedNames.has(path.basename(source));
    }
  });
}

async function linkOrInstallClientDependencies() {
  const sourceNodeModules = path.join(clientRoot, "node_modules");
  const tempNodeModules = path.join(tempRoot, "client", "node_modules");
  if (await exists(sourceNodeModules)) {
    await symlink(sourceNodeModules, tempNodeModules, "dir");
    return;
  }
  await runCommand("npm", ["ci"], path.join(tempRoot, "client"), process.env);
}

async function startServer(port) {
  serverProcess = spawn(
    "./gradlew",
    ["runSeaBattleXis", `-Pport=${port}`, "--console=plain", "--no-daemon", "-q"],
    {
      cwd: path.join(tempRoot, "server"),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  serverProcess.stdout.on("data", (chunk) => process.stdout.write(chunk));
  serverProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));
  serverProcess.on("exit", (code, signal) => {
    if (stoppingServer) return;
    if (code !== null && code !== 0) {
      console.error(`Sea Battle server exited with code ${code}`);
    } else if (signal) {
      console.error(`Sea Battle server exited with signal ${signal}`);
    }
  });

  await waitForUrl(`http://127.0.0.1:${port}/game/state`, 60_000);
}

async function stopServer() {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  stoppingServer = true;
  serverProcess.kill("SIGTERM");
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (serverProcess.exitCode === null) {
        serverProcess.kill("SIGKILL");
      }
      resolve();
    }, 5_000);
    serverProcess.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function removeTempRoot() {
  try {
    await rm(tempRoot, {
      recursive: true,
      force: true,
      maxRetries: 8,
      retryDelay: 250
    });
  } catch (error) {
    console.warn(`Sea Battle E2E temp cleanup failed: ${error.message}`);
    console.warn(`Please remove manually if it is no longer needed: ${tempRoot}`);
  }
}

async function resolvePort(envName) {
  const fixedPort = Number(process.env[envName]);
  if (Number.isInteger(fixedPort) && fixedPort > 0) return fixedPort;
  return findFreePort();
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForUrl(url, timeoutMs) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) return;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? "no response"}`);
}

function runCommand(command, args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with ${signal ?? `code ${code}`}`));
      }
    });
  });
}

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
