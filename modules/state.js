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
function saveState() {
  storage.set({ appState: state });
}
function loadState(callback) {
  storage.get(["appState"], (result) => {
    if (result.appState) {
      Object.assign(state, result.appState);
    }

    // اگه tabOrder نداشت (state قدیمی)، از tabs بسازش
    if (!state.tabOrder) {
      state.tabOrder = Object.keys(state.tabs);
    }

    if (state.wallpaper) {
      document.body.style.backgroundImage = `url('${state.wallpaper}')`;
    }

    callback();
  });
}
export { state, saveState, loadState };
