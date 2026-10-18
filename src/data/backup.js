import { normalizeDashboard, normalizeSettings } from "./storage.js";

const BACKUP_FORMAT = "new-tab-dashboard-backup";
const BACKUP_VERSION = 1;
const MAX_WALLPAPER_BYTES = 8 * 1024 * 1024;
const ALLOWED_WALLPAPER_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_BACKUP_TEXT_LENGTH = 16 * 1024 * 1024;

function encodeBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function decodeWallpaper({ mimeType, base64 }) {
  if (!ALLOWED_WALLPAPER_TYPES.has(mimeType)) {
    throw new Error("The backup contains an unsupported wallpaper format.");
  }
  if (typeof base64 !== "string" || base64.length > Math.ceil((MAX_WALLPAPER_BYTES * 4) / 3) + 8) {
    throw new Error("The wallpaper in this backup is too large or invalid.");
  }
  if (base64.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) {
    throw new Error("The wallpaper data in this backup is invalid.");
  }

  let binary;
  try {
    binary = atob(base64);
  } catch {
    throw new Error("The wallpaper data in this backup is invalid.");
  }
  if (binary.length === 0 || binary.length > MAX_WALLPAPER_BYTES) {
    throw new Error("The wallpaper in this backup is too large or empty.");
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

export async function createBackupJSON({ dashboard, settings, wallpaper = null }) {
  let wallpaperData = null;
  if (wallpaper instanceof Blob) {
    if (!ALLOWED_WALLPAPER_TYPES.has(wallpaper.type) || wallpaper.size > MAX_WALLPAPER_BYTES) {
      throw new Error("The saved wallpaper cannot be included in the backup.");
    }
    wallpaperData = {
      mimeType: wallpaper.type,
      base64: encodeBase64(await wallpaper.arrayBuffer()),
    };
  }

  return JSON.stringify(
    {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      dashboard,
      settings,
      wallpaper: wallpaperData,
    },
    null,
    2,
  );
}

export function parseBackupJSON(text) {
  if (typeof text !== "string" || text.length > MAX_BACKUP_TEXT_LENGTH) {
    throw new Error("This backup file is too large.");
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }

  if (!payload || payload.format !== BACKUP_FORMAT || payload.version !== BACKUP_VERSION) {
    throw new Error("This is not a supported NovaTab backup.");
  }
  if (!payload.dashboard || !Array.isArray(payload.dashboard.tabs) || payload.dashboard.tabs.length === 0) {
    throw new Error("The backup does not contain a valid dashboard.");
  }
  if (!payload.settings || typeof payload.settings !== "object") {
    throw new Error("The backup does not contain valid settings.");
  }

  const dashboard = normalizeDashboard(payload.dashboard);
  const settings = normalizeSettings(payload.settings);
  const wallpaper = payload.wallpaper ? decodeWallpaper(payload.wallpaper) : null;

  return { dashboard, settings, wallpaper };
}
