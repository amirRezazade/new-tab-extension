import { state, saveState } from "./state.js";
import { renderTabs } from "./tabs.js";
import { renderGroups } from "./groups.js";
import { openConfirmModal } from "./modals.js";
import { applyTheme } from "./theme.js";
import { exportData, importData } from "./data-transfer.js";
import { initWeather } from "./weather.js";
// ساعت
let clockInterval = null;

function updateClock() {
  const now = new Date();

  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  document.getElementById("clockTime").textContent = time;
  document.getElementById("clockDate").textContent = date;
}

function applyClock(show) {
  const widget = document.getElementById("clockWidget");
  widget.style.display = show ? "block" : "none";

  if (show) {
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
  } else {
    clearInterval(clockInterval);
  }
}

function applySearchBar(show) {
  document.querySelector(".search-bar").style.display = show ? "flex" : "none";
}

function applyNewTab(enabled) {
  // همه لینک‌های موجود رو آپدیت کن
  document.querySelectorAll(".link-item").forEach((a) => {
    a.target = enabled ? "_blank" : "_self";
  });
}

export function initSettings() {
  // مقدار پیش‌فرض
  if (!state.settings) {
    state.settings = {
      showClock: true,
      showSearch: true,
      openInNewTab: true,
    };
  }

  // اعمال تنظیمات اولیه
  applyClock(state.settings.showClock);
  applySearchBar(state.settings.showSearch);

  // پر کردن مقادیر checkbox ها
  document.getElementById("settingClock").checked = state.settings.showClock;
  document.getElementById("settingSearch").checked = state.settings.showSearch;
  document.getElementById("settingNewTab").checked = state.settings.openInNewTab;

  // باز کردن پنل از دکمه FAB
  document.getElementById("fabSettings").addEventListener("click", () => {
    document.getElementById("settingsOverlay").classList.add("open");
  });

  // بستن پنل
  document.getElementById("settingsCloseBtn").addEventListener("click", () => {
    document.getElementById("settingsOverlay").classList.remove("open");
  });

  document.getElementById("settingsOverlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("settingsOverlay")) {
      document.getElementById("settingsOverlay").classList.remove("open");
    }
  });

  // toggle ها
  document.getElementById("settingClock").addEventListener("change", (e) => {
    state.settings.showClock = e.target.checked;
    applyClock(e.target.checked);
    saveState();
  });

  document.getElementById("settingSearch").addEventListener("change", (e) => {
    state.settings.showSearch = e.target.checked;
    applySearchBar(e.target.checked);
    saveState();
  });

  document.getElementById("settingNewTab").addEventListener("change", (e) => {
    state.settings.openInNewTab = e.target.checked;
    applyNewTab(e.target.checked);
    saveState();
  });

  // export
  document.getElementById("settingExport").addEventListener("click", exportData);

  // import
  document.getElementById("settingImport").addEventListener("click", () => {
    document.getElementById("settingImportFile").click();
  });

  document.getElementById("settingImportFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      importData(file);
      e.target.value = ""; // ریست کن که دوباره همون فایل رو بشه انتخاب کرد
    }
  });
}
const cityInput = document.getElementById("settingCity");
const suggestions = document.getElementById("citySuggestions");

cityInput.value = state.settings?.city || "";

cityInput.addEventListener("input", async (e) => {
  const query = e.target.value.trim();
  if (!query) {
    suggestions.style.display = "none";
    return;
  }

  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=fa&countryCode=IR`);
    const data = await res.json();

    if (!data.results?.length) {
      suggestions.style.display = "none";
      return;
    }

    suggestions.innerHTML = "";
    data.results.forEach((city) => {
      const btn = document.createElement("button");
      btn.className = "city-suggestion-item";
      btn.textContent = `${city.name} — ${city.admin1 || ""}`;
      btn.addEventListener("click", () => {
        // ذخیره lat/lon به‌جای اسم شهر
        state.settings.city = city.name;
        state.settings.cityLat = city.latitude;
        state.settings.cityLon = city.longitude;
        cityInput.value = city.name;
        suggestions.style.display = "none";
        saveState();
        initWeather();
      });
      suggestions.appendChild(btn);
    });

    suggestions.style.display = "flex";
  } catch {
    suggestions.style.display = "none";
  }
});

// بستن suggestions با کلیک بیرون
document.addEventListener("click", (e) => {
  if (!cityInput.contains(e.target) && !suggestions.contains(e.target)) {
    suggestions.style.display = "none";
  }
});
