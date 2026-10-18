import Sortable from "../vendor/sortable.esm.js";

export function initializeLinkReordering({ containers, tabId, getDashboard, onReorder, onEmptyStateChange = () => {} }) {
  const containerByGroupId = new Map(containers.map((container) => [container.dataset.groupId, container]));

  const clearDropState = () => {
    containers.forEach((container) => container.closest(".group-card")?.classList.remove("is-link-drag-over"));
    document.documentElement.classList.remove("is-reordering-links");
  };

  const instances = containers.map((container) => Sortable.create(container, {
    group: {
      name: `links-${tabId}`,
      pull: true,
      put: [`links-${tabId}`],
    },
    draggable: ".link-item",
    filter: "button, input, select, textarea, [contenteditable]",
    preventOnFilter: false,
    direction: "vertical",
    animation: 150,
    swapThreshold: 0.62,
    chosenClass: "link-sortable-chosen",
    ghostClass: "link-sortable-ghost",
    dragClass: "link-sortable-drag",
    delay: 120,
    delayOnTouchOnly: true,
    touchStartThreshold: 5,
    fallbackOnBody: true,
    fallbackTolerance: 5,
    onStart() {
      document.documentElement.classList.add("is-reordering-links");
    },
    onMove(event) {
      if (!event.dragged?.classList.contains("link-item") || !event.to?.matches(".link-list")) return false;
      containers.forEach((list) => {
        list.closest(".group-card")?.classList.toggle("is-link-drag-over", list === event.to);
      });
      return true;
    },
    onEnd() {
      clearDropState();
      const dashboard = getDashboard();
      const activeTab = dashboard.tabs.find((tab) => tab.id === tabId);
      if (!activeTab) return;

      const linksById = new Map(activeTab.groups.flatMap((group) => group.links.map((link) => [link.id, link])));
      const nextGroups = activeTab.groups.map((group) => {
        const containerForGroup = containerByGroupId.get(group.id);
        if (!containerForGroup) return group;
        const linkItems = [...containerForGroup.querySelectorAll(":scope > .link-item")];
        linkItems.forEach((item) => {
          item.dataset.groupId = group.id;
        });
        const links = linkItems
          .map((item, order) => {
            const link = linksById.get(item.dataset.linkId);
            return link ? { ...link, order } : null;
          })
          .filter(Boolean);
        return { ...group, links };
      });

      const nextLinkCount = nextGroups.reduce((total, group) => total + group.links.length, 0);
      if (nextLinkCount !== linksById.size) {
        void onReorder(dashboard);
        return;
      }
      containers.forEach((container) => {
        const linkCount = container.querySelectorAll(":scope > .link-item").length;
        onEmptyStateChange(container, linkCount);
      });
      const unchanged = nextGroups.every((group) => {
        const original = activeTab.groups.find((entry) => entry.id === group.id);
        return original && original.links.length === group.links.length &&
          original.links.every((link, index) => link.id === group.links[index]?.id);
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
