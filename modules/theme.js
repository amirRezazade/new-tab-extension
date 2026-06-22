import { state, saveState } from "./state.js";

const colorPresets = [
  "#3b82f6", // آبی
  "#8b5cf6", // بنفش
  "#10b981", // سبز
  "#f59e0b", // نارنجی
  "#ef4444", // قرمز
  "#ec4899", // صورتی
  "#06b6d4", // فیروزه‌ای
  "#ffffff", // سفید
];

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--card-blur", `${theme.blur}px`);
  root.style.setProperty("--card-opacity", theme.opacity / 100);
}

function renderColorPresets() {
  const container = document.getElementById("colorPresets");
  container.innerHTML = "";

  colorPresets.forEach((color) => {
    const btn = document.createElement("button");
    btn.className = "color-preset" + (state.theme?.accent === color ? " active" : "");
    btn.style.background = color;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.theme.accent = color;
      document.getElementById("accentColorPicker").value = color;
      applyTheme(state.theme);
      saveState();
      renderColorPresets();
    });
    container.appendChild(btn);
  });
}

export function initTheme() {
  // مقدار پیش‌فرض اگه theme تو state نبود
  if (!state.theme) {
    state.theme = { accent: "#3b82f6", blur: 12, opacity: 12 };
  }

  applyTheme(state.theme);

  // سوئیچ بین تب‌های پنل
  document.querySelectorAll(".panel-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".panel-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".panel-content").forEach((c) => (c.style.display = "none"));
      tab.classList.add("active");
      document.getElementById("panel" + tab.dataset.panel.charAt(0).toUpperCase() + tab.dataset.panel.slice(1)).style.display = "block";
      if (tab.dataset.panel === "theme") renderColorPresets();
    });
  });

  // color picker سفارشی
  const picker = document.getElementById("accentColorPicker");
  picker.value = state.theme.accent;
  picker.addEventListener("input", (e) => {
    e.stopPropagation();
    state.theme.accent = e.target.value;
    applyTheme(state.theme);
    saveState();
    renderColorPresets();
  });

  // blur slider
  const blurRange = document.getElementById("blurRange");
  blurRange.value = state.theme.blur;
  blurRange.addEventListener("input", (e) => {
    e.stopPropagation();
    state.theme.blur = parseInt(e.target.value);
    document.getElementById("blurValue").textContent = e.target.value;
    applyTheme(state.theme);
    saveState();
  });

  // opacity slider
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
