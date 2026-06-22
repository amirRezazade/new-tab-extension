let state = {
  activeTab: "home",
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
  chrome.storage.local.set({ appState: state });
}
function loadState(callback) {
  chrome.storage.local.get(["appState"], (result) => {
    if (result.appState) {
      state = result.appState;
    }
    callback(); // بعد از لود شدن، رندر کن
  });
}

export { state, saveState, loadState };
