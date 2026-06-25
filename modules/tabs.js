import { renderGroups } from "./groups.js";
import { openConfirmModal } from "./modals.js";
import { state, saveState } from "./state.js";
import { initTabSortable } from "./sortable.js";
const tabsContainer = document.getElementById("tabsContainer");
tabsContainer.addEventListener("dragover", (e) => {
  e.preventDefault();

  const draggingEl = tabsContainer.querySelector(".tab-wrapper.dragging");
  if (!draggingEl) return;

  const siblings = [...tabsContainer.querySelectorAll(".tab-wrapper:not(.dragging)")];

  const after = siblings.find((sibling) => {
    const rect = sibling.getBoundingClientRect();
    return e.clientX < rect.left + rect.width / 2;
  });

  if (after) {
    tabsContainer.insertBefore(draggingEl, after);
  } else {
    tabsContainer.appendChild(draggingEl);
  }
});

tabsContainer.addEventListener("drop", (e) => {
  e.preventDefault();

  const draggingEl = tabsContainer.querySelector(".tab-wrapper.dragging");
  if (!draggingEl) return;

  // ترتیب جدید رو از DOM بخون
  const newOrder = [...tabsContainer.querySelectorAll(".tab-wrapper")].map((el) => el.dataset.tabId).filter(Boolean); // ← فیلتر undefined ها
  if (newOrder.length !== state.tabOrder.length) return; // ← اگه تعداد تب ها درست نبود، نادیده بگیر

  state.tabOrder = newOrder;
  saveState();
});

function renderTabs() {
  const container = document.getElementById("tabsContainer");
  container.innerHTML = "";

  state.tabOrder.forEach((tabId) => {
    const tabWrapper = document.createElement("button");
    tabWrapper.className = "tab-wrapper" + (tabId === state.activeTab ? " active" : "");
    tabWrapper.dataset.tabId = tabId; // ← اضافه شد

    tabWrapper.addEventListener("click", () => {
      state.activeTab = tabId;
      renderTabs();
      renderGroups();
      saveState();
    });
    const btn = document.createElement("span");
    btn.className = "tab";
    btn.textContent = state.tabs[tabId].name;

    const optionsBtn = document.createElement("button");
    optionsBtn.className = "tab-options-btn";
    optionsBtn.innerHTML = `<svg  width="12" height="12" viewBox="-6.5 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>dropdown</title> <path d="M18.813 11.406l-7.906 9.906c-0.75 0.906-1.906 0.906-2.625 0l-7.906-9.906c-0.75-0.938-0.375-1.656 0.781-1.656h16.875c1.188 0 1.531 0.719 0.781 1.656z"></path> </g></svg>`;
    optionsBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // نذار کلیک بره رو btn و تب رو عوض کنه
      toggleTabMenu(tabId, optionsBtn);
    });

    tabWrapper.appendChild(btn);
    tabWrapper.appendChild(optionsBtn);
    container.appendChild(tabWrapper);
  });
  initTabSortable();
}
function renameTab(tabId) {
  openConfirmModal({
    title: "Rename Tab",
    showInput: true,
    inputValue: state.tabs[tabId].name,
    confirmText: "Save",
    onConfirm: (newName) => {
      if (!newName) return;
      state.tabs[tabId].name = newName;
      renderTabs();
      saveState();
    },
  });
}

function deleteTab(tabId) {
  const tabIds = state.tabOrder;
  if (tabIds.length === 1) {
    alert("باید حداقل یه تب باقی بمونه!");
    return;
  }

  openConfirmModal({
    title: "Delete Tab",
    message: `مطمئنی می‌خوای تب "${state.tabs[tabId].name}" رو پاک کنی؟`,
    showInput: false,
    danger: true,
    confirmText: "Delete",
    onConfirm: () => {
      delete state.tabs[tabId];
      state.tabOrder = state.tabOrder.filter((id) => id !== tabId);
      if (state.activeTab === tabId) {
        state.activeTab = state.tabOrder[0];
      }
      renderTabs();
      renderGroups();
      saveState();
    },
  });
}

let openMenuTabId = null;

function toggleTabMenu(tabId, anchorBtn) {
  // اگه همون منو باز بود، ببندش
  if (openMenuTabId === tabId) {
    closeTabMenu();
    return;
  }

  closeTabMenu(); // هر منوی باز دیگه‌ای رو ببند

  const menu = document.createElement("div");
  menu.className = "tab-menu";
  menu.id = "tabMenu";

  const renameBtn = document.createElement("button");
  renameBtn.textContent = "Rename";
  renameBtn.addEventListener("click", () => {
    renameTab(tabId);
    closeTabMenu();
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.className = "danger";
  deleteBtn.addEventListener("click", () => {
    deleteTab(tabId);
    closeTabMenu();
  });

  menu.appendChild(renameBtn);
  menu.appendChild(deleteBtn);
  anchorBtn.parentElement.appendChild(menu); // تو همون tab-wrapper بذارش

  openMenuTabId = tabId;
}

function closeTabMenu() {
  const existing = document.getElementById("tabMenu");
  if (existing) existing.remove();
  openMenuTabId = null;
}
document.addEventListener("click", () => closeTabMenu());

export { renderTabs };
