let dragSrcIndex = null;
let dragType = null; // 'tab' | 'group' | 'link'
let dragGroupIndex = null; // فقط برای لینک‌ها

export function makeDraggable({ element, index, type, groupIndex = null, onDrop }) {
  element.draggable = true;

  element.addEventListener("dragstart", (e) => {
    dragSrcIndex = index;
    dragType = type;
    dragGroupIndex = groupIndex;
    element.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });

  element.addEventListener("dragend", () => {
    element.classList.remove("dragging");
    document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
  });

  element.addEventListener("dragover", (e) => {
    e.preventDefault();
    const draggingLink = document.querySelector(".link-row.dragging");
    if (draggingLink) return;
    e.dataTransfer.dropEffect = "move";
    element.classList.add("drag-over");
  });

  element.addEventListener("dragleave", () => {
    element.classList.remove("drag-over");
  });

  element.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove("drag-over");
    const draggingLink = document.querySelector(".link-row.dragging");
    if (draggingLink) return;

    if (dragSrcIndex === index) return; // همون جا رها شد
    if (dragType !== type) return; // نمیشه تب رو تو گروه انداخت

    onDrop(dragSrcIndex, index);
  });
}
