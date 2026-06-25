import { initLinkSortable } from "./sortable.js";
import { openConfirmModal, openModal } from "./modals.js";
import { state, saveState, saveStateNow } from "./state.js";

let draggingGroupId = null;
let draggingFromCol = null;
function buildGroupEl(group, groupIndex) {
  const groupEl = document.createElement("div");
  groupEl.className = "group";

  // --- ردیف عنوان گروه ---
  const titleRow = document.createElement("div");
  titleRow.className = "group-title-row";

  const title = document.createElement("h3");
  title.textContent = group.title;

  const actionsWrapper = document.createElement("div");
  actionsWrapper.className = "group-actions";

  const addLinkBtn = document.createElement("button");
  addLinkBtn.className = "add-link-icon-btn";
  addLinkBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M7.05017 11.2929L4.92885 13.4142C3.36675 14.9763 3.36675 17.509 4.92885 19.0711C6.49095 20.6332 9.02361 20.6332 10.5857 19.0711L13.4141 16.2427C14.9762 14.6806 14.9762 12.1479 13.4141 10.5858V10.5858L12.3535 11.6464V11.6464C13.3298 12.6228 13.3298 14.2057 12.3535 15.182L9.52505 18.0104C8.54873 18.9867 6.96582 18.9867 5.98951 18.0104C5.0132 17.0341 5.0132 15.4512 5.98951 14.4749L8.11083 12.3536L7.05017 11.2929Z" fill="#ffffff"></path> <path d="M15.889 11.6464L18.0103 9.52512C18.9866 8.54881 18.9866 6.9659 18.0103 5.98959C17.034 5.01328 15.4511 5.01328 14.4748 5.98959L11.6464 8.81801C10.67 9.79433 10.67 11.3772 11.6464 12.3535L10.5857 13.4142C9.0236 11.8521 9.0236 9.31945 10.5857 7.75735L13.4141 4.92893C14.9762 3.36683 17.5089 3.36683 19.071 4.92893C20.6331 6.49102 20.6331 9.02368 19.071 10.5858L16.9497 12.7071L15.889 11.6464Z" fill="#ffffff"></path> </g></svg>`;
  addLinkBtn.title = "Add link";
  addLinkBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openModal("link", groupIndex);
  });

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

  actionsWrapper.appendChild(addLinkBtn);
  actionsWrapper.appendChild(groupOptionsBtn);
  titleRow.appendChild(title);
  titleRow.appendChild(actionsWrapper);
  groupEl.appendChild(titleRow);

  // --- لینک‌های این گروه ---
  group.links.forEach((link, linkIndex) => {
    const linkRow = document.createElement("div");
    linkRow.className = "link-row";
    linkRow.dataset.linkUrl = link.url;

    const a = document.createElement("a");
    a.href = link.url;
    a.className = "link-item";
    a.draggable = false;
    a.target = state.settings?.openInNewTab ? "_blank" : "_self";

    const img = document.createElement("img");
    const domain = new URL(link.url).hostname;
    img.src = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
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
        { label: "Edit", action: () => editLink(groupIndex, linkIndex) },
        { label: "Delete", action: () => deleteLink(groupIndex, linkIndex), danger: true },
      ]);
    });

    linkRow.appendChild(a);
    linkRow.appendChild(linkOptionsBtn);
    groupEl.appendChild(linkRow);
  });

  return groupEl;
}

function renderGroups() {
  const currentTab = state.tabs[state.activeTab];

  // migration: اگه گروه‌ها id ندارن، بهشون id بده
  currentTab.groups.forEach((group, i) => {
    if (!group.id) {
      group.id = "group-" + Date.now() + "-" + i;
    }
  });

  // migration: مطمئن شو همه گروه‌ها تو یه ستون هستن
  if (currentTab.columns) {
    const allIdsInColumns = currentTab.columns.flat();
    currentTab.groups.forEach((group) => {
      if (!allIdsInColumns.includes(group.id)) {
        // گروهی که تو هیچ ستونی نیست رو به ستون ۰ اضافه کن
        currentTab.columns[0].push(group.id);
      }
    });
    saveState();
  }

  // migration: اگه columns نداشت بساز
  if (!currentTab.columns) {
    currentTab.columns = [currentTab.groups.map((g) => g.id), [], [], []];
    saveState();
  } else {
    // اگه columns با number (index قدیمی) پر شده، به id تبدیل کن
    const hasNumbers = currentTab.columns.some((col) => col.some((item) => typeof item === "number"));
    if (hasNumbers) {
      currentTab.columns = currentTab.columns.map((col) => col.map((item) => (typeof item === "number" ? currentTab.groups[item]?.id : item)).filter(Boolean));
      saveState();
    }
  }

  // پاک کردن همه ستون‌ها
  document.querySelectorAll(".column").forEach((col) => (col.innerHTML = ""));

  // رندر هر ستون
  currentTab.columns.forEach((groupIds, colIndex) => {
    const colEl = document.querySelector(`.column[data-col="${colIndex}"]`);
    if (!colEl) return;

    groupIds.forEach((groupId) => {
      const group = currentTab.groups.find((g) => g.id === groupId);
      if (!group) return;

      const groupIndex = currentTab.groups.indexOf(group);
      const groupEl = buildGroupEl(group, groupIndex);
      groupEl.dataset.groupId = groupId;
      groupEl.dataset.groupIndex = groupIndex;
      groupEl.dataset.colIndex = colIndex;

      // درگ گروه بین ستون‌ها

      colEl.appendChild(groupEl);
    });

    // دکمه add group برای هر ستون
    const addGroupBtn = document.createElement("button");
    addGroupBtn.className = "add-group-btn";
    addGroupBtn.textContent = "+ Add group";
    addGroupBtn.addEventListener("click", () => openModal("group", null, colIndex));
    colEl.appendChild(addGroupBtn);
  });

  // setup درگ لینک‌ها
  document.querySelectorAll(".group").forEach((groupEl) => {
    const groupIndex = parseInt(groupEl.dataset.groupIndex);
    initLinkSortable(groupEl, groupIndex);
  });
}
function initColumnDrag() {
  const container = document.getElementById("columnsContainer");

  container.addEventListener("dragover", (e) => {
    const draggingGroup = document.querySelector(".group.dragging");
    if (!draggingGroup) return;
    e.preventDefault(); // همیشه preventDefault بزن

    const colEl = e.target.closest(".column");
    if (!colEl) return;

    document.querySelectorAll(".column").forEach((c) => c.classList.remove("drag-over"));
    colEl.classList.add("drag-over");

    const siblings = [...colEl.querySelectorAll(".group:not(.dragging)")];
    const after = siblings.find((sibling) => {
      const rect = sibling.getBoundingClientRect();
      return e.clientY < rect.top + rect.height / 2;
    });

    if (after) {
      colEl.insertBefore(draggingGroup, after);
    } else {
      const btn = colEl.querySelector(".add-group-btn");
      colEl.insertBefore(draggingGroup, btn || null);
    }
  });

  container.addEventListener("dragleave", (e) => {
    if (!container.contains(e.relatedTarget)) {
      document.querySelectorAll(".column").forEach((c) => c.classList.remove("drag-over"));
    }
  });

  container.addEventListener("drop", (e) => {});

  container.addEventListener("drop", (e) => {
    e.preventDefault();
    document.querySelectorAll(".column").forEach((c) => c.classList.remove("drag-over"));

    if (!draggingGroupId) return;

    // پیدا کردن ستون از موقعیت X ماوس
    const columns = [...document.querySelectorAll(".column")];
    const colEl = columns.find((col) => {
      const rect = col.getBoundingClientRect();
      return e.clientX >= rect.left && e.clientX <= rect.right;
    });

    if (!colEl) return;
    const colIndex = parseInt(colEl.dataset.col);

    const currentTab = state.tabs[state.activeTab];

    const allGroupEls = [...colEl.querySelectorAll(".group")];
    const draggingEl = document.querySelector(".group.dragging");
    const nonDraggingEls = allGroupEls.filter((el) => el !== draggingEl);
    const afterEl = nonDraggingEls.find((el) => {
      return allGroupEls.indexOf(draggingEl) < allGroupEls.indexOf(el);
    });

    const newPos = afterEl ? currentTab.columns[colIndex].indexOf(afterEl.dataset.groupId) : currentTab.columns[colIndex].length;

    currentTab.columns[draggingFromCol] = currentTab.columns[draggingFromCol].filter((id) => id !== draggingGroupId);

    currentTab.columns[colIndex] = currentTab.columns[colIndex].filter((id) => id !== draggingGroupId);

    const insertPos = Math.min(newPos, currentTab.columns[colIndex].length);
    currentTab.columns[colIndex].splice(insertPos, 0, draggingGroupId);

    saveStateNow();
    renderGroups();
  });
}

function deleteGroup(groupIndex) {
  const currentTab = state.tabs[state.activeTab];
  const groupId = currentTab.groups[groupIndex].id;

  openConfirmModal({
    title: "Delete Group",
    message: `مطمئنی می‌خوای گروه "${currentTab.groups[groupIndex].title}" رو پاک کنی؟`,
    danger: true,
    confirmText: "Delete",
    onConfirm: () => {
      currentTab.columns = currentTab.columns.map((col) => col.filter((id) => id !== groupId));
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
  // menu.closest("group").style.zIndex = 10;
  anchorBtn.parentElement.style.position = "relative";
  anchorBtn.parentElement.appendChild(menu);
  openMenuAnchor = anchorBtn;
  menu.closest(".group").style.zIndex = 10;
}

function closeItemMenu() {
  const existing = document.getElementById("itemMenu");

  if (existing) {
    existing.closest(".group").style.zIndex = 0;
    existing.remove();
  }
  openMenuAnchor = null;
}
function editLink(groupIndex, linkIndex) {
  const link = state.tabs[state.activeTab].groups[groupIndex].links[linkIndex];

  const overlay = document.getElementById("editLinkOverlay");
  document.getElementById("editLinkName").value = link.name;
  document.getElementById("editLinkUrl").value = link.url;
  overlay.classList.add("open");
  // submit
  const form = document.getElementById("editLinkForm");
  const newForm = form.cloneNode(true); // clone برای حذف listener قبلی
  form.parentNode.replaceChild(newForm, form);

  setTimeout(() => document.getElementById("editLinkName").focus(), 50);

  newForm.addEventListener("submit", (e) => {
    e.preventDefault();
    let newUrl = document.getElementById("editLinkUrl").value.trim();
    const newName = document.getElementById("editLinkName").value.trim();
    if (!newName || !newUrl) return;

    if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
      newUrl = "https://" + newUrl;
    }

    link.name = newName;
    link.url = newUrl;

    renderGroups();
    saveState();
    overlay.classList.remove("open");
  });

  document.getElementById("editLinkCancelBtn").addEventListener("click", () => {
    overlay.classList.remove("open");
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
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

export { renderGroups, initColumnDrag };
