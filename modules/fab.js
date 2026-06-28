import { exportData, importData } from "./data-transfer.js";
import { state } from "./state.js";

export function initFab() {
  const fabMain = document.getElementById("fabMain");
  const fabMenu = document.getElementById("fabMenu");

  // باز/بسته کردن منو
  fabMain.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = fabMenu.classList.contains("open");
    fabMenu.classList.toggle("open");
    fabMain.classList.toggle("open");

    const cityInput = document.getElementById("settingCity");

    cityInput.value = state.settings?.city || "";
  });

  // بستن با کلیک بیرون
  document.addEventListener("click", (e) => {
    if (!document.getElementById("fabContainer").contains(e.target)) {
      fabMenu.classList.remove("open");
      fabMain.classList.remove("open");
    }
  });
}

document.getElementById("fabExport").addEventListener("click", exportData);
document.getElementById("fabImport").addEventListener("click", () => {
  document.getElementById("settingImportFile").click();
});
