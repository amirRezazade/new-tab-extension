import { createElement, isSafeWebUrl } from "../utils/dom.js";
import { createFaviconIcon } from "../utils/favicon.js";
import { openWebLinkInBackground } from "../utils/open-link.js";

function getInitials(value) {
  const words = String(value || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return (words[0] || "?").slice(0, 2).toUpperCase();
}

function getDomain(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value || "";
  }
}

function collectLinks(dashboard) {
  return dashboard.tabs
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((tab) =>
      tab.groups
        .slice()
        .sort((a, b) => a.column - b.column || a.order - b.order)
        .flatMap((group) =>
          group.links
            .slice()
            .sort((a, b) => a.order - b.order)
            .filter((link) => isSafeWebUrl(link.url))
            .map((link) => ({ tab, group, link })),
        ),
    );
}

export function initializeLinkSearch({ dialog, openButton, input, results, emptyState, getDashboard, getOpenLinksInNewTab = () => true }) {
  const closeButton = dialog.querySelector("[data-close-link-search]");
  const form = dialog.querySelector("#link-search-form");

  const renderResults = () => {
    const query = input.value.trim().toLocaleLowerCase();
    const allLinks = collectLinks(getDashboard());
    const matches = query ? allLinks.filter(({ tab, group, link }) => `${link.title} ${link.url} ${group.name} ${tab.name}`.toLocaleLowerCase().includes(query)) : [];

    results.replaceChildren();
    if (!query) {
      emptyState.textContent = "Type to search your links.";
      emptyState.hidden = false;
      return;
    }
    if (matches.length === 0) {
      emptyState.textContent = "No matching links.";
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    matches.slice(0, 100).forEach(({ tab, group, link }) => {
      const result = document.createElement("a");
      result.className = "link-search-result";
      result.href = link.url;
      result.target = getOpenLinksInNewTab() ? "_blank" : "_self";
      if (result.target === "_blank") result.rel = "noopener noreferrer";
      result.addEventListener("click", (event) => {
        if (result.target === "_blank") openWebLinkInBackground(event, link.url);
      });
      result.setAttribute("role", "listitem");
      result.setAttribute("aria-label", `${link.title}, ${group.name}, ${tab.name}`);

      const icon = createFaviconIcon({
        url: link.url,
        fallbackText: getInitials(link.title),
        className: "link-search-result__icon",
      });
      const copy = createElement("span", "link-search-result__copy");
      const title = createElement("strong", "link-search-result__title", link.title);
      const details = createElement("span", "link-search-result__details", getDomain(link.url));
      const context = createElement("span", "link-search-result__context", `${tab.name} · ${group.name}`);
      copy.append(title, details, context);
      result.append(icon, copy);
      results.append(result);
    });
  };

  const open = () => {
    input.value = "";
    renderResults();
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => input.focus());
  };

  openButton.addEventListener("click", open);
  closeButton?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => document.getElementById("floating-menu-toggle")?.focus({ preventScroll: true }));
  input.addEventListener("input", renderResults);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    results.querySelector(".link-search-result")?.click();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      const first = results.querySelector(".link-search-result");
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  results.addEventListener("keydown", (event) => {
    if (!event.target.matches(".link-search-result")) return;
    const items = [...results.querySelectorAll(".link-search-result")];
    const index = items.indexOf(event.target);
    if (event.key === "ArrowDown" && items[index + 1]) {
      event.preventDefault();
      items[index + 1].focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      (items[index - 1] || input).focus();
    }
  });

  results.addEventListener("click", (event) => {
    if (event.target.closest(".link-search-result")) dialog.close();
  });

  return { open };
}
