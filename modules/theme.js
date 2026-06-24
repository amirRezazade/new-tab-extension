import { state, saveState } from "./state.js";

const accentColors = ["#3b82f6", "#E31227", "#F97316", "#C4673A", "#635BFF", "#955CFE", "#3D7D8F", "#06B6D4", "#0AC272", "#EC4899", "#794785", "#EBBE84", "#C09772"];
const textColors = ["#F8FAFC", "#dcdcdc", "#838383", "#454545", "#000000"];

export function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--text-color", theme.textColor);
  root.style.setProperty("--card-blur", `${theme.blur}px`);
  root.style.setProperty("--card-opacity", theme.opacity / 100);
}

function renderPresets(containerId, colors, currentColor, onSelect) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  console.log(colors);

  colors.forEach((color) => {
    const btn = document.createElement("button");
    btn.className = "color-preset" + (currentColor === color ? " active" : "");
    btn.style.background = color;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onSelect(color);
    });
    container.appendChild(btn);
  });
}

export function initTheme() {
  if (!state.theme) {
    state.theme = {
      accent: "#3b82f6",
      textColor: "#ffffff",
      blur: 12,
      opacity: 12,
    };
  }

  applyTheme(state.theme);

  // سوئیچ تب‌های پنل
  document.querySelectorAll(".panel-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".panel-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".panel-content").forEach((c) => (c.style.display = "none"));
      tab.classList.add("active");
      const panelId = "panel" + tab.dataset.panel.charAt(0).toUpperCase() + tab.dataset.panel.slice(1);
      document.getElementById(panelId).style.display = "block";
      if (tab.dataset.panel === "theme") renderThemePresets();
    });
  });

  // blur
  const blurRange = document.getElementById("blurRange");
  blurRange.value = state.theme.blur;
  blurRange.addEventListener("input", (e) => {
    e.stopPropagation();
    state.theme.blur = parseInt(e.target.value);
    document.getElementById("blurValue").textContent = e.target.value;
    applyTheme(state.theme);
    saveState();
  });

  // opacity
  const opacityRange = document.getElementById("opacityRange");
  opacityRange.value = state.theme.opacity;
  opacityRange.addEventListener("input", (e) => {
    e.stopPropagation();
    state.theme.opacity = parseInt(e.target.value);
    document.getElementById("opacityValue").textContent = e.target.value;
    applyTheme(state.theme);
    saveState();
  });
}

function renderThemePresets() {
  renderPresets("accentPresets", accentColors, state.theme.accent, (color) => {
    state.theme.accent = color;
    applyTheme(state.theme);
    saveState();
    renderThemePresets();
  });

  renderPresets("textPresets", textColors, state.theme.textColor, (color) => {
    state.theme.textColor = color;
    applyTheme(state.theme);
    saveState();
    renderThemePresets();
  });
}
