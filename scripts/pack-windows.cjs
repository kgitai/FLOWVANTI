"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const installerPath = path.join(root, "release", "flowvanti_x64.exe");
const localPfx = path.join(root, "certs", "windows-code-sign.pfx");

function exists(file) {
  try {
    return fs.existsSync(file);
  } catch {
    return false;
  }
}

function looksLikeCertRef(value) {
  if (!value) return false;
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (trimmed.length > 400) return true;
  return exists(trimmed);
}

if (!process.env.CSC_LINK && !process.env.WIN_CSC_LINK && exists(localPfx)) {
  process.env.CSC_LINK = localPfx;
}

const willSign = looksLikeCertRef(process.env.WIN_CSC_LINK) || looksLikeCertRef(process.env.CSC_LINK);

if (!willSign) {
  process.env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
  console.log("[pack] No Authenticode PFX found. Building an unsigned installer.");
  console.log("[pack] Symantec / SmartScreen will still treat this as unsigned until you sign with an OV or EV code-signing certificate.");
  console.log("[pack] To sign: set WIN_CSC_LINK (path or base64 PFX) and WIN_CSC_KEY_PASSWORD, then run npm run dist again.");
} else {
  console.log("[pack] Signing Windows binaries with the configured Authenticode certificate.");
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run("npx", ["vite", "build"]);

const retryHookSrc = path.join(root, "scripts", "win-fs-retry.cjs");
const retryHook = path.join(require("os").tmpdir(), "flowvanti-win-fs-retry.cjs");
fs.copyFileSync(retryHookSrc, retryHook);
const existingNodeOptions = process.env.NODE_OPTIONS || "";
process.env.NODE_OPTIONS = `${existingNodeOptions} --require ${retryHook.replace(/\\/g, "/")}`.trim();

const releaseDir = path.join(root, "release");
for (const leftover of ["win-unpacked.tmp", "win-unpacked"]) {
  const leftoverPath = path.join(releaseDir, leftover);
  if (exists(leftoverPath)) {
    try {
      fs.rmSync(leftoverPath, { recursive: true, force: true });
    } catch (err) {
      console.warn("[pack] Could not remove " + leftoverPath + ": " + err.message);
    }
  }
}

run("npx", ["electron-builder", "--win", "nsis"]);

if (!exists(installerPath)) {
  console.error("[pack] Missing installer: " + installerPath);
  process.exit(1);
}

console.log("[pack] Installer: " + installerPath);

const signtool = "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64\\signtool.exe";
if (exists(signtool)) {
  const verify = spawnSync(signtool, ["verify", "/pa", "/v", installerPath], {
    encoding: "utf8",
    windowsHide: true,
  });
  const output = `${verify.stdout || ""}${verify.stderr || ""}`;
  if (verify.status === 0) {
    console.log("[pack] Authenticode signature: valid");
  } else {
    console.log("[pack] Authenticode signature: missing or untrusted");
    if (output.includes("No signature found")) {
      console.log("[pack] Place a purchased OV/EV PFX at certs\\windows-code-sign.pfx or set WIN_CSC_LINK, then rebuild.");
    }
  }
}
