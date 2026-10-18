const WALLPAPER_MANIFEST_URL = new URL("../../assets/wallpapers/manifest.json", import.meta.url);
const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const SAFE_IMAGE_PATH = /^assets\/wallpapers\/[a-z0-9][a-z0-9 _.-]*\.(?:png|jpe?g|webp|avif)$/i;

export async function loadWallpaperPresets() {
  try {
    const response = await fetch(WALLPAPER_MANIFEST_URL);
    if (!response.ok) return [];

    const entries = await response.json();
    if (!Array.isArray(entries)) return [];

    const usedIds = new Set();
    return entries.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const id = typeof entry.id === "string" ? entry.id.trim() : "";
      const name = typeof entry.name === "string" ? entry.name.trim().slice(0, 64) : "";
      const path = typeof entry.src === "string" ? entry.src.replace(/^\.\//, "") : "";
      if (!SAFE_ID.test(id) || id === "custom" || !name || !SAFE_IMAGE_PATH.test(path) || usedIds.has(id)) return [];
      usedIds.add(id);
      return [{ id, name, src: new URL(`../../${path}`, import.meta.url).href }];
    });
  } catch {
    return [];
  }
}
