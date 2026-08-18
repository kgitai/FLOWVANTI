"use strict";

const fs = require("fs");
const fsp = fs.promises;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBusy(err) {
  return err && (err.code === "EPERM" || err.code === "EACCES" || err.code === "EBUSY");
}

async function copyThenRemove(from, to) {
  await fsp.cp(from, to, { recursive: true, force: true });
  await fsp.rm(from, { recursive: true, force: true });
}

const origRename = fsp.rename.bind(fsp);
fsp.rename = async function renameWithRetry(from, to) {
  let lastErr;
  for (let i = 0; i < 16; i++) {
    try {
      return await origRename(from, to);
    } catch (err) {
      lastErr = err;
      if (!isBusy(err)) throw err;
      await sleep(350 * (i + 1));
    }
  }
  try {
    await fsp.rm(to, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  await copyThenRemove(from, to);
  return undefined;
};

const origSync = fs.renameSync.bind(fs);
fs.renameSync = function renameSyncWithRetry(from, to) {
  let lastErr;
  for (let i = 0; i < 8; i++) {
    try {
      return origSync(from, to);
    } catch (err) {
      lastErr = err;
      if (!isBusy(err)) throw err;
      const end = Date.now() + 400 * (i + 1);
      while (Date.now() < end) {
        /* spin */
      }
    }
  }
  throw lastErr;
};
