import { DEFAULT_SETTINGS } from "../data/defaults.js";
import { initializeCityPicker } from "./city-picker.js";

const TOGGLE_KEYS = ["showClockAndWeather", "showSearch", "openLinksInNewTab"];

export function initializePreferences({ dialog, settings, onSettingsChange, onToast }) {
  let currentSettings = settings;
  let cityPicker;
  const openButton = document.getElementById("open-settings-button");
  const closeButton = document.getElementById("close-preferences-button");
  const cityForm = document.getElementById("weather-city-form");
  const cityInput = document.getElementById("weather-city-input");
  const toggleButtons = [...dialog.querySelectorAll("[data-setting-toggle]")];

  const render = () => {
    toggleButtons.forEach((button) => {
      const key = button.dataset.settingToggle;
      const enabled = currentSettings[key] !== false;
      button.setAttribute("aria-checked", String(enabled));
      button.title = enabled ? "On" : "Off";
    });
    if (cityPicker) cityPicker.setSelected(currentSettings.weatherLocation, currentSettings.weatherCity || DEFAULT_SETTINGS.weatherCity);
    else cityInput.value = currentSettings.weatherCity || DEFAULT_SETTINGS.weatherCity;
  };

  const update = async (patch) => {
    const previousSettings = currentSettings;
    currentSettings = { ...currentSettings, ...patch };
    render();
    try {
      await onSettingsChange(currentSettings);
      return true;
    } catch {
      currentSettings = previousSettings;
      render();
      onToast("Could not save that setting.");
      return false;
    }
  };

  const open = () => {
    if (!dialog.open) dialog.showModal();
    openButton.setAttribute("aria-expanded", String(dialog.open));
  };

  cityPicker = initializeCityPicker({
    input: cityInput,
    listbox: document.getElementById("weather-city-suggestions"),
    wrapper: document.getElementById("weather-city-picker"),
    initialCity: currentSettings.weatherCity || DEFAULT_SETTINGS.weatherCity,
    initialLocation: currentSettings.weatherLocation,
    onSelect: (location) => {
      void update({ weatherCity: location.name, weatherLocation: location });
    },
  });

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.settingToggle;
      if (!TOGGLE_KEYS.includes(key)) return;
      void update({ [key]: currentSettings[key] === false });
    });
  });

  openButton.addEventListener("click", open);
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    openButton.setAttribute("aria-expanded", "false");
    document.getElementById("floating-menu-toggle")?.focus({ preventScroll: true });
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  cityForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void cityPicker.submit();
  });

  render();
  return {
    open,
    setSettings(nextSettings) {
      currentSettings = nextSettings;
      render();
    },
  };
}
