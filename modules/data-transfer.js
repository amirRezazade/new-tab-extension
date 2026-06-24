import { state, saveState } from "./state.js";
import { renderTabs } from "./tabs.js";
import { renderGroups } from "./groups.js";
import { openConfirmModal } from "./modals.js";
import { applyTheme } from "./theme.js";

export function exportData() {
  // والپیپر کاستوم (base64) رو نبر، فقط preset (URL) رو ببر
  const dataToExport = {
    activeTab: state.activeTab,
    tabOrder: state.tabOrder,
    tabs: state.tabs,
    theme: state.theme,
    wallpaper: state.wallpaper && state.wallpaper.startsWith("../images") ? state.wallpaper : null,
  };

  const json = JSON.stringify(dataToExport, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `newtab-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);

      // اعتبارسنجی فایل
      if (!imported.tabs || !imported.tabOrder) {
        alert("فایل معتبر نیست!");
        return;
      }

      openConfirmModal({
        title: "Import Data",
        message: "تب‌های موجود تو فایل به تب‌های فعلی اضافه می‌شن. تم هم آپدیت می‌شه. مطمئنی؟",
        danger: false,
        confirmText: "Import",
        onConfirm: () => {
          // تب‌ها رو merge کن (نه جایگزین)
          Object.assign(state.tabs, imported.tabs);

          // tabOrder های جدید رو اضافه کن (تکراری نباشن)
          imported.tabOrder.forEach((id) => {
            if (!state.tabOrder.includes(id)) {
              state.tabOrder.push(id);
            }
          });

          // تم رو اعمال کن
          if (imported.theme) {
            state.theme = imported.theme;
            applyTheme(imported.theme);
          }

          // والپیپر فقط اگه preset بود (URL)

          if (imported.wallpaper && imported.wallpaper.startsWith("../images")) {
            state.wallpaper = imported.wallpaper;
            document.body.style.backgroundImage = `url('${imported.wallpaper}')`;
            chrome.storage.local.set({ wallpaper: imported.wallpaper });
          }

          saveState();
          renderTabs();
          renderGroups();
        },
      });
    } catch {
      alert("خطا در خواندن فایل!");
    }
  };

  reader.readAsText(file);
}
