import { state, loadState } from "./modules/state.js";
import { renderTabs } from "./modules/tabs.js";
import { renderGroups } from "./modules/groups.js";
import { initSearch } from "./modules/search.js";
import { initWallpaper } from "./modules/wallpaper.js";
import { initTheme } from "./modules/theme.js";

loadState(() => {
  renderTabs();
  renderGroups();
  initSearch();
  initWallpaper();
  initTheme();
});

// بستن منو با کلیک هر جای دیگه صفحه
