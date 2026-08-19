const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");

app.setName("FLOWVANTI");
app.setAppUserModelId("app.flowvanti.desktop");
Menu.setApplicationMenu(null);

const ATTACH_MAGIC = Buffer.from("FV1");
const ATTACH_MAX = 512 * 1048576;

function appDir() {
  const dir = path.join(process.env.LOCALAPPDATA || os.homedir(), "FLOWVANTI");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function workspaceFile() {
  return path.join(appDir(), "workspace.json");
}
function attachmentsDir() {
  const dir = path.join(appDir(), "attachments");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function safeAttachId(id) {
  const s = String(id || "").replace(/[^a-zA-Z0-9_-]/g, "");
  return s.slice(0, 80);
}
function attachPath(id) {
  return path.join(attachmentsDir(), safeAttachId(id) + ".bin");
}
function loadAttachKey() {
  const file = path.join(appDir(), "attach.key");
  try {
    const raw = fs.readFileSync(file);
    if (raw.length === 32) return raw;
  } catch (err) {}
  const key = crypto.randomBytes(32);
  fs.writeFileSync(file, key, { mode: 0o600 });
  return key;
}
function toBuffer(bytes) {
  if (Buffer.isBuffer(bytes)) return bytes;
  if (bytes instanceof Uint8Array) return Buffer.from(bytes);
  if (bytes && bytes.type === "Buffer" && Array.isArray(bytes.data)) return Buffer.from(bytes.data);
  if (Array.isArray(bytes)) return Buffer.from(bytes);
  if (bytes instanceof ArrayBuffer) return Buffer.from(bytes);
  return Buffer.from([]);
}
function encryptAttachment(plain) {
  const gz = zlib.gzipSync(plain);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", loadAttachKey(), iv);
  const enc = Buffer.concat([cipher.update(gz), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([ATTACH_MAGIC, iv, tag, enc]);
}
function decryptAttachment(packed) {
  if (!packed || packed.length < 31) throw new Error("bad blob");
  if (!packed.slice(0, 3).equals(ATTACH_MAGIC)) throw new Error("bad magic");
  const iv = packed.slice(3, 15);
  const tag = packed.slice(15, 31);
  const enc = packed.slice(31);
  const decipher = crypto.createDecipheriv("aes-256-gcm", loadAttachKey(), iv);
  decipher.setAuthTag(tag);
  const gz = Buffer.concat([decipher.update(enc), decipher.final()]);
  return zlib.gunzipSync(gz);
}

ipcMain.handle("load_workspace", async () => {
  try {
    const file = workspaceFile();
    return await fs.promises.readFile(file, "utf8");
  } catch (err) {
    return "";
  }
});

ipcMain.handle("save_workspace", async (_event, raw) => {
  try {
    const file = workspaceFile();
    const tmp = file + ".tmp";
    await fs.promises.writeFile(tmp, raw || "", "utf8");
    await fs.promises.rename(tmp, file);
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle("put_attachment", async (_event, id, bytes) => {
  try {
    const safe = safeAttachId(id);
    if (!safe) return false;
    const buf = toBuffer(bytes);
    if (buf.length > ATTACH_MAX) return false;
    const packed = encryptAttachment(buf);
    const file = attachPath(safe);
    const tmp = file + ".tmp";
    await fs.promises.writeFile(tmp, packed);
    await fs.promises.rename(tmp, file);
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle("get_attachment", async (_event, id) => {
  try {
    const safe = safeAttachId(id);
    if (!safe) return null;
    const packed = await fs.promises.readFile(attachPath(safe));
    return decryptAttachment(packed);
  } catch (err) {
    return null;
  }
});

ipcMain.handle("delete_attachment", async (_event, id) => {
  try {
    const safe = safeAttachId(id);
    if (!safe) return false;
    await fs.promises.unlink(attachPath(safe));
    return true;
  } catch (err) {
    if (err && err.code === "ENOENT") return true;
    return false;
  }
});

function packagedUninstaller() {
  if (!app.isPackaged) return "";
  const dir = path.dirname(process.execPath);
  for (const name of ["uninstall.exe", "Uninstall FLOWVANTI.exe"]) {
    const exe = path.join(dir, name);
    if (fs.existsSync(exe)) return exe;
  }
  return "";
}

function launchUninstaller() {
  const uninst = packagedUninstaller();
  if (!uninst) return false;
  spawn(uninst, [], { detached: true, stdio: "ignore" }).unref();
  return true;
}

function createWindow() {
  const win = new BrowserWindow({
    title: "FLOWVANTI",
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#0B0E14",
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, "..", "desktop", "flowvanti.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      zoomFactor: 1,
    },
  });

  win.setMenuBarVisibility(false);
  win.webContents.setUserAgent("FLOWVANTI");
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    const current = win.webContents.getURL();
    if (url !== current) event.preventDefault();
  });
  win.webContents.on("before-input-event", (event, input) => {
    const key = (input.key || "").toLowerCase();
    if (input.control || input.meta) {
      if (["r", "p", "+", "-", "=", "0", "f", "u", "j"].includes(key)) event.preventDefault();
    }
    if (key === "f5" || key === "f12" || key === "f11") event.preventDefault();
  });
  win.webContents.on("context-menu", (event) => event.preventDefault());
  win.once("ready-to-show", () => win.show());
  const ui = path.join(__dirname, "..", "dist-ui", "index.html");
  const fallback = path.join(__dirname, "..", "dashboard.html");
  win.loadFile(fs.existsSync(ui) ? ui : fallback);
}

app.whenReady().then(() => {
  if (process.argv.includes("--uninstall")) {
    launchUninstaller();
    app.quit();
    return;
  }
  const uninst = packagedUninstaller();
  if (uninst) {
    app.setUserTasks([
      {
        program: uninst,
        arguments: "",
        title: "uninstall.exe",
        description: "Remove FLOWVANTI from this PC",
        iconPath: uninst,
        iconIndex: 0,
      },
    ]);
  }
  createWindow();
});
app.on("window-all-closed", () => app.quit());
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-attach-webview", (event) => event.preventDefault());
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
});
