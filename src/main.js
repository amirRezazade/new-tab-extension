import { STORAGE_KEYS } from "./data/defaults.js";
import { createBackupJSON, parseBackupJSON } from "./data/backup.js";
import { loadAppState, saveDashboard, saveSettings, subscribeToStorageChanges } from "./data/storage.js";
import { loadWallpaper, removeWallpaper, saveWallpaper } from "./data/wallpaper-store.js";
import { loadWallpaperPresets } from "./data/wallpaper-presets.js";
import { applyAppearance } from "./features/appearance.js";
import { resolveBackgroundSelection } from "./features/wallpaper-resolution.js";
import { initializeClock } from "./features/clock.js";
import { initializeDataTransfer } from "./features/data-transfer.js";
import { initializeFloatingActionMenu } from "./features/floating-actions.js";
import { initializeLinkSearch } from "./features/link-search.js";
import { initializePreferences } from "./features/preferences.js";
import { initializeSearch } from "./features/search.js";
import { initializeSettings } from "./features/settings.js";
import { initializeWeather } from "./features/weather.js";
import { initializeTabs } from "./features/tabs.js";
import { createToast } from "./ui/toast.js";

const MAX_WALLPAPER_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

const toast = createToast(document.getElementById("toast"));
let appState;
let currentWallpaperUrl = null;
let wallpaperPresets = [];
let backgroundNeedsValidation = true;
let tabsController;
let searchController;
let settingsController;
let preferencesController;
let weatherController;

function setWallpaperUrl(blob) {
  if (currentWallpaperUrl) URL.revokeObjectURL(currentWallpaperUrl);
  currentWallpaperUrl = blob ? URL.createObjectURL(blob) : null;
  backgroundNeedsValidation = true;
}

function updateAppearance() {
  applyAppearance(appState.settings, currentWallpaperUrl, wallpaperPresets);
  searchController?.applyVisibility(appState.settings.showSearch);
  settingsController?.setSettings(appState.settings);
  preferencesController?.setSettings(appState.settings);
  tabsController?.setOpenLinksInNewTab(appState.settings.openLinksInNewTab);
  const clockWidget = document.getElementById("clock-widget");
  if (clockWidget) clockWidget.hidden = !appState.settings.showClockAndWeather;
  if (appState.settings.showClockAndWeather) {
    weatherController?.setLocation(appState.settings.weatherCity, appState.settings.weatherLocation);
    weatherController?.setEnabled(true);
  } else {
    weatherController?.setEnabled(false);
    weatherController?.setLocation(appState.settings.weatherCity, appState.settings.weatherLocation);
  }
}

async function updateSettings(nextSettings) {
  const previousSettings = appState.settings;
  let resolvedSettings = { ...previousSettings, ...nextSettings };
  const wallpaperSelectionChanged = resolvedSettings.backgroundMode !== previousSettings.backgroundMode || resolvedSettings.wallpaperPreset !== previousSettings.wallpaperPreset;

  if (backgroundNeedsValidation || wallpaperSelectionChanged) {
    const shouldNotifyWallpaperFallback = backgroundNeedsValidation || wallpaperSelectionChanged;
    const resolvedBackground = await resolveBackgroundSelection(resolvedSettings, currentWallpaperUrl, wallpaperPresets);
    resolvedSettings = resolvedBackground.settings;
    backgroundNeedsValidation = false;
    if (shouldNotifyWallpaperFallback && resolvedBackground.usedFallback) {
      toast(resolvedBackground.source ? "That wallpaper could not be loaded. Using the first available local wallpaper." : "That wallpaper could not be loaded. Using the default background color.");
    }
  }

  appState.settings = resolvedSettings;
  try {
    await saveSettings(appState.settings);
  } catch (error) {
    appState.settings = previousSettings;
    backgroundNeedsValidation = true;
    updateAppearance();
    throw error;
  }
  updateAppearance();
}

async function updateDashboard(nextDashboard) {
  await saveDashboard(nextDashboard);
  appState.dashboard = nextDashboard;
}

async function exportDashboardData() {
  const wallpaper = await loadWallpaper();
  return createBackupJSON({
    dashboard: appState.dashboard,
    settings: appState.settings,
    wallpaper: wallpaper instanceof Blob ? wallpaper : null,
  });
}

async function importDashboardData(jsonText) {
  const backup = parseBackupJSON(jsonText);
  let nextSettings = backup.settings;

  if (backup.wallpaper) {
    await saveWallpaper(backup.wallpaper);
  } else {
    try {
      await removeWallpaper();
    } catch (error) {
      console.warn("Could not clear the previous custom wallpaper:", error);
    }
  }

  setWallpaperUrl(backup.wallpaper);
  const resolvedBackground = await resolveBackgroundSelection(nextSettings, currentWallpaperUrl, wallpaperPresets);
  nextSettings = resolvedBackground.settings;
  backgroundNeedsValidation = false;

  await Promise.all([saveDashboard(backup.dashboard), saveSettings(nextSettings)]);
  appState = { dashboard: backup.dashboard, settings: nextSettings };
  tabsController.setDashboard(appState.dashboard);
  settingsController.setWallpaperAvailable(backup.wallpaper instanceof Blob);
  updateAppearance();
  return true;
}

async function handleWallpaperFile(file) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Please choose a PNG, JPG, WEBP, or AVIF image.");
  }
  if (file.size > MAX_WALLPAPER_SIZE) {
    throw new Error("That image is too large. Please choose an image under 8 MB.");
  }

  await saveWallpaper(file);
  setWallpaperUrl(file);
  settingsController?.setWallpaperAvailable(true);
}

async function bootstrap() {
  try {
    appState = await loadAppState();
    wallpaperPresets = await loadWallpaperPresets();

    let storedWallpaper = null;
    try {
      storedWallpaper = await loadWallpaper();
    } catch (error) {
      console.warn("Local wallpaper storage is unavailable:", error);
    }
    const wallpaperAvailable = storedWallpaper instanceof Blob;
    if (wallpaperAvailable) setWallpaperUrl(storedWallpaper);

    const previousSettings = appState.settings;
    const resolvedBackground = await resolveBackgroundSelection(appState.settings, currentWallpaperUrl, wallpaperPresets);
    appState.settings = resolvedBackground.settings;
    backgroundNeedsValidation = false;
    if (JSON.stringify(previousSettings) !== JSON.stringify(appState.settings)) {
      await saveSettings(appState.settings);
    }

    applyAppearance(appState.settings, currentWallpaperUrl, wallpaperPresets);
    document.documentElement.classList.remove("is-booting");

    tabsController = initializeTabs({
      tabList: document.getElementById("tab-list"),
      groupGrid: document.getElementById("group-grid"),
      dashboard: appState.dashboard,
      onDashboardChange: updateDashboard,
      onToast: toast,
      getOpenLinksInNewTab: () => appState.settings.openLinksInNewTab,
    });

    searchController = initializeSearch({
      form: document.getElementById("search-form"),
      input: document.getElementById("search-input"),
      settings: appState.settings,
      onToast: toast,
    });

    initializeClock(document.getElementById("clock-time"), document.getElementById("clock-date"));

    settingsController = initializeSettings({
      dialog: document.getElementById("appearance-dialog"),
      settings: appState.settings,
      wallpaperAvailable,
      wallpaperPresets,
      onSettingsChange: updateSettings,
      onWallpaperFile: handleWallpaperFile,
      getWallpaperUrl: () => currentWallpaperUrl,
      onToast: toast,
    });

    preferencesController = initializePreferences({
      dialog: document.getElementById("preferences-dialog"),
      settings: appState.settings,
      onSettingsChange: updateSettings,
      onToast: toast,
    });

    weatherController = initializeWeather({
      element: document.getElementById("weather-status"),
      city: appState.settings.weatherCity,
      location: appState.settings.weatherLocation,
      enabled: appState.settings.showClockAndWeather,
    });

    initializeFloatingActionMenu({
      menu: document.getElementById("floating-action-menu"),
      toggle: document.getElementById("floating-menu-toggle"),
    });

    initializeLinkSearch({
      dialog: document.getElementById("link-search-dialog"),
      openButton: document.getElementById("open-link-search-button"),
      input: document.getElementById("link-search-input"),
      results: document.getElementById("link-search-results"),
      emptyState: document.getElementById("link-search-empty"),
      getDashboard: () => appState.dashboard,
      getOpenLinksInNewTab: () => appState.settings.openLinksInNewTab,
    });

    initializeDataTransfer({
      importActions: [
        { button: document.getElementById("import-data-button"), fileInput: document.getElementById("import-data-input") },
        { button: document.getElementById("settings-import-button"), fileInput: document.getElementById("settings-import-input") },
      ],
      exportButtons: [document.getElementById("export-data-button"), document.getElementById("settings-export-button")],

      onExport: exportDashboardData,
      onImport: importDashboardData,
      onToast: toast,
    });

    updateAppearance();

    subscribeToStorageChanges((changes) => {
      const dashboardChange = changes[STORAGE_KEYS.dashboard];
      const settingsChange = changes[STORAGE_KEYS.settings];

      if (dashboardChange?.newValue) {
        appState.dashboard = dashboardChange.newValue;
        tabsController.setDashboard(appState.dashboard);
      }

      if (settingsChange?.newValue) {
        void (async () => {
          const previousSettings = appState.settings;
          appState.settings = settingsChange.newValue;
          try {
            const latestWallpaper = await loadWallpaper();
            setWallpaperUrl(latestWallpaper instanceof Blob ? latestWallpaper : null);
            settingsController.setWallpaperAvailable(latestWallpaper instanceof Blob);
          } catch (error) {
            console.warn("Could not refresh the saved wallpaper:", error);
            setWallpaperUrl(null);
            settingsController.setWallpaperAvailable(false);
          }

          const resolvedBackground = await resolveBackgroundSelection(appState.settings, currentWallpaperUrl, wallpaperPresets);
          appState.settings = resolvedBackground.settings;
          backgroundNeedsValidation = false;
          if (JSON.stringify(previousSettings) !== JSON.stringify(appState.settings)) {
            await saveSettings(appState.settings);
          }
          updateAppearance();
        })();
      }
    });
  } catch (error) {
    document.documentElement.classList.remove("is-booting");
    console.error("Could not initialize the new-tab dashboard:", error);
    toast("The dashboard could not load. Please refresh this tab.");
  }
}

bootstrap();
