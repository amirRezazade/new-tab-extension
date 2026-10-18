import { getBackgroundImageSource } from "./appearance.js";

const IMAGE_LOAD_TIMEOUT_MS = 5000;

export function preloadBackgroundImage(source) {
  if (typeof source !== "string" || !source) return Promise.resolve(false);
  if (typeof globalThis.Image !== "function") return Promise.resolve(true);

  return new Promise((resolve) => {
    const image = new globalThis.Image();
    let settled = false;
    const timeoutId = globalThis.setTimeout(() => finish(false), IMAGE_LOAD_TIMEOUT_MS);

    const finish = (loaded) => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timeoutId);
      image.removeEventListener("load", onLoad);
      image.removeEventListener("error", onError);
      resolve(Boolean(loaded && image.naturalWidth > 0 && image.naturalHeight > 0));
    };
    const onLoad = () => finish(true);
    const onError = () => finish(false);

    image.addEventListener("load", onLoad, { once: true });
    image.addEventListener("error", onError, { once: true });

    try {
      const baseUrl = globalThis.document?.baseURI;
      image.src = baseUrl ? new URL(source, baseUrl).href : source;
      if (image.complete) finish(image.naturalWidth > 0 && image.naturalHeight > 0);
      if (typeof image.decode === "function") {
        void image.decode().then(() => finish(true), () => {
          if (image.complete) finish(image.naturalWidth > 0 && image.naturalHeight > 0);
        });
      }
    } catch {
      finish(false);
    }
  });
}

export async function resolveBackgroundSelection(settings, wallpaperUrl, wallpaperPresets = []) {
  const selectedSource = getBackgroundImageSource(settings, wallpaperUrl, wallpaperPresets);
  if (selectedSource && await preloadBackgroundImage(selectedSource)) {
    return { settings, source: selectedSource, usedFallback: false };
  }

  const attemptedSources = new Set(selectedSource ? [selectedSource] : []);
  for (const preset of wallpaperPresets) {
    if (!preset?.id || !preset?.src || attemptedSources.has(preset.src)) continue;
    attemptedSources.add(preset.src);
    if (!await preloadBackgroundImage(preset.src)) continue;

    return {
      settings: { ...settings, backgroundMode: "image", wallpaperPreset: preset.id },
      source: preset.src,
      usedFallback: true,
    };
  }

  const fallbackMode = settings.backgroundMode === "solid" ? "solid" : "scene";
  return {
    settings: { ...settings, backgroundMode: fallbackMode, wallpaperPreset: null },
    source: null,
    usedFallback: Boolean(selectedSource || settings.backgroundMode === "image"),
  };
}
