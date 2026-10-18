const SAFE_THEMES = new Set(["ember", "midnight", "daylight"]);
const SAFE_BACKGROUND_MODES = new Set(["scene", "solid", "image"]);
const isHexColor = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

export function getBackgroundImageSource(settings, wallpaperUrl = null, wallpaperPresets = []) {
  const backgroundMode = SAFE_BACKGROUND_MODES.has(settings.backgroundMode) ? settings.backgroundMode : "scene";
  if (backgroundMode !== "image") return null;
  const preset = wallpaperPresets.find((entry) => entry.id === settings.wallpaperPreset);
  return preset?.src || (settings.wallpaperPreset === "custom" || !settings.wallpaperPreset ? wallpaperUrl : null);
}

export function applyAppearance(settings, wallpaperUrl = null, wallpaperPresets = []) {
  const root = document.documentElement;
  const theme = SAFE_THEMES.has(settings.theme) ? settings.theme : "ember";
  const backgroundMode = SAFE_BACKGROUND_MODES.has(settings.backgroundMode) ? settings.backgroundMode : "scene";
  root.dataset.theme = theme;
  root.dataset.backgroundMode = backgroundMode;

  const backgroundColor = isHexColor(settings.backgroundColor) ? settings.backgroundColor : "#101817";
  root.style.setProperty("--user-background-color", backgroundColor);

  if (isHexColor(settings.primaryColor)) {
    root.style.setProperty("--user-primary-color", settings.primaryColor);
  } else {
    root.style.removeProperty("--user-primary-color");
  }

  if (isHexColor(settings.textColor)) {
    root.style.setProperty("--user-text-color", settings.textColor);
  } else {
    root.style.removeProperty("--user-text-color");
  }

  const blur = Number.isFinite(settings.groupBlur) ? Math.min(28, Math.max(0, settings.groupBlur)) : 0;
  const opacity = Number.isFinite(settings.cardOpacity) ? Math.min(100, Math.max(0, settings.cardOpacity)) : 0;
  root.style.setProperty("--group-blur", `${blur}px`);
  root.style.setProperty("--group-opacity", `${opacity}%`);

  const imageSource = getBackgroundImageSource({ ...settings, backgroundMode }, wallpaperUrl, wallpaperPresets);

  if (imageSource) {
    root.style.setProperty("--wallpaper-image", `url("${imageSource}")`);
  } else {
    root.style.removeProperty("--wallpaper-image");
  }
}
