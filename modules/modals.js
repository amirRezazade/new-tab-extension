import { renderGroups } from "./groups.js";
import { state, saveState } from "./state.js";
import { renderTabs } from "./tabs.js";
let modalColIndex = 0;

const confirmModalOverlay = document.getElementById("confirmModalOverlay");
const confirmModalForm = document.getElementById("confirmModalForm");
const confirmModalTitle = document.getElementById("confirmModalTitle");
const confirmModalMessage = document.getElementById("confirmModalMessage");
const confirmModalInputWrapper = document.getElementById("confirmModalInputWrapper");
const confirmModalInput = document.getElementById("confirmModalInput");
const confirmModalSubmitBtn = document.getElementById("confirmModalSubmitBtn");

let onConfirmCallback = null;
function openConfirmModal({ title, message = "", showInput = false, inputValue = "", danger = false, confirmText = "Save", onConfirm }) {
  confirmModalTitle.textContent = title;

  confirmModalMessage.textContent = message;
  confirmModalMessage.style.display = message ? "block" : "none";

  confirmModalInputWrapper.style.display = showInput ? "block" : "none";
  confirmModalInput.value = inputValue;

  confirmModalSubmitBtn.textContent = confirmText;
  confirmModalSubmitBtn.className = danger ? "danger" : "";

  onConfirmCallback = onConfirm;

  confirmModalOverlay.classList.add("open");

  if (showInput) {
    setTimeout(() => confirmModalInput.focus(), 50);
  }
}

function closeConfirmModal() {
  confirmModalOverlay.classList.remove("open");
  onConfirmCallback = null;
}

document.getElementById("confirmModalCancelBtn").addEventListener("click", closeConfirmModal);
document.getElementById("modalCancelBtn").addEventListener("click", closeModal);

confirmModalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (onConfirmCallback) {
    onConfirmCallback(confirmModalInput.value.trim());
  }
  closeConfirmModal();
});

const modalOverlay = document.getElementById("modalOverlay");
const modalForm = document.getElementById("modalForm");

let modalMode = "group"; // یا 'link'
let modalGroupIndex = null; // فقط وقتی mode === 'link' لازمه

function openModal(mode, groupIndex = null, colIndex = 0) {
  modalColIndex = colIndex;
  modalMode = mode;
  modalGroupIndex = groupIndex;
  modalForm.reset();

  const tabField = document.getElementById("tabNameField");
  const groupField = document.getElementById("groupNameField");
  const linkFields = document.getElementById("linkFields");
  const modalTitle = document.getElementById("modalTitle");

  // اول همه رو مخفی کن، بعد فقط چیزی که لازمه رو نشون بده
  tabField.style.display = "none";
  groupField.style.display = "none";
  linkFields.style.display = "block";

  modalOverlay.classList.add("open");
  if (mode === "tab") {
    tabField.style.display = "block";
    linkFields.style.display = "none"; // برای تب جدید فقط اسم لازمه
    modalTitle.textContent = "Add Tab";
    setTimeout(() => document.getElementById("tabNameInput").focus(), 50);
  } else if (mode === "group") {
    groupField.style.display = "block";
    modalTitle.textContent = "Add Group";
    setTimeout(() => document.getElementById("groupNameInput").focus(), 50);
  } else {
    modalTitle.textContent = "Add Link";
    setTimeout(() => document.getElementById("linkNameInput").focus(), 50);
  }
}
document.getElementById("addTabBtn").addEventListener("click", () => {
  openModal("tab");
});
function closeModal() {
  modalOverlay.classList.remove("open");
}

// بستن با کلیک بیرون مودال
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
modalForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const currentTab = state.tabs[state.activeTab];

  if (modalMode === "tab") {
    const tabName = document.getElementById("tabNameInput").value.trim();
    if (!tabName) return;

    const id = tabName.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    state.tabs[id] = { name: tabName, groups: [] };
    state.tabOrder.push(id);
    state.activeTab = id;

    renderTabs();
    renderGroups();
    saveState();
    closeModal();
    return; // بقیه کد لازم نیست اجرا بشه
  }

  // بقیه کد قبلی برای group و link همینجا می‌مونه...
  const linkName = document.getElementById("linkNameInput").value.trim();
  let linkUrl = document.getElementById("linkUrlInput").value.trim();

  if (linkUrl && !linkUrl.startsWith("http://") && !linkUrl.startsWith("https://")) {
    linkUrl = "https://" + linkUrl;
  }

  if (modalMode === "group") {
    const groupName = document.getElementById("groupNameInput").value.trim(); // ← این خط رو اضافه کن
    if (!groupName) return;
    const groupId = "group-" + Date.now();
    const newGroup = { title: groupName, links: [] };
    currentTab.groups.push(newGroup);
    const newGroupIndex = currentTab.groups.length - 1;

    if (!currentTab.columns) {
      currentTab.columns = [[], [], [], []];
    }
    currentTab.columns[modalColIndex].push(groupId);
  } else if (modalMode === "link") {
    if (!linkName || !linkUrl) return;
    currentTab.groups[modalGroupIndex].links.push({ name: linkName, url: linkUrl });
  }

  renderGroups();
  saveState();
  closeModal();
});
confirmModalOverlay.addEventListener("click", (e) => {
  if (e.target === confirmModalOverlay) closeConfirmModal();
});

export { openModal, closeModal, openConfirmModal };
