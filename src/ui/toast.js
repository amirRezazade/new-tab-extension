export function createToast(element) {
  let timeoutId;
  return (message) => {
    element.textContent = message;
    element.classList.add("is-visible");
    globalThis.clearTimeout(timeoutId);
    timeoutId = globalThis.setTimeout(() => element.classList.remove("is-visible"), 2400);
  };
}
