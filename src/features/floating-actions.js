export function initializeFloatingActionMenu({ menu, toggle }) {
  let isOpen = false;

  const sync = () => {
    toggle.setAttribute("aria-expanded", String(isOpen));
    menu.classList.toggle("is-open", isOpen);
  };

  toggle.addEventListener("click", () => {
    isOpen = !isOpen;
    sync();
  });

  menu.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest(".floating-action-item")) return;
    isOpen = false;
    sync();
    if (!document.querySelector("dialog[open]")) toggle.focus({ preventScroll: true });
  });

  document.addEventListener("pointerdown", (event) => {
    if (menu.contains(event.target) || document.querySelector("dialog[open]")) return;
    isOpen = false;
    sync();
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isOpen || document.querySelector("dialog[open]")) return;
    isOpen = false;
    sync();
    toggle.focus({ preventScroll: true });
  });

  return {
    close() {
      isOpen = false;
      sync();
    },
  };
}
