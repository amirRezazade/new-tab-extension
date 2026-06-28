import { starterWallpapers } from "./wallpaper.js";

const storage = chrome.storage.sync;

let state = {
  activeTab: "home",
  wallpaper: "../images/wallpapers/11.jpg",
  tabOrder: ["home", "work"],
  tabs: {
    home: {
      name: "Home",
      groups: [
        {
          id: "group-default-1",
          title: "Social",
          links: [
            { name: "YouTube", url: "https://youtube.com" },
            { name: "Twitter", url: "https://twitter.com" },
            { name: "Instagram", url: "https://instagram.com" },
          ],
        },
        {
          id: "group-default-2",
          title: "Tools",
          links: [
            { name: "Gmail", url: "https://gmail.com" },
            { name: "Google Drive", url: "https://drive.google.com" },
            { name: "Google Translate", url: "https://translate.google.com" },
          ],
        },
      ],
      columns: [["group-default-1"], ["group-default-2"], [], []],
    },
    work: {
      name: "Work",
      groups: [
        {
          id: "group-default-3",
          title: "Design",
          links: [
            { name: "Figma", url: "https://figma.com" },
            { name: "Dribbble", url: "https://dribbble.com" },
          ],
        },
        {
          id: "group-default-4",
          title: "Dev",
          links: [
            { name: "GitHub", url: "https://github.com" },
            { name: "Stack Overflow", url: "https://stackoverflow.com" },
            { name: "MDN", url: "https://developer.mozilla.org" },
          ],
        },
      ],
      columns: [["group-default-3"], ["group-default-4"], [], []],
    },
  },
  theme: {
    accent: "#c09772",
    textColor: "#F8FAFC",
    blur: 0,
    opacity: 0,
  },
  settings: {
    showClock: true,
    showSearch: true,
    openInNewTab: true,
    city: "تبریز",
    cityLat: 38.0962,
    cityLon: 46.2738,
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
      if (localResult.wallpaper) {
        state.wallpaper = localResult.wallpaper;
        document.body.style.backgroundImage = `url('${localResult.wallpaper}')`;
      } else if (state.wallpaper) {
        document.body.style.backgroundImage = `url('${state.wallpaper}')`;
      }

      if (!state.tabOrder) {
        state.tabOrder = Object.keys(state.tabs);
      }
      if (!state.tabs[state.activeTab]) {
        state.activeTab = state.tabOrder[0];
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
