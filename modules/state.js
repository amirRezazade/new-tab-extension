import { starterWallpapers } from "./wallpaper.js";

const storage = chrome.storage.sync;
// const storage = chrome.storage.local;
let state = {
  activeTab: "home",
  wallpaper: null,
  tabOrder: ["home"],
  tabs: {
    home: {
      name: "Home",
      groups: [
        {
          title: "Work",
          links: [
            { name: "Notion", url: "https://notion.so" },
            { name: "Figma", url: "https://figma.com" },
          ],
        },
        {
          title: "Reading",
          links: [
            { name: "Hacker News", url: "https://news.ycombinator.com" },
            { name: "Medium", url: "https://medium.com" },
          ],
        },
      ],
    },
  },
};
let saveTimer = null;

function saveState() {
  // اگه تایمر قبلی بود، کنسلش کن
  if (saveTimer) clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    const { wallpaper, ...stateWithoutWallpaper } = state;

    // فقط اگه preset بود (URL)، تو sync ذخیره کن
    const wallpaperToSync = wallpaper?.startsWith("http") ? wallpaper : null;

    storage.set({ appState: { ...stateWithoutWallpaper, wallpaper: wallpaperToSync } });
    chrome.storage.local.set({ wallpaper }); // همیشه local هم ذخیره کن
  }, 500);
}
function loadState(callback) {
  storage.get(["appState"], (syncResult) => {
    // اول local رو چک کن (اولویت بالاتره چون آخرین انتخاب کاربره)
    chrome.storage.local.get(["wallpaper"], (localResult) => {
      if (syncResult.appState) {
        Object.assign(state, syncResult.appState);
      }
      if (!state.wallpaper) {
        state.wallpaper = starterWallpapers[0].url;
      }
      if (localResult.wallpaper) {
        state.wallpaper = localResult.wallpaper;
        document.body.style.backgroundImage = `url('${localResult.wallpaper}')`;
      } else if (state.wallpaper?.startsWith("http")) {
        // اگه local نبود ولی sync داشت (preset)، از sync بخون
        document.body.style.backgroundImage = `url('${state.wallpaper}')`;
      }

      if (!state.tabOrder) {
        state.tabOrder = Object.keys(state.tabs);
      }

      callback();
    });
  });
}
function saveStateNow() {
  if (saveTimer) clearTimeout(saveTimer);
  const { wallpaper, ...stateWithoutWallpaper } = state;
  storage.set({ appState: stateWithoutWallpaper });
  chrome.storage.local.set({ wallpaper });
}
export { state, saveState, loadState, saveStateNow };
