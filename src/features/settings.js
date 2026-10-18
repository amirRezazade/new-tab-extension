import { DEFAULT_SETTINGS } from "../data/defaults.js";

const ACCENT_SWATCHES = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Red", value: "#ed1835" },
  { name: "Orange", value: "#f97316" },
  { name: "Burnt orange", value: "#c65d35" },
  { name: "Indigo", value: "#6055ed" },
  { name: "Purple", value: "#9b52f5" },
  { name: "Teal", value: "#3b8190" },
  { name: "Cyan", value: "#08b7d1" },
  { name: "Green", value: "#10bd7a" },
  { name: "Pink", value: "#ed4c9b" },
  { name: "Mauve", value: "#805187" },
  { name: "Peach", value: "#efbd80" },
  { name: "Tan", value: "#c49a75" },
  { name: "Periwinkle", value: "#7887ff" },
  { name: "Coral", value: "#e04743" },
];

const TEXT_SWATCHES = [
  { name: "White", value: "#f5f5f6" },
  { name: "Light gray", value: "#d7d7d7" },
  { name: "Gray", value: "#929292" },
  { name: "Dark gray", value: "#4a4a4a" },
  { name: "Black", value: "#000000" },
  { name: "Cool white", value: "#f0f2ff" },
  { name: "Deep charcoal", value: "#17201f" },
];

const THEME_DEFAULT_COLORS = {
  ember: { primaryColor: "#ed1835", textColor: "#f5f5f6" },
  midnight: { primaryColor: "#7887ff", textColor: "#f0f2ff" },
  daylight: { primaryColor: "#e04743", textColor: "#17201f" },
};

export function initializeSettings({
  dialog,
  settings,
  wallpaperAvailable,
  wallpaperPresets = [],
  onSettingsChange,
  onWallpaperFile,
  getWallpaperUrl,
  onToast,
}) {
  let currentSettings = settings;
  let hasWallpaper = Boolean(wallpaperAvailable);
  let activePanel = "wallpaper";

  const accentSwatches = document.getElementById("accent-color-swatches");
  const textSwatches = document.getElementById("text-color-swatches");
  const blurInput = document.getElementById("group-blur-input");
  const blurValue = document.getElementById("group-blur-value");
  const opacityInput = document.getElementById("card-opacity-input");
  const opacityValue = document.getElementById("card-opacity-value");
  const imageInput = document.getElementById("wallpaper-file-input");
  const wallpaperGallery = document.getElementById("wallpaper-gallery");
  const openWallpaperButton = document.getElementById("open-wallpaper-button");
  const panelTabs = [...dialog.querySelectorAll("[data-appearance-tab]")];
  const panels = [...dialog.querySelectorAll("[data-appearance-panel]")];

  const getActiveColor = (settingKey) => currentSettings[settingKey]
    || THEME_DEFAULT_COLORS[currentSettings.theme]?.[settingKey]
    || DEFAULT_SETTINGS[settingKey];

  const createColorSwatches = (container, choices, settingKey, label) => {
    const activeColor = getActiveColor(settingKey).toLowerCase();
    const displayedChoices = choices.some(({ value }) => value === activeColor)
      ? choices
      : [{ name: "Saved color", value: activeColor }, ...choices];
    const buttons = displayedChoices.map(({ name, value }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-swatch";
      button.style.setProperty("--swatch-color", value);
      button.dataset.colorValue = value;
      button.setAttribute("aria-label", `${label}: ${name}`);
      button.title = name;
      button.addEventListener("click", () => {
        void update({ [settingKey]: value });
      });
      return button;
    });
    container.replaceChildren(...buttons);
  };

  const renderColorSwatches = () => {
    const activeAccent = getActiveColor("primaryColor").toLowerCase();
    const activeText = getActiveColor("textColor").toLowerCase();
    accentSwatches.querySelectorAll("[data-color-value]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.colorValue === activeAccent));
    });
    textSwatches.querySelectorAll("[data-color-value]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.colorValue === activeText));
    });
  };

  const createWallpaperCard = ({ id, name, src, isCustom = false }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "wallpaper-card";
    button.dataset.wallpaperPreset = id;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `Use ${name} wallpaper`);

    const image = document.createElement("img");
    image.className = "wallpaper-card__image";
    image.src = src;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";

    const caption = document.createElement("span");
    caption.className = "wallpaper-card__name";
    caption.textContent = name;
    button.append(image, caption);
    button.addEventListener("click", () => {
      void update({ backgroundMode: "image", wallpaperPreset: isCustom ? "custom" : id });
    });
    return button;
  };

  const renderWallpaperGallery = () => {
    const cards = [];
    const savedWallpaperUrl = getWallpaperUrl?.() || null;
    if (hasWallpaper && savedWallpaperUrl) {
      cards.push(createWallpaperCard({ id: "custom", name: "My wallpaper", src: savedWallpaperUrl, isCustom: true }));
    }
    wallpaperPresets.forEach((preset) => cards.push(createWallpaperCard(preset)));
    wallpaperGallery.replaceChildren(...cards);
  };

  const setActivePanel = (panelName) => {
    activePanel = panelName === "theme" ? "theme" : "wallpaper";
    panelTabs.forEach((tab) => {
      const selected = tab.dataset.appearanceTab === activePanel;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.appearancePanel !== activePanel;
    });
  };

  function render() {
    blurInput.value = String(currentSettings.groupBlur);
    blurValue.textContent = `${currentSettings.groupBlur}px`;
    opacityInput.value = String(currentSettings.cardOpacity);
    opacityValue.textContent = `${currentSettings.cardOpacity}%`;

    renderColorSwatches();
    wallpaperGallery.querySelectorAll("[data-wallpaper-preset]").forEach((button) => {
      const preset = button.dataset.wallpaperPreset;
      const isCustom = preset === "custom";
      const selected = currentSettings.backgroundMode === "image" && (
        isCustom
          ? currentSettings.wallpaperPreset === "custom" || !currentSettings.wallpaperPreset
          : currentSettings.wallpaperPreset === preset
      );
      button.setAttribute("aria-pressed", String(selected));
    });
  }

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
      onToast("Could not save that appearance setting.");
      return false;
    }
  };

  const open = ({ panel = "wallpaper" } = {}) => {
    setActivePanel(panel);
    if (!dialog.open) dialog.showModal();
    openWallpaperButton.setAttribute("aria-expanded", String(dialog.open));
  };

  openWallpaperButton.addEventListener("click", () => open({ panel: "wallpaper" }));

  dialog.addEventListener("close", () => openWallpaperButton.setAttribute("aria-expanded", "false"));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("keydown", (event) => {
    if (!(event.target instanceof Element) || !event.target.matches("[data-appearance-tab]")) return;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = panelTabs.indexOf(event.target);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? panelTabs.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + panelTabs.length) % panelTabs.length;
    const nextTab = panelTabs[nextIndex];
    setActivePanel(nextTab.dataset.appearanceTab);
    nextTab.focus();
  });

  panelTabs.forEach((tab) => {
    tab.addEventListener("click", () => setActivePanel(tab.dataset.appearanceTab));
  });

  createColorSwatches(accentSwatches, ACCENT_SWATCHES, "primaryColor", "Accent color");
  createColorSwatches(textSwatches, TEXT_SWATCHES, "textColor", "Text color");

  blurInput.addEventListener("input", () => {
    void update({ groupBlur: Number(blurInput.value) });
  });

  opacityInput.addEventListener("input", () => {
    void update({ cardOpacity: Number(opacityInput.value) });
  });

  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    imageInput.value = "";
    if (!file) return;

    try {
      await onWallpaperFile(file);
      hasWallpaper = true;
      renderWallpaperGallery();
      const saved = await update({ backgroundMode: "image", wallpaperPreset: "custom" });
      if (saved) onToast("Wallpaper saved on this device.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not save that image.");
    }
  });

  renderWallpaperGallery();
  setActivePanel(activePanel);
  render();

  return {
    open,
    setSettings(nextSettings) {
      currentSettings = nextSettings;
      render();
    },
    setWallpaperAvailable(available) {
      hasWallpaper = Boolean(available);
      renderWallpaperGallery();
      render();
    },
  };
}
