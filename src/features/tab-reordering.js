import Sortable from "../vendor/sortable.esm.js";

export function initializeTabReordering({ container, getDashboard, onReorder }) {
  return Sortable.create(container, {
    draggable: ".tab-item",
    handle: ".tab-button",
    filter: ".tab-menu-trigger",
    preventOnFilter: false,
    direction: "horizontal",
    animation: 180,
    swapThreshold: 0.62,
    chosenClass: "tab-sortable-chosen",
    ghostClass: "tab-sortable-ghost",
    dragClass: "tab-sortable-drag",
    delay: 120,
    delayOnTouchOnly: true,
    touchStartThreshold: 5,
    fallbackOnBody: true,
    fallbackTolerance: 5,
    onStart() {
      document.documentElement.classList.add("is-reordering-tabs");
    },
    onEnd(event) {
      document.documentElement.classList.remove("is-reordering-tabs");
      if (event.oldIndex === event.newIndex) return;

      const dashboard = getDashboard();
      const domIds = [...container.querySelectorAll(":scope > .tab-item")].map((item) => item.dataset.tabId);
      const currentIds = [...dashboard.tabs].sort((a, b) => a.order - b.order).map((tab) => tab.id);
      if (domIds.length !== currentIds.length || domIds.every((id, index) => id === currentIds[index])) return;

      const tabById = new Map(dashboard.tabs.map((tab) => [tab.id, tab]));
      const tabs = domIds
        .map((id, order) => {
          const tab = tabById.get(id);
          return tab ? { ...tab, order } : null;
        })
        .filter(Boolean);

      if (tabs.length === dashboard.tabs.length) {
        void onReorder({ ...dashboard, tabs }, { render: false });
      }
    },
  });
}
