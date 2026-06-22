import { state, saveState } from "./state.js";
import { renderGroups } from "./groups.js";

// این متغیرها وضعیت درگ رو نگه می‌دارن
let draggedLink = null; // خود آبجکت لینک
let draggedFromGroup = null; // index گروهی که از اون درگ شده

// این تابع رو تو groups.js داخل forEach گروه‌ها صدا بزن
export function setupLinkDrag(groupEl, groupIndex) {
  // به هر linkRow قابلیت درگ بده
  groupEl.querySelectorAll(".link-row").forEach((row, i) => {
    row.draggable = true;

    row.addEventListener("dragstart", (e) => {
      draggedLink = state.tabs[state.activeTab].groups[groupIndex].links[i];
      draggedFromGroup = groupIndex;
      row.classList.add("dragging");
      e.stopPropagation(); // نذار groupEl هم dragstart بگیره
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      draggedLink = null;
      draggedFromGroup = null;
    });
  });

  // روی container گروه گوش بده
  groupEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const draggingEl = groupEl.querySelector(".link-row.dragging");
    if (!draggingEl) return;

    const rows = [...groupEl.querySelectorAll(".link-row:not(.dragging)")];
    const addLinkBtn = groupEl.querySelector(".add-link-btn");

    const after = rows.find((row) => {
      const rect = row.getBoundingClientRect();
      return e.clientY < rect.top + rect.height / 2;
    });

    if (after) {
      groupEl.insertBefore(draggingEl, after);
    } else {
      groupEl.insertBefore(draggingEl, addLinkBtn);
    }
  });

  groupEl.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedLink === null || draggedFromGroup !== groupIndex) return;

    const links = state.tabs[state.activeTab].groups[groupIndex].links;

    // اول لینک رو از جای قدیمیش حذف کن
    const oldIndex = links.indexOf(draggedLink);
    if (oldIndex === -1) return;
    links.splice(oldIndex, 1);

    // جای جدیدش رو از DOM بخون
    const rows = [...groupEl.querySelectorAll(".link-row")];
    const draggingEl = groupEl.querySelector(".link-row.dragging");
    const newIndex = rows.indexOf(draggingEl);

    // تو جای جدید بذارش
    links.splice(newIndex, 0, draggedLink);

    saveState();
    renderGroups(); // رندر مجدد با state جدید
  });
}
