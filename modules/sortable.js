import { state, saveStateNow } from "./state.js";
import { renderGroups } from "./groups.js";

export function initSortable() {
  const columns = document.querySelectorAll(".column");
  // درگ گروه‌ها بین ستون‌ها
  document.querySelectorAll(".column").forEach((colEl, colIndex) => {
    const sortable = Sortable.create(colEl, {
      group: "shared-groups",
      animation: 150,
      draggable: ".group",
      onEnd(evt) {
        const currentTab = state.tabs[state.activeTab];
        const fromCol = parseInt(evt.from.dataset.col);
        const toCol = parseInt(evt.to.dataset.col);

        const newColOrder = [...evt.to.querySelectorAll(".group")].map((el) => el.dataset.groupId).filter(Boolean);

        const fromColOrder = [...evt.from.querySelectorAll(".group")].map((el) => el.dataset.groupId).filter(Boolean);

        currentTab.columns[toCol] = newColOrder;
        if (fromCol !== toCol) {
          currentTab.columns[fromCol] = fromColOrder;
        }

        saveStateNow();
      },
    });
  });
}

export function initLinkSortable(groupEl, groupIndex) {
  Sortable.create(groupEl, {
    group: `links-${groupIndex}`,
    animation: 150,
    draggable: ".link-row",

    onEnd(evt) {
      const currentTab = state.tabs[state.activeTab];
      const links = currentTab.groups[groupIndex].links;

      // ترتیب جدید از DOM
      const newOrder = [...evt.to.querySelectorAll(".link-row")].map((el) => el.dataset.linkUrl).filter(Boolean);

      currentTab.groups[groupIndex].links = newOrder.map((url) => links.find((l) => l.url === url)).filter(Boolean);

      saveStateNow();
    },
  });
}

export function initTabSortable() {
  const container = document.getElementById("tabsContainer");
  if (!container) return;

  Sortable.create(container, {
    animation: 150,
    draggable: ".tab-wrapper",

    onEnd(evt) {
      const newOrder = [...container.querySelectorAll(".tab-wrapper")].map((el) => el.dataset.tabId).filter(Boolean);

      state.tabOrder = newOrder;
      saveStateNow();
    },
  });
}
