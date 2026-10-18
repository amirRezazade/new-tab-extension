const GOOGLE_SEARCH_URL = "https://www.google.com/search";

export function initializeSearch({ form, input, settings }) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
      input.focus();
      return;
    }

    // Open a pasted web address directly; treat other input as a Google query.
    if (/^https?:\/\//i.test(query)) {
      globalThis.location.assign(query);
      return;
    }

    const destination = new URL(GOOGLE_SEARCH_URL);
    destination.searchParams.set("q", query);
    globalThis.location.assign(destination.toString());
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") input.blur();
  });

  form.hidden = !settings.showSearch;

  return {
    applyVisibility(showSearch) {
      form.hidden = !showSearch;
    },
  };
}
