import { loadAppState, saveDashboard } from "./src/data/storage.js";
import { isSafeWebUrl } from "./src/utils/dom.js";

const pageTitle = document.getElementById("current-page-title");
const pageUrl = document.getElementById("current-page-url");
const tabSelect = document.getElementById("tab-select");
const groupSelect = document.getElementById("group-select");
const groupNote = document.getElementById("group-note");
const newGroupField = document.getElementById("new-group-field");
const newGroupName = document.getElementById("new-group-name");
const titleInput = document.getElementById("link-title");
const saveForm = document.getElementById("save-link-form");
const saveButton = document.getElementById("save-link-button");
const saveButtonLabel = saveButton.querySelector("span");
const status = document.getElementById("popup-status");
const refreshPageButton = document.getElementById("refresh-page-button");
const openDashboardButton = document.getElementById("open-dashboard-button");

let currentPage = null;
let dashboard = null;
let isSaving = false;
const NEW_GROUP_VALUE = "__create_new_group__";

function setStatus(message = "", state = "") {
  status.textContent = message;
  if (state) status.dataset.state = state;
  else delete status.dataset.state;
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function getOrderedTabs(source = dashboard) {
  return source?.tabs?.slice().sort((a, b) => a.order - b.order) || [];
}

function getOrderedGroups(tab) {
  return tab?.groups?.slice().sort((a, b) => a.column - b.column || a.order - b.order) || [];
}

function renderGroups(preferredGroupId = "") {
  const tab = dashboard?.tabs.find((item) => item.id === tabSelect.value);
  const groups = getOrderedGroups(tab);
  groupSelect.replaceChildren();

  groups.forEach((group) => groupSelect.append(createOption(group.id, group.name)));
  groupSelect.append(createOption(NEW_GROUP_VALUE, "＋ Create a new group…"));

  const hasPreferredGroup = groups.some((group) => group.id === preferredGroupId);
  groupSelect.value = preferredGroupId === NEW_GROUP_VALUE
    ? NEW_GROUP_VALUE
    : (hasPreferredGroup ? preferredGroupId : (groups[0]?.id || NEW_GROUP_VALUE));
  groupSelect.disabled = !tab;
  updateGroupMode();
  updateSaveAvailability();
}

function updateGroupMode() {
  const creatingGroup = groupSelect.value === NEW_GROUP_VALUE;
  const tab = dashboard?.tabs.find((item) => item.id === tabSelect.value);
  newGroupField.hidden = !creatingGroup;
  newGroupName.disabled = !creatingGroup;
  groupNote.textContent = creatingGroup
    ? (tab?.groups.length ? "The new group will go in the least-filled column." : "No groups yet; a new group will be created in the first column.")
    : "";
  groupNote.hidden = !creatingGroup;
}

function renderDashboard(nextDashboard, preferredTabId = "", preferredGroupId = "") {
  dashboard = nextDashboard;
  tabSelect.replaceChildren();
  const tabs = getOrderedTabs();
  tabs.forEach((tab) => tabSelect.append(createOption(tab.id, tab.name)));
  const targetTabId = tabs.some((tab) => tab.id === preferredTabId)
    ? preferredTabId
    : (tabs.some((tab) => tab.id === dashboard.activeTabId) ? dashboard.activeTabId : tabs[0]?.id);
  tabSelect.value = targetTabId || "";
  tabSelect.disabled = tabs.length === 0;
  renderGroups(preferredGroupId);
}

function normalizePageUrl(value) {
  if (!isSafeWebUrl(value)) return null;
  try {
    return new URL(value).href;
  } catch {
    return null;
  }
}

function canonicalUrl(value) {
  try {
    return new URL(value).href;
  } catch {
    return String(value || "");
  }
}

function getSelectedTarget() {
  const tab = dashboard?.tabs.find((item) => item.id === tabSelect.value);
  const group = tab?.groups.find((item) => item.id === groupSelect.value);
  return { tab, group };
}

function updateSaveAvailability({ showDuplicate = true } = {}) {
  const { tab, group } = getSelectedTarget();
  const title = titleInput.value.trim();
  const creatingGroup = groupSelect.value === NEW_GROUP_VALUE;
  const newGroupLabel = newGroupName.value.trim();
  const duplicateGroupName = Boolean(creatingGroup && tab?.groups.some((item) =>
    item.name.trim().toLocaleLowerCase() === newGroupLabel.toLocaleLowerCase(),
  ));
  const duplicateLink = Boolean(currentPage && group?.links?.some((link) => canonicalUrl(link.url) === currentPage.url));
  const destinationReady = Boolean(group || (creatingGroup && newGroupLabel && !duplicateGroupName));
  const duplicate = duplicateLink || duplicateGroupName;
  saveButton.disabled = !currentPage || !tab || !destinationReady || !title || isSaving || duplicate;

  if (duplicateGroupName && showDuplicate && status.dataset.state !== "success") {
    setStatus("A group with this name already exists in the selected tab.", "duplicate");
  } else if (duplicateLink && showDuplicate && status.dataset.state !== "success") {
    setStatus("This page is already saved in the selected group.", "duplicate");
  } else if (!duplicate && status.dataset.state === "duplicate") {
    setStatus();
  }
}

function resetSaveButtonLabel() {
  saveButtonLabel.textContent = "Add link";
}

async function loadActivePage() {
  currentPage = null;
  titleInput.value = "";
  titleInput.disabled = true;
  pageTitle.textContent = "Loading page details…";
  pageUrl.textContent = "Checking the active tab";
  refreshPageButton.disabled = true;
  updateSaveAvailability();

  try {
    if (!globalThis.chrome?.tabs?.query) throw new Error("Chrome tab access is unavailable.");
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const safeUrl = normalizePageUrl(tab?.url);
    if (!tab || !safeUrl) {
      pageTitle.textContent = "This page can’t be saved";
      pageUrl.textContent = "Open a regular HTTP or HTTPS website and try again.";
      setStatus("Browser and extension pages can’t be added as links.", "error");
      updateSaveAvailability();
      return;
    }

    const title = String(tab.title || new URL(safeUrl).hostname).trim().slice(0, 120);
    currentPage = { title: title || new URL(safeUrl).hostname, url: safeUrl };
    pageTitle.textContent = currentPage.title;
    pageUrl.textContent = safeUrl;
    titleInput.value = currentPage.title;
    titleInput.disabled = false;
    setStatus();
    updateSaveAvailability();
  } catch (error) {
    console.error("Could not read the active tab:", error);
    pageTitle.textContent = "Couldn’t read this page";
    pageUrl.textContent = "Try closing and reopening the extension popup.";
    setStatus("Allow access to the active tab, then try again.", "error");
    updateSaveAvailability();
  } finally {
    refreshPageButton.disabled = false;
  }
}

async function initialize() {
  try {
    const state = await loadAppState();
    renderDashboard(state.dashboard);
  } catch (error) {
    console.error("Could not load dashboard data:", error);
    setStatus("Could not load the dashboard. Try again from a new tab.", "error");
    tabSelect.disabled = true;
    groupSelect.disabled = true;
  }
  await loadActivePage();
}

function createLinkId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function chooseLeastFilledColumn(tab) {
  return [0, 1, 2, 3]
    .map((column) => ({ column, count: tab.groups.filter((group) => group.column === column).length }))
    .sort((a, b) => a.count - b.count || a.column - b.column)[0].column;
}

async function addCurrentPage(event) {
  event.preventDefault();
  if (isSaving || !currentPage) return;

  const pageToSave = { ...currentPage };
  const title = titleInput.value.trim().slice(0, 120);
  const targetTabId = tabSelect.value;
  const selectedGroupValue = groupSelect.value;
  const creatingGroup = selectedGroupValue === NEW_GROUP_VALUE;
  const newGroupLabel = newGroupName.value.trim().slice(0, 32);
  if (!title || !targetTabId || !selectedGroupValue || (creatingGroup && !newGroupLabel)) {
    setStatus("Choose a tab and enter a group name and link title.", "error");
    updateSaveAvailability();
    return;
  }

  isSaving = true;
  saveButtonLabel.textContent = "Saving…";
  setStatus("Adding this page to your dashboard…");
  updateSaveAvailability();

  try {
    // Read the latest dashboard so changes made in the new-tab page aren’t overwritten.
    const latest = await loadAppState();
    const targetTab = latest.dashboard.tabs.find((tab) => tab.id === targetTabId);
    const targetGroup = creatingGroup
      ? null
      : targetTab?.groups.find((group) => group.id === selectedGroupValue);
    if (!targetTab || (!creatingGroup && !targetGroup)) {
      renderDashboard(latest.dashboard, targetTabId, selectedGroupValue);
      throw new Error("That tab or group changed. Choose a destination and try again.");
    }

    if (creatingGroup && targetTab.groups.some((group) =>
      group.name.trim().toLocaleLowerCase() === newGroupLabel.toLocaleLowerCase(),
    )) {
      renderDashboard(latest.dashboard, targetTabId, NEW_GROUP_VALUE);
      newGroupName.value = newGroupLabel;
      setStatus("A group with this name already exists in the selected tab.", "duplicate");
      return;
    }

    if (targetGroup?.links.some((link) => canonicalUrl(link.url) === pageToSave.url)) {
      renderDashboard(latest.dashboard, targetTabId, selectedGroupValue);
      setStatus("This page is already saved in the selected group.", "duplicate");
      return;
    }

    const nextOrder = targetGroup
      ? targetGroup.links.reduce((maxOrder, link) =>
          Math.max(maxOrder, Number.isFinite(link.order) ? link.order : -1), -1) + 1
      : 0;
    const link = {
      id: createLinkId(),
      title,
      url: pageToSave.url,
      brand: null,
      order: nextOrder,
    };

    let newGroup = null;
    if (creatingGroup) {
      const column = chooseLeastFilledColumn(targetTab);
      const columnGroups = targetTab.groups.filter((group) => group.column === column);
      const order = columnGroups.reduce((maxOrder, group) =>
        Math.max(maxOrder, Number.isFinite(group.order) ? group.order : -1), -1) + 1;
      newGroup = {
        id: createLinkId(),
        name: newGroupLabel,
        column,
        order,
        links: [link],
      };
    }

    const nextDashboard = {
      ...latest.dashboard,
      tabs: latest.dashboard.tabs.map((tab) => tab.id !== targetTabId
        ? tab
        : {
            ...tab,
            groups: creatingGroup
              ? [...tab.groups, newGroup]
              : tab.groups.map((group) => group.id !== selectedGroupValue
                ? group
                : { ...group, links: [...group.links, link] }),
          }),
    };

    const savedGroupId = newGroup?.id || selectedGroupValue;
    const savedGroupName = newGroup?.name || targetGroup.name;
    await saveDashboard(nextDashboard);
    renderDashboard(nextDashboard, targetTabId, savedGroupId);
    newGroupName.value = "";
    setStatus(`Added to ${targetTab.name} › ${savedGroupName}.`, "success");
    saveButtonLabel.textContent = "Added";
    updateSaveAvailability({ showDuplicate: false });
  } catch (error) {
    console.error("Could not add the page:", error);
    if (status.dataset.state !== "duplicate") setStatus(error.message || "Could not save this page. Try again.", "error");
  } finally {
    isSaving = false;
    if (status.dataset.state !== "success") resetSaveButtonLabel();
    updateSaveAvailability({ showDuplicate: status.dataset.state !== "success" });
  }
}

tabSelect.addEventListener("change", () => {
  setStatus();
  resetSaveButtonLabel();
  newGroupName.value = "";
  renderGroups();
});

groupSelect.addEventListener("change", () => {
  setStatus();
  resetSaveButtonLabel();
  updateGroupMode();
  updateSaveAvailability();
});

newGroupName.addEventListener("input", () => {
  setStatus();
  resetSaveButtonLabel();
  updateSaveAvailability();
});

titleInput.addEventListener("input", () => {
  setStatus();
  resetSaveButtonLabel();
  updateSaveAvailability();
});

saveForm.addEventListener("submit", addCurrentPage);
refreshPageButton.addEventListener("click", () => {
  setStatus();
  resetSaveButtonLabel();
  void loadActivePage();
});

openDashboardButton.addEventListener("click", async () => {
  try {
    await chrome.tabs.create({ url: chrome.runtime.getURL("newtab.html") });
  } catch (error) {
    console.error("Could not open the dashboard:", error);
    setStatus("Could not open the dashboard. Open a new tab instead.", "error");
  }
});

void initialize();
