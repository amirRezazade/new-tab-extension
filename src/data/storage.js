import { DEFAULT_DASHBOARD, DEFAULT_SETTINGS, DEFAULT_WEATHER_LOCATION, STORAGE_KEYS } from "./defaults.js";

const memoryFallback = new Map();
let writeQueue = Promise.resolve();

function extensionStorageAvailable() {
  return typeof globalThis.chrome !== "undefined" && Boolean(globalThis.chrome.storage?.local);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeLocalStorageGet(key) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (raw !== null && raw !== undefined) return JSON.parse(raw);
  } catch {
    // Sandboxed previews can deny localStorage; use the in-memory fallback instead.
  }
  return memoryFallback.has(key) ? clone(memoryFallback.get(key)) : undefined;
}

function safeLocalStorageSet(key, value) {
  const snapshot = clone(value);
  memoryFallback.set(key, snapshot);
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(snapshot));
  } catch {
    // The page remains usable for the current session even if browser storage is blocked.
  }
}

async function readKeys(keys) {
  if (extensionStorageAvailable()) {
    return globalThis.chrome.storage.local.get(keys);
  }
  return Object.fromEntries(keys.map((key) => [key, safeLocalStorageGet(key)]));
}

function queueWrite(key, value) {
  const snapshot = clone(value);
  writeQueue = writeQueue.then(async () => {
    if (extensionStorageAvailable()) {
      await globalThis.chrome.storage.local.set({ [key]: snapshot });
      return;
    }
    safeLocalStorageSet(key, snapshot);
  });
  return writeQueue;
}

export function normalizeDashboard(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.tabs)) {
    return clone(DEFAULT_DASHBOARD);
  }

  const tabs = raw.tabs
    .filter((tab) => tab && typeof tab.id === "string" && typeof tab.name === "string")
    .map((tab, tabIndex) => ({
      ...tab,
      order: Number.isFinite(tab.order) ? tab.order : tabIndex,
      groups: Array.isArray(tab.groups)
        ? tab.groups
            .filter((group) => group && typeof group.id === "string" && typeof group.name === "string")
            .map((group, groupIndex) => ({
              ...group,
              column: Number.isInteger(group.column) && group.column >= 0 && group.column < 4
                ? group.column
                : groupIndex % 4,
              order: Number.isFinite(group.order) ? group.order : groupIndex,
              links: Array.isArray(group.links)
                ? group.links
                    .filter((link) => link && typeof link.id === "string" && typeof link.title === "string")
                    .map((link, linkIndex) => ({
                      ...link,
                      order: Number.isFinite(link.order) ? link.order : linkIndex,
                    }))
                    .sort((a, b) => a.order - b.order)
                : [],
            }))
            .sort((a, b) => a.column - b.column || a.order - b.order)
        : [],
    }))
    .sort((a, b) => a.order - b.order);

  if (tabs.length === 0) return clone(DEFAULT_DASHBOARD);
  const activeTabId = tabs.some((tab) => tab.id === raw.activeTabId) ? raw.activeTabId : tabs[0].id;

  return {
    ...raw,
    schemaVersion: 2,
    activeTabId,
    tabs,
  };
}

export function normalizeSettings(raw) {
  if (!raw || typeof raw !== "object") return clone(DEFAULT_SETTINGS);

  const validColor = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  const safePresetId = typeof raw.wallpaperPreset === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(raw.wallpaperPreset);
  const requestedBlur = Number.isFinite(raw.groupBlur) ? Math.round(raw.groupBlur) : DEFAULT_SETTINGS.groupBlur;
  const requestedOpacity = Number.isFinite(raw.cardOpacity) ? Math.round(raw.cardOpacity) : DEFAULT_SETTINGS.cardOpacity;
  const weatherCity = typeof raw.weatherCity === "string" && raw.weatherCity.trim()
    ? raw.weatherCity.trim().slice(0, 80)
    : DEFAULT_SETTINGS.weatherCity;
  const cityKey = weatherCity.toLocaleLowerCase();
  const tabrizAliases = new Set(["تبریز", "tabriz"]);
  const rawLocation = raw.weatherLocation;
  const locationName = typeof rawLocation?.name === "string" ? rawLocation.name.trim().slice(0, 80) : "";
  const locationKey = locationName.toLocaleLowerCase();
  const locationMatchesCity = locationKey === cityKey || (tabrizAliases.has(locationKey) && tabrizAliases.has(cityKey));
  const validCoordinates = Number.isFinite(rawLocation?.latitude)
    && rawLocation.latitude >= -90 && rawLocation.latitude <= 90
    && Number.isFinite(rawLocation?.longitude)
    && rawLocation.longitude >= -180 && rawLocation.longitude <= 180;
  const weatherLocation = validCoordinates && locationName && locationMatchesCity
    ? {
        id: typeof rawLocation.id === "number" || typeof rawLocation.id === "string" ? rawLocation.id : null,
        name: locationName,
        admin1: typeof rawLocation.admin1 === "string" ? rawLocation.admin1.slice(0, 100) : "",
        country: typeof rawLocation.country === "string" ? rawLocation.country.slice(0, 100) : "",
        countryCode: typeof rawLocation.countryCode === "string" ? rawLocation.countryCode.slice(0, 8) : "",
        latitude: rawLocation.latitude,
        longitude: rawLocation.longitude,
        timezone: typeof rawLocation.timezone === "string" ? rawLocation.timezone.slice(0, 80) : "",
      }
    : (tabrizAliases.has(cityKey) ? { ...DEFAULT_WEATHER_LOCATION } : null);

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    showSearch: raw.showSearch !== false,
    showClockAndWeather: raw.showClockAndWeather !== false,
    openLinksInNewTab: raw.openLinksInNewTab !== false,
    weatherCity,
    weatherLocation,
    theme: ["ember", "midnight", "daylight"].includes(raw.theme) ? raw.theme : DEFAULT_SETTINGS.theme,
    backgroundMode: ["scene", "solid", "image"].includes(raw.backgroundMode)
      ? raw.backgroundMode
      : DEFAULT_SETTINGS.backgroundMode,
    backgroundColor: validColor(raw.backgroundColor) ? raw.backgroundColor : DEFAULT_SETTINGS.backgroundColor,
    wallpaperPreset: safePresetId ? raw.wallpaperPreset : null,
    primaryColor: validColor(raw.primaryColor) ? raw.primaryColor : null,
    textColor: validColor(raw.textColor) ? raw.textColor : null,
    groupBlur: Math.min(28, Math.max(0, requestedBlur)),
    cardOpacity: Math.min(100, Math.max(0, requestedOpacity)),
  };
}

export async function loadAppState() {
  const stored = await readKeys([STORAGE_KEYS.dashboard, STORAGE_KEYS.settings]);
  const dashboardWasMissing = stored[STORAGE_KEYS.dashboard] === undefined;
  const settingsWereMissing = stored[STORAGE_KEYS.settings] === undefined;
  const dashboard = normalizeDashboard(stored[STORAGE_KEYS.dashboard]);
  const settings = normalizeSettings(stored[STORAGE_KEYS.settings]);
  const dashboardNeedsMigration = dashboardWasMissing || stored[STORAGE_KEYS.dashboard]?.schemaVersion !== dashboard.schemaVersion;

  // Defaults and schema migrations are written once, never on each new-tab load.
  const initialWrites = [];
  if (dashboardNeedsMigration) initialWrites.push(queueWrite(STORAGE_KEYS.dashboard, dashboard));
  if (settingsWereMissing) initialWrites.push(queueWrite(STORAGE_KEYS.settings, settings));
  await Promise.all(initialWrites);

  return { dashboard, settings };
}

export function saveDashboard(dashboard) {
  return queueWrite(STORAGE_KEYS.dashboard, normalizeDashboard(dashboard));
}

export function saveSettings(settings) {
  return queueWrite(STORAGE_KEYS.settings, normalizeSettings(settings));
}

export function subscribeToStorageChanges(callback) {
  if (extensionStorageAvailable() && globalThis.chrome.storage.onChanged) {
    const listener = (changes, areaName) => {
      if (areaName !== "local") return;
      callback(changes);
    };
    globalThis.chrome.storage.onChanged.addListener(listener);
    return () => globalThis.chrome.storage.onChanged.removeListener(listener);
  }

  const listener = (event) => {
    if (event.key) callback({ [event.key]: { newValue: safeLocalStorageGet(event.key) } });
  };
  globalThis.addEventListener?.("storage", listener);
  return () => globalThis.removeEventListener?.("storage", listener);
}
