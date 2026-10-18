import { initializeGroupDialogs } from "./group-dialogs.js";
import { initializeGroupReordering } from "./group-reordering.js";
import { initializeLinkDialogs } from "./link-dialogs.js";
import { initializeLinkReordering } from "./link-reordering.js";
import { initializeTabDialogs } from "./tab-dialogs.js";
import { initializeTabReordering } from "./tab-reordering.js";
import { createElement, isSafeWebUrl } from "../utils/dom.js";
import { createFaviconIcon } from "../utils/favicon.js";
import { openWebLinkInBackground } from "../utils/open-link.js";

export function initializeTabs({ tabList, groupGrid, dashboard, onDashboardChange, onToast, getOpenLinksInNewTab = () => true }) {
  let currentDashboard = dashboard;
  let openTrigger = null;
  let openItem = null;
  let menuContext = null;
  let menuAnchor = null;
  let menuAlignRight = false;
  let suppressClickUntil = 0;
  let groupReorderingController = null;
  let linkReorderingController = null;

  const actionMenu = createElement("div", "tab-actions-menu");
  actionMenu.id = "tab-actions-menu";
  actionMenu.setAttribute("role", "menu");
  actionMenu.setAttribute("aria-label", "Tab actions");
  actionMenu.hidden = true;
  document.body.append(actionMenu);

  tabList.dataset.sortableContainer = "tabs";
  groupGrid.dataset.sortableContainer = "groups";

  const closeActionMenu = ({ restoreFocus = false } = {}) => {
    if (openTrigger) openTrigger.setAttribute("aria-expanded", "false");
    if (openItem) openItem.classList.remove("is-menu-open");
    actionMenu.hidden = true;
    actionMenu.replaceChildren();
    const triggerToRestore = openTrigger;
    openTrigger = null;
    openItem = null;
    menuContext = null;
    menuAnchor = null;
    menuAlignRight = false;
    if (restoreFocus && triggerToRestore?.isConnected) triggerToRestore.focus();
  };

  const findTab = (tabId) => currentDashboard.tabs.find((tab) => tab.id === tabId);

  const commitDashboard = async (nextDashboard, { render: shouldRender = true } = {}) => {
    const previousDashboard = currentDashboard;
    currentDashboard = nextDashboard;
    if (shouldRender) {
      closeActionMenu();
      render({ preservePosition: previousDashboard.activeTabId === nextDashboard.activeTabId });
    }
    try {
      await onDashboardChange(nextDashboard);
      return true;
    } catch (error) {
      console.error("Could not save tab changes:", error);
      currentDashboard = previousDashboard;
      render({ preservePosition: true });
      onToast("Could not save your tab changes. Please try again.");
      return false;
    }
  };

  const normalizeTabOrder = (tabs) => [...tabs].sort((a, b) => a.order - b.order).map((tab, index) => ({ ...tab, order: index }));

  const dialogs = initializeTabDialogs({
    getDashboard: () => currentDashboard,
    onToast,
    onAdd: async (name) => {
      const orderedTabs = normalizeTabOrder(currentDashboard.tabs);
      const newTab = {
        id: createId("tab"),
        name,
        order: orderedTabs.length,
        groups: [],
      };
      return commitDashboard({
        ...currentDashboard,
        activeTabId: newTab.id,
        tabs: [...orderedTabs, newTab],
      });
    },
    onRename: async (tabId, name) => {
      const tabs = currentDashboard.tabs.map((tab) => (tab.id === tabId ? { ...tab, name } : tab));
      return commitDashboard({ ...currentDashboard, tabs });
    },
    onDelete: async (tabId) => {
      const orderedTabs = normalizeTabOrder(currentDashboard.tabs);
      if (orderedTabs.length <= 1) {
        onToast("Keep at least one tab in your dashboard.");
        return false;
      }

      const deletedIndex = orderedTabs.findIndex((tab) => tab.id === tabId);
      if (deletedIndex < 0) return false;
      const tabs = orderedTabs.filter((tab) => tab.id !== tabId).map((tab, index) => ({ ...tab, order: index }));
      const activeTabId = currentDashboard.activeTabId === tabId ? tabs[Math.max(0, deletedIndex - 1)].id : currentDashboard.activeTabId;
      return commitDashboard({ ...currentDashboard, tabs, activeTabId });
    },
  });

  const groupDialogs = initializeGroupDialogs({
    getDashboard: () => currentDashboard,
    onToast,
    onAdd: async (tabId, columnIndex, name, initialLink) => {
      const tab = currentDashboard.tabs.find((entry) => entry.id === tabId);
      if (!tab) return false;
      const groupOrders = tab.groups.filter((group) => group.column === columnIndex).map((group) => group.order);
      const links = initialLink
        ? [
            {
              id: createId("link"),
              title: initialLink.title,
              url: initialLink.url,
              brand: null,
              order: 0,
            },
          ]
        : [];
      const newGroup = {
        id: createId("group"),
        name,
        column: columnIndex,
        order: groupOrders.length ? Math.max(...groupOrders) + 1 : 0,
        links,
      };
      const tabs = currentDashboard.tabs.map((entry) => (entry.id === tabId ? { ...entry, groups: [...entry.groups, newGroup] } : entry));
      return commitDashboard({ ...currentDashboard, tabs });
    },
    onRename: async (tabId, groupId, name) => {
      const tabs = currentDashboard.tabs.map((tab) =>
        tab.id !== tabId
          ? tab
          : {
              ...tab,
              groups: tab.groups.map((group) => (group.id === groupId ? { ...group, name } : group)),
            },
      );
      return commitDashboard({ ...currentDashboard, tabs });
    },
    onDelete: async (tabId, groupId) => {
      const tabs = currentDashboard.tabs.map((tab) =>
        tab.id !== tabId
          ? tab
          : {
              ...tab,
              groups: tab.groups.filter((group) => group.id !== groupId),
            },
      );
      return commitDashboard({ ...currentDashboard, tabs });
    },
  });

  const linkDialogs = initializeLinkDialogs({
    getDashboard: () => currentDashboard,
    onToast,
    onAddLink: async (tabId, groupId, linkData) => {
      const tab = currentDashboard.tabs.find((entry) => entry.id === tabId);
      const group = tab?.groups.find((entry) => entry.id === groupId);
      if (!tab || !group) return false;
      const linkOrders = group.links.map((link) => link.order);
      const newLink = {
        id: createId("link"),
        title: linkData.title,
        url: linkData.url,
        brand: null,
        order: linkOrders.length ? Math.max(...linkOrders) + 1 : 0,
      };
      const tabs = currentDashboard.tabs.map((entry) =>
        entry.id !== tabId
          ? entry
          : {
              ...entry,
              groups: entry.groups.map((currentGroup) => (currentGroup.id === groupId ? { ...currentGroup, links: [...currentGroup.links, newLink] } : currentGroup)),
            },
      );
      return commitDashboard({ ...currentDashboard, tabs });
    },
    onEditLink: async (tabId, groupId, linkId, linkData) => {
      const tabs = currentDashboard.tabs.map((tab) =>
        tab.id !== tabId
          ? tab
          : {
              ...tab,
              groups: tab.groups.map((group) =>
                group.id !== groupId
                  ? group
                  : {
                      ...group,
                      links: group.links.map((link) =>
                        link.id !== linkId
                          ? link
                          : {
                              ...link,
                              ...linkData,
                              brand: link.url === linkData.url ? link.brand : null,
                            },
                      ),
                    },
              ),
            },
      );
      return commitDashboard({ ...currentDashboard, tabs });
    },
    onDeleteLink: async (tabId, groupId, linkId) => {
      const tabs = currentDashboard.tabs.map((tab) =>
        tab.id !== tabId
          ? tab
          : {
              ...tab,
              groups: tab.groups.map((group) =>
                group.id !== groupId
                  ? group
                  : {
                      ...group,
                      links: group.links
                        .filter((link) => link.id !== linkId)
                        .sort((a, b) => a.order - b.order)
                        .map((link, order) => ({ ...link, order })),
                    },
              ),
            },
      );
      return commitDashboard({ ...currentDashboard, tabs });
    },
  });

  const positionActionMenu = (anchor, alignRight = false) => {
    actionMenu.hidden = false;
    actionMenu.style.left = "0px";
    actionMenu.style.top = "0px";
    const anchorRect = anchor.getBoundingClientRect();
    const menuRect = actionMenu.getBoundingClientRect();
    const margin = 8;
    const preferredLeft = alignRight ? anchorRect.right - menuRect.width : anchorRect.left;
    const left = Math.min(Math.max(margin, preferredLeft), window.innerWidth - menuRect.width - margin);
    let top = anchorRect.bottom + 6;
    if (top + menuRect.height > window.innerHeight - margin) {
      top = Math.max(margin, anchorRect.top - menuRect.height - 6);
    }
    actionMenu.style.left = `${left}px`;
    actionMenu.style.top = `${top}px`;
  };

  const createMenuItem = (label, className, onClick) => {
    const button = createElement("button", className, label);
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.addEventListener("click", onClick);
    return button;
  };

  const showTabActionMenu = (tab, tabItem, trigger) => {
    if (menuContext?.type === "tab" && menuContext.tabId === tab.id && !actionMenu.hidden) {
      closeActionMenu();
      return;
    }

    closeActionMenu();
    menuContext = { type: "tab", tabId: tab.id };
    openTrigger = trigger;
    openItem = tabItem;
    menuAnchor = tabItem;
    menuAlignRight = false;
    actionMenu.setAttribute("aria-label", `Actions for ${tab.name}`);
    trigger.setAttribute("aria-expanded", "true");
    tabItem.classList.add("is-menu-open");

    const renameButton = createMenuItem("Rename", "tab-menu-item", () => {
      const selectedTab = findTab(tab.id);
      closeActionMenu();
      if (selectedTab) dialogs.openRename(selectedTab);
    });
    const deleteButton = createMenuItem("Delete", "tab-menu-item tab-menu-item--danger", () => {
      const selectedTab = findTab(tab.id);
      closeActionMenu();
      if (selectedTab) dialogs.openDelete(selectedTab);
    });
    deleteButton.disabled = currentDashboard.tabs.length <= 1;
    if (deleteButton.disabled) deleteButton.title = "At least one tab must remain.";

    actionMenu.append(renameButton, deleteButton);
    positionActionMenu(menuAnchor, menuAlignRight);
    renameButton.focus();
  };

  const showGroupActionMenu = (group, groupCard, trigger) => {
    const tabId = currentDashboard.activeTabId;
    if (menuContext?.type === "group" && menuContext.groupId === group.id && !actionMenu.hidden) {
      closeActionMenu();
      return;
    }

    closeActionMenu();
    menuContext = { type: "group", tabId, groupId: group.id };
    openTrigger = trigger;
    openItem = groupCard;
    menuAnchor = trigger;
    menuAlignRight = true;
    actionMenu.setAttribute("aria-label", `Actions for ${group.name}`);
    trigger.setAttribute("aria-expanded", "true");
    groupCard.classList.add("is-menu-open");

    const renameButton = createMenuItem("Rename group", "tab-menu-item", () => {
      const selectedGroup = currentDashboard.tabs.find((tab) => tab.id === tabId)?.groups.find((entry) => entry.id === group.id);
      closeActionMenu();
      if (selectedGroup) groupDialogs.openRename(tabId, selectedGroup);
    });
    const deleteButton = createMenuItem("Delete group", "tab-menu-item tab-menu-item--danger", () => {
      const selectedGroup = currentDashboard.tabs.find((tab) => tab.id === tabId)?.groups.find((entry) => entry.id === group.id);
      closeActionMenu();
      if (selectedGroup) groupDialogs.openDelete(tabId, selectedGroup);
    });

    actionMenu.append(renameButton, deleteButton);
    positionActionMenu(menuAnchor, menuAlignRight);
    renameButton.focus();
  };

  const showLinkActionMenu = (group, link, linkItem, trigger) => {
    const tabId = currentDashboard.activeTabId;
    if (menuContext?.type === "link" && menuContext.linkId === link.id && !actionMenu.hidden) {
      closeActionMenu();
      return;
    }

    closeActionMenu();
    menuContext = { type: "link", tabId, groupId: group.id, linkId: link.id };
    openTrigger = trigger;
    openItem = linkItem;
    menuAnchor = trigger;
    menuAlignRight = true;
    actionMenu.setAttribute("aria-label", `Actions for ${link.title}`);
    trigger.setAttribute("aria-expanded", "true");
    linkItem.classList.add("is-menu-open");

    const editButton = createMenuItem("Edit link", "tab-menu-item", () => {
      const selectedLink = currentDashboard.tabs
        .find((tab) => tab.id === tabId)
        ?.groups.find((entry) => entry.id === group.id)
        ?.links.find((entry) => entry.id === link.id);
      closeActionMenu();
      if (selectedLink) linkDialogs.openEdit(tabId, group.id, selectedLink);
    });
    const deleteButton = createMenuItem("Delete link", "tab-menu-item tab-menu-item--danger", () => {
      const selectedLink = currentDashboard.tabs
        .find((tab) => tab.id === tabId)
        ?.groups.find((entry) => entry.id === group.id)
        ?.links.find((entry) => entry.id === link.id);
      closeActionMenu();
      if (selectedLink) linkDialogs.openDelete(tabId, group.id, selectedLink);
    });

    actionMenu.append(editButton, deleteButton);
    positionActionMenu(menuAnchor, menuAlignRight);
    editButton.focus();
  };

  const selectTab = async (tabId) => {
    if (tabId === currentDashboard.activeTabId) return;
    const succeeded = await commitDashboard({ ...currentDashboard, activeTabId: tabId });
    if (succeeded) document.getElementById(`tab-${tabId}`)?.focus();
  };

  const moveTabBy = async (tabId, offset) => {
    const orderedTabs = [...currentDashboard.tabs].sort((a, b) => a.order - b.order);
    const currentIndex = orderedTabs.findIndex((tab) => tab.id === tabId);
    const nextIndex = currentIndex + offset;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedTabs.length) return;

    const [movedTab] = orderedTabs.splice(currentIndex, 1);
    orderedTabs.splice(nextIndex, 0, movedTab);
    const tabs = orderedTabs.map((tab, order) => ({ ...tab, order }));
    const succeeded = await commitDashboard({ ...currentDashboard, tabs });
    if (succeeded) {
      document.getElementById(`tab-${tabId}`)?.focus();
      onToast(`${movedTab.name} moved ${offset < 0 ? "left" : "right"}.`);
    }
  };

  const moveGroupBy = async (tabId, groupId, offset) => {
    const tab = currentDashboard.tabs.find((entry) => entry.id === tabId);
    const group = tab?.groups.find((entry) => entry.id === groupId);
    if (!tab || !group) return;

    const targetColumn = group.column + offset;
    if (targetColumn < 0 || targetColumn > 3) return;

    const remainingGroups = tab.groups.filter((entry) => entry.id !== groupId);
    const groups = [];
    for (let columnIndex = 0; columnIndex < 4; columnIndex += 1) {
      const columnGroups = remainingGroups
        .filter((entry) => entry.column === columnIndex)
        .slice()
        .sort((a, b) => a.order - b.order);
      if (columnIndex === targetColumn) columnGroups.push({ ...group, column: targetColumn });
      columnGroups.forEach((entry, order) => groups.push({ ...entry, order }));
    }

    const tabs = currentDashboard.tabs.map((entry) => (entry.id === tabId ? { ...entry, groups } : entry));
    const succeeded = await commitDashboard({ ...currentDashboard, tabs });
    if (succeeded) {
      document.getElementById(`group-focus-${groupId}`)?.focus();
      onToast(`${group.name} moved to Column ${targetColumn + 1}.`);
    }
  };

  const createAddGroupButton = (tabId, columnIndex) => {
    const button = createElement("button", "add-group-tile");
    button.type = "button";
    button.id = `add-group-button-${tabId}-${columnIndex}`;
    button.title = `Add a group to Column ${columnIndex + 1}`;
    button.setAttribute("aria-label", `Add a group to Column ${columnIndex + 1}`);
    button.append(createElement("span", "add-group-icon", "+"), createElement("span", "", "Add group"));
    button.addEventListener("click", () => groupDialogs.openAdd(tabId, columnIndex));
    return button;
  };

  const createEmptyLinksButton = (group) => {
    const button = createElement("button", "empty-links", "Add link");
    button.type = "button";
    button.setAttribute("aria-label", `Add a link to ${group.name}`);
    button.addEventListener("click", () => linkDialogs.openAdd(currentDashboard.activeTabId, group.id));
    return button;
  };

  const createGroupCard = (group) => {
    const card = createElement("section", "group-card");
    card.dataset.groupId = group.id;
    card.setAttribute("role", "listitem");
    card.setAttribute("aria-label", `${group.name} group`);

    const header = createElement("header", "group-card__header");
    header.id = `group-focus-${group.id}`;
    header.tabIndex = 0;
    header.setAttribute("role", "group");
    header.setAttribute("aria-label", `${group.name}. Drag the group from its card outside the link rows, or use Alt+Shift+Left/Right. Drag link rows to move links.`);
    header.setAttribute("aria-keyshortcuts", "Alt+Shift+ArrowLeft Alt+Shift+ArrowRight");
    header.title = "Drag outside the link rows to move the group · Alt+Shift+←/→ also works";
    header.addEventListener("keydown", (event) => {
      if (event.target === header && event.altKey && event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        void moveGroupBy(currentDashboard.activeTabId, group.id, event.key === "ArrowLeft" ? -1 : 1);
      }
    });

    const title = createElement("h2", "group-card__title", group.name);
    const actions = createElement("div", "group-card__actions");
    const addLinkButton = createElement("button", "group-action-button group-action-button--add-link");
    addLinkButton.type = "button";
    addLinkButton.title = `Add a link to ${group.name}`;
    addLinkButton.setAttribute("aria-label", `Add a link to ${group.name}`);
    addLinkButton.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M7.05017 11.2929L4.92885 13.4142C3.36675 14.9763 3.36675 17.509 4.92885 19.0711C6.49095 20.6332 9.02361 20.6332 10.5857 19.0711L13.4141 16.2427C14.9762 14.6806 14.9762 12.1479 13.4141 10.5858V10.5858L12.3535 11.6464V11.6464C13.3298 12.6228 13.3298 14.2057 12.3535 15.182L9.52505 18.0104C8.54873 18.9867 6.96582 18.9867 5.98951 18.0104C5.0132 17.0341 5.0132 15.4512 5.98951 14.4749L8.11083 12.3536L7.05017 11.2929Z" fill="#ffffff"></path> <path d="M15.889 11.6464L18.0103 9.52512C18.9866 8.54881 18.9866 6.9659 18.0103 5.98959C17.034 5.01328 15.4511 5.01328 14.4748 5.98959L11.6464 8.81801C10.67 9.79433 10.67 11.3772 11.6464 12.3535L10.5857 13.4142C9.0236 11.8521 9.0236 9.31945 10.5857 7.75735L13.4141 4.92893C14.9762 3.36683 17.5089 3.36683 19.071 4.92893C20.6331 6.49102 20.6331 9.02368 19.071 10.5858L16.9497 12.7071L15.889 11.6464Z" fill="#ffffff"></path> </g></svg>';
    addLinkButton.addEventListener("click", () => linkDialogs.openAdd(currentDashboard.activeTabId, group.id));

    const menuButton = createElement("button", "group-action-button group-action-button--more");
    menuButton.type = "button";
    menuButton.title = `More options for ${group.name}`;
    menuButton.setAttribute("aria-label", `More options for ${group.name}`);
    menuButton.setAttribute("aria-haspopup", "menu");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="3.5" cy="8" r="1.25"/><circle cx="8" cy="8" r="1.25"/><circle cx="12.5" cy="8" r="1.25"/></svg>';
    menuButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showGroupActionMenu(group, card, menuButton);
    });
    actions.append(addLinkButton, menuButton);
    header.append(title, actions);

    const list = createElement("div", "link-list");
    list.dataset.sortableContainer = "links";
    list.dataset.groupId = group.id;
    if (group.links.length === 0) {
      list.append(createEmptyLinksButton(group));
    } else {
      group.links
        .slice()
        .sort((a, b) => a.order - b.order)
        .forEach((link) => list.append(createLink(link, group)));
    }
    card.append(header, list);
    return card;
  };

  const createLink = (link, group) => {
    const safeUrl = isSafeWebUrl(link.url);
    const item = createElement("div", "link-item");
    item.dataset.linkId = link.id;
    item.dataset.groupId = group.id;

    const main = createElement(safeUrl ? "a" : "div", "link-main");
    if (safeUrl) {
      main.href = link.url;
      main.draggable = false;
      main.target = getOpenLinksInNewTab() ? "_blank" : "_self";
      if (main.target === "_blank") main.rel = "noopener noreferrer";
      main.title = link.url;
      main.addEventListener("click", (event) => {
        if (main.target === "_blank") openWebLinkInBackground(event, link.url);
      });
    }
    const icon = createFaviconIcon({
      url: safeUrl ? link.url : "",
      fallbackText: getInitials(link.title),
      className: "link-icon",
      modifierClass: link.brand ? `link-icon--${link.brand}` : "",
    });
    const title = createElement("span", "link-title", link.title);
    const domain = createElement("span", "link-domain", getDomain(link.url));
    domain.setAttribute("aria-hidden", "true");
    main.append(icon, title, domain);

    const menuButton = createElement("button", "link-menu-trigger");
    menuButton.type = "button";
    menuButton.title = `More options for ${link.title}`;
    menuButton.setAttribute("aria-label", `More options for ${link.title}`);
    menuButton.setAttribute("aria-haspopup", "menu");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="3.5" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="12.5" r="1.2"/></svg>';
    menuButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const activeTab = currentDashboard.tabs.find((tab) => tab.id === currentDashboard.activeTabId);
      const currentGroup = activeTab?.groups.find((entry) => entry.id === item.dataset.groupId);
      const currentLink = currentGroup?.links.find((entry) => entry.id === item.dataset.linkId);
      if (currentGroup && currentLink) showLinkActionMenu(currentGroup, currentLink, item, menuButton);
    });

    item.append(main, menuButton);
    return item;
  };

  const createTab = (tab) => {
    const item = createElement("div", "tab-item");
    item.classList.toggle("is-active", tab.id === currentDashboard.activeTabId);
    item.dataset.tabId = tab.id;

    const button = createElement("button", "tab-button");
    button.append(createElement("span", "tab-label", tab.name));
    button.type = "button";
    button.id = `tab-${tab.id}`;
    button.dataset.tabId = tab.id;
    button.title = "Click to select · drag to reorder · Alt+Shift+←/→ to move";
    button.setAttribute("aria-keyshortcuts", "Alt+Shift+ArrowLeft Alt+Shift+ArrowRight");
    button.tabIndex = tab.id === currentDashboard.activeTabId ? 0 : -1;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(tab.id === currentDashboard.activeTabId));
    button.setAttribute("aria-controls", "group-grid");
    button.addEventListener("click", (event) => {
      if (event.detail > 0 && Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      selectTab(tab.id);
    });
    button.addEventListener("keydown", (event) => {
      if (event.altKey && event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        void moveTabBy(tab.id, event.key === "ArrowLeft" ? -1 : 1);
        return;
      }

      const buttons = [...tabList.querySelectorAll('[role="tab"]')];
      const currentIndex = buttons.indexOf(button);
      let nextIndex = null;
      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;
      if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = buttons.length - 1;
      if (nextIndex === null || !buttons[nextIndex]) return;
      event.preventDefault();
      buttons[nextIndex].focus();
      void selectTab(buttons[nextIndex].dataset.tabId);
    });

    const trigger = createElement("button", "tab-menu-trigger");
    trigger.type = "button";
    trigger.setAttribute("aria-label", `Actions for ${tab.name}`);
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/></svg>';
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showTabActionMenu(tab, item, trigger);
    });

    item.append(button, trigger);
    return item;
  };

  const getInitials = (title) => {
    const words = String(title || "?")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return (words[0] || "?").slice(0, 2).toUpperCase();
  };

  const getDomain = (value) => {
    try {
      return new URL(value).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  };

  const render = ({ preservePosition = true } = {}) => {
    const scrollTop = preservePosition ? groupGrid.scrollTop : 0;
    const scrollLeft = preservePosition ? groupGrid.scrollLeft : 0;
    const tabScrollLeft = tabList.scrollLeft;
    const activeElement = document.activeElement;
    const focusId = preservePosition && (tabList.contains(activeElement) || groupGrid.contains(activeElement)) ? activeElement.id : "";
    closeActionMenu();
    linkReorderingController?.destroy();
    linkReorderingController = null;
    groupReorderingController?.destroy();
    groupReorderingController = null;
    tabList.replaceChildren();
    groupGrid.replaceChildren();

    currentDashboard.tabs
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((tab) => tabList.append(createTab(tab)));

    const activeTab = currentDashboard.tabs.find((tab) => tab.id === currentDashboard.activeTabId);
    groupGrid.setAttribute("role", "tabpanel");
    if (activeTab) groupGrid.setAttribute("aria-labelledby", `tab-${activeTab.id}`);
    else groupGrid.removeAttribute("aria-labelledby");
    if (!activeTab) return;

    const sortableContainers = [];
    for (let columnIndex = 0; columnIndex < 4; columnIndex += 1) {
      const groupsInColumn = activeTab.groups
        .filter((group) => group.column === columnIndex)
        .slice()
        .sort((a, b) => a.order - b.order);

      const column = createElement("section", "group-column");
      column.dataset.columnIndex = String(columnIndex);
      column.setAttribute("aria-label", `Group column ${columnIndex + 1}`);

      const list = createElement("div", "group-column__list");
      list.dataset.sortableContainer = "groups";
      list.dataset.tabId = activeTab.id;
      list.dataset.columnIndex = String(columnIndex);
      list.setAttribute("role", "list");
      list.setAttribute("aria-label", `Groups in column ${columnIndex + 1}`);
      groupsInColumn.forEach((group) => list.append(createGroupCard(group)));
      const addGroupItem = createElement("div", "group-column__add-item");
      addGroupItem.setAttribute("role", "listitem");
      addGroupItem.append(createAddGroupButton(activeTab.id, columnIndex));
      list.append(addGroupItem);

      column.append(list);
      groupGrid.append(column);
      sortableContainers.push(list);
    }

    groupReorderingController = initializeGroupReordering({
      containers: sortableContainers,
      tabId: activeTab.id,
      getDashboard: () => currentDashboard,
      onReorder: commitDashboard,
    });
    linkReorderingController = initializeLinkReordering({
      containers: [...groupGrid.querySelectorAll(".link-list")],
      tabId: activeTab.id,
      getDashboard: () => currentDashboard,
      onReorder: commitDashboard,
      onEmptyStateChange: (container, linkCount) => {
        const group = currentDashboard.tabs.find((tab) => tab.id === currentDashboard.activeTabId)?.groups.find((entry) => entry.id === container.dataset.groupId);
        const emptyButton = container.querySelector(":scope > .empty-links");
        if (linkCount === 0 && !emptyButton && group) container.append(createEmptyLinksButton(group));
        else if (linkCount > 0) emptyButton?.remove();
      },
    });

    groupGrid.scrollTop = scrollTop;
    groupGrid.scrollLeft = scrollLeft;
    tabList.scrollLeft = tabScrollLeft;
    if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  };

  const addTabButton = document.getElementById("add-tab-button");
  addTabButton?.addEventListener("click", () => dialogs.openAdd());

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (actionMenu.hidden) return;
      const clickedTrigger = event.target instanceof Element && event.target.closest(".tab-menu-trigger, .group-action-button--more, .link-menu-trigger");
      if (!actionMenu.contains(event.target) && !clickedTrigger) closeActionMenu();
    },
    true,
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !actionMenu.hidden) {
      closeActionMenu({ restoreFocus: true });
      event.stopPropagation();
    }
    if (actionMenu.hidden) return;
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = [...actionMenu.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    if (!items.length) return;
    const currentIndex = items.indexOf(document.activeElement);
    let nextIndex = currentIndex;
    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1 + items.length) % items.length;
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    event.preventDefault();
    items[nextIndex]?.focus();
  });

  window.addEventListener("resize", () => {
    if (!actionMenu.hidden && menuAnchor) positionActionMenu(menuAnchor, menuAlignRight);
  });
  window.addEventListener("scroll", () => closeActionMenu(), true);

  render();
  const sortable = initializeTabReordering({
    container: tabList,
    getDashboard: () => currentDashboard,
    onReorder: (nextDashboard, options) => {
      suppressClickUntil = Date.now() + 450;
      return commitDashboard(nextDashboard, options);
    },
  });

  return {
    setDashboard(nextDashboard) {
      const sortKeys = (_key, value) =>
        value && typeof value === "object" && !Array.isArray(value)
          ? Object.fromEntries(
              Object.keys(value)
                .sort()
                .map((key) => [key, value[key]]),
            )
          : value;
      if (JSON.stringify(currentDashboard, sortKeys) === JSON.stringify(nextDashboard, sortKeys)) return;
      const preservePosition = currentDashboard.activeTabId === nextDashboard.activeTabId;
      currentDashboard = nextDashboard;
      render({ preservePosition });
    },
    setOpenLinksInNewTab(enabled) {
      groupGrid.querySelectorAll("a.link-main").forEach((anchor) => {
        anchor.target = enabled ? "_blank" : "_self";
        if (enabled) anchor.rel = "noopener noreferrer";
        else anchor.removeAttribute("rel");
      });
    },
    destroy() {
      sortable.destroy();
      linkReorderingController?.destroy();
      groupReorderingController?.destroy();
      actionMenu.remove();
    },
  };
}

function createId(prefix = "item") {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
