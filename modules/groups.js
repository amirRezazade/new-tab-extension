import { setupLinkDrag } from "./drag-links.js";
import { makeDraggable } from "./drag.js";
import { openConfirmModal, openModal } from "./modals.js";
import { state, saveState } from "./state.js";

function renderGroups() {
  const container = document.querySelector(".link-groups");
  container.innerHTML = "";

  const currentTab = state.tabs[state.activeTab];

  currentTab.groups.forEach((group, groupIndex) => {
    const groupEl = document.createElement("div");
    groupEl.className = "group";
    makeDraggable({
      element: groupEl,
      index: groupIndex,
      type: "group",
      onDrop: (fromIndex, toIndex) => {
        const currentTab = state.tabs[state.activeTab];
        const groups = currentTab.groups;
        const [moved] = groups.splice(fromIndex, 1);
        groups.splice(toIndex, 0, moved);
        renderGroups();
        saveState();
      },
    });
    // --- ردیف عنوان گروه + دکمه گزینه گروه ---
    const titleRow = document.createElement("div");
    titleRow.className = "group-title-row";

    const title = document.createElement("h3");
    title.textContent = group.title;

    const groupOptionsBtn = document.createElement("button");
    groupOptionsBtn.className = "options-btn";
    groupOptionsBtn.textContent = "⋯";
    groupOptionsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleItemMenu(groupOptionsBtn, [
        { label: "Rename", action: () => renameGroup(groupIndex) },
        { label: "Delete", action: () => deleteGroup(groupIndex), danger: true },
      ]);
    });

    titleRow.appendChild(title);
    titleRow.appendChild(groupOptionsBtn);
    groupEl.appendChild(titleRow);
    // --- لینک‌های این گروه ---
    group.links.forEach((link, linkIndex) => {
      const linkRow = document.createElement("div");
      linkRow.className = "link-row";

      const a = document.createElement("a");
      a.href = link.url;
      a.className = "link-item";
      a.draggable = false;
      const img = document.createElement("img");
      const domain = new URL(link.url).hostname;
      img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      img.draggable = false;
      a.appendChild(img);
      a.appendChild(document.createTextNode(link.name));

      const linkOptionsBtn = document.createElement("button");
      linkOptionsBtn.className = "options-btn small";
      linkOptionsBtn.textContent = "⋯";
      linkOptionsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleItemMenu(linkOptionsBtn, [
          { label: "Rename", action: () => renameLink(groupIndex, linkIndex) },
          { label: "Delete", action: () => deleteLink(groupIndex, linkIndex), danger: true },
        ]);
      });

      linkRow.appendChild(a);
      linkRow.appendChild(linkOptionsBtn);
      groupEl.appendChild(linkRow);
    });

    // --- دکمه افزودن لینک به همین گروه ---
    const addLinkBtn = document.createElement("button");
    addLinkBtn.className = "add-link-btn";
    addLinkBtn.textContent = "+ Add link";
    addLinkBtn.addEventListener("click", () => openModal("link", groupIndex));
    groupEl.appendChild(addLinkBtn);

    container.appendChild(groupEl);
    setupLinkDrag(groupEl, groupIndex);
  });

  // --- دکمه افزودن گروه جدید ---
  const addGroupBtn = document.createElement("button");
  addGroupBtn.className = "add-group-btn";
  addGroupBtn.textContent = "+ Add group";
  addGroupBtn.addEventListener("click", () => openModal("group"));
  container.appendChild(addGroupBtn);
}
function deleteGroup(groupIndex) {
  const currentTab = state.tabs[state.activeTab];
  const groupTitle = currentTab.groups[groupIndex].title;

  openConfirmModal({
    title: "Delete Group",
    message: `مطمئنی می‌خوای گروه "${groupTitle}" رو پاک کنی؟`,
    danger: true,
    confirmText: "Delete",
    onConfirm: () => {
      currentTab.groups.splice(groupIndex, 1);
      renderGroups();
      saveState();
    },
  });
}
function renameGroup(groupIndex) {
  const currentTab = state.tabs[state.activeTab];

  openConfirmModal({
    title: "Rename Group",
    showInput: true,
    inputValue: currentTab.groups[groupIndex].title,
    onConfirm: (newTitle) => {
      if (!newTitle) return;
      currentTab.groups[groupIndex].title = newTitle;
      renderGroups();
      saveState();
    },
  });
}
let openMenuAnchor = null;

function toggleItemMenu(anchorBtn, options) {
  if (openMenuAnchor === anchorBtn) {
    closeItemMenu();
    return;
  }

  closeItemMenu();

  const menu = document.createElement("div");
  menu.className = "tab-menu";
  menu.id = "itemMenu";

  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.textContent = opt.label;
    if (opt.danger) btn.className = "danger";
    btn.addEventListener("click", () => {
      opt.action();
      closeItemMenu();
    });
    menu.appendChild(btn);
  });

  anchorBtn.parentElement.style.position = "relative";
  anchorBtn.parentElement.appendChild(menu);
  openMenuAnchor = anchorBtn;
}

function closeItemMenu() {
  const existing = document.getElementById("itemMenu");
  if (existing) existing.remove();
  openMenuAnchor = null;
}

function renameLink(groupIndex, linkIndex) {
  const currentTab = state.tabs[state.activeTab];
  const link = currentTab.groups[groupIndex].links[linkIndex];

  openConfirmModal({
    title: "Rename Link",
    showInput: true,
    inputValue: link.name,
    onConfirm: (newName) => {
      if (!newName) return;
      link.name = newName;
      renderGroups();
      saveState();
    },
  });
}

function deleteLink(groupIndex, linkIndex) {
  const currentTab = state.tabs[state.activeTab];
  const link = currentTab.groups[groupIndex].links[linkIndex];

  openConfirmModal({
    title: "Delete Link",
    message: `مطمئنی می‌خوای "${link.name}" رو پاک کنی؟`,
    danger: true,
    confirmText: "Delete",
    onConfirm: () => {
      currentTab.groups[groupIndex].links.splice(linkIndex, 1);
      renderGroups();
      saveState();
    },
  });
}

document.addEventListener("click", () => closeItemMenu());

export { renderGroups };
