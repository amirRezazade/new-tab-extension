import Sortable from "../vendor/sortable.esm.js";

export function initializeGroupReordering({ containers, tabId, getDashboard, onReorder }) {
  const clearDropState = () => {
    containers.forEach((container) => container.closest(".group-column")?.classList.remove("is-drag-over"));
    document.documentElement.classList.remove("is-reordering-groups");
  };

  const instances = containers.map((container) => Sortable.create(container, {
    group: {
      name: `groups-${tabId}`,
      pull: true,
      put: [`groups-${tabId}`],
    },
    draggable: ".group-card",
    filter: "button, input, select, textarea, [contenteditable], .link-item",
    preventOnFilter: false,
    direction: "vertical",
    animation: 190,
    swapThreshold: 0.62,
    chosenClass: "group-sortable-chosen",
    ghostClass: "group-sortable-ghost",
    dragClass: "group-sortable-drag",
    delay: 120,
    delayOnTouchOnly: true,
    touchStartThreshold: 5,
    fallbackOnBody: true,
    fallbackTolerance: 5,
    onStart() {
      document.documentElement.classList.add("is-reordering-groups");
    },
    onMove(event) {
      if (!event.dragged?.classList.contains("group-card") || !event.to?.matches(".group-column__list")) return false;
      containers.forEach((list) => {
        list.closest(".group-column")?.classList.toggle("is-drag-over", list === event.to);
      });
      return true;
    },
    onEnd() {
      clearDropState();
      containers.forEach((container) => {
        const addGroupItem = container.querySelector(":scope > .group-column__add-item");
        if (addGroupItem) container.append(addGroupItem);
      });
      const dashboard = getDashboard();
      const activeTab = dashboard.tabs.find((tab) => tab.id === tabId);
      if (!activeTab) return;

      const groupsById = new Map(activeTab.groups.map((group) => [group.id, group]));
      const nextGroups = [];
      containers.forEach((list, columnIndex) => {
        [...list.querySelectorAll(":scope > .group-card")].forEach((card, order) => {
          const group = groupsById.get(card.dataset.groupId);
          if (group) nextGroups.push({ ...group, column: columnIndex, order });
        });
      });

      if (nextGroups.length !== activeTab.groups.length) {
        void onReorder(dashboard);
        return;
      }
      const unchanged = nextGroups.every((nextGroup) => {
        const currentGroup = groupsById.get(nextGroup.id);
        return currentGroup?.column === nextGroup.column && currentGroup?.order === nextGroup.order;
      });
      if (unchanged) return;

      const tabs = dashboard.tabs.map((tab) => tab.id === tabId ? { ...tab, groups: nextGroups } : tab);
      void onReorder({ ...dashboard, tabs }, { render: false });
    },
  }));

  return {
    destroy() {
      clearDropState();
      instances.forEach((instance) => instance.destroy());
    },
  };
}
