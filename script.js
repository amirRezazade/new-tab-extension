import { state, loadState } from "./modules/state.js";
import { renderTabs } from "./modules/tabs.js";
import { renderGroups } from "./modules/groups.js";
import { initSearch } from "./modules/search.js";
import { initWallpaper } from "./modules/wallpaper.js";
import { initTheme } from "./modules/theme.js";
import { initFab } from "./modules/fab.js";
import { initSettings } from "./modules/setting.js";
import { initSearchLinks } from "./modules/search-links.js";
import { initSortable } from "./modules/sortable.js";
import { initWeather } from "./modules/weather.js";

loadState(() => {
  renderTabs();
  renderGroups();
  initSearch();
  initWallpaper();
  initTheme();
  initFab();
  initSettings();
  initSearchLinks();
  initWeather();
  initSortable();
});

// بستن منو با کلیک هر جای دیگه صفحه
