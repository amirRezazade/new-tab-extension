import { state } from "./state.js";

function getAllLinks() {
  const results = [];

  Object.keys(state.tabs).forEach((tabId) => {
    const tab = state.tabs[tabId];
    tab.groups.forEach((group) => {
      group.links.forEach((link) => {
        results.push({
          name: link.name,
          url: link.url,
          groupTitle: group.title,
          tabName: tab.name,
        });
      });
    });
  });

  return results;
}

function renderResults(query) {
  const container = document.getElementById("searchResults");
  container.innerHTML = "";

  const allLinks = getAllLinks();

  const filtered = query ? allLinks.filter((link) => link.name.toLowerCase().includes(query.toLowerCase()) || link.url.toLowerCase().includes(query.toLowerCase()) || link.groupTitle.toLowerCase().includes(query.toLowerCase())) : allLinks;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="search-empty">نتیجه‌ای پیدا نشد</div>';
    return;
  }

  filtered.forEach((link) => {
    const item = document.createElement("a");
    item.className = "search-result-item";
    item.href = link.url;
    item.target = state.settings?.openInNewTab ? "_blank" : "_self";

    const img = document.createElement("img");
    const domain = new URL(link.url).hostname;
    img.src = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    img.onerror = () => {
      img.style.display = "none";
    };

    const info = document.createElement("div");
    info.className = "search-result-info";

    const name = document.createElement("div");
    name.className = "search-result-name";
    name.textContent = link.name;

    const meta = document.createElement("div");
    meta.className = "search-result-meta";
    meta.textContent = `${link.tabName} › ${link.groupTitle}`;

    info.appendChild(name);
    info.appendChild(meta);
    item.appendChild(img);
    item.appendChild(info);
    container.appendChild(item);
  });
}

export function initSearchLinks() {
  const overlay = document.getElementById("searchOverlay");
  const input = document.getElementById("searchLinksInput");

  // باز کردن با دکمه FAB
  document.getElementById("fabSearch").addEventListener("click", () => {
    overlay.classList.add("open");
    input.value = "";
    renderResults("");
    setTimeout(() => input.focus(), 50);
  });

  // بستن با کلیک بیرون
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });

  // بستن با Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") overlay.classList.remove("open");
  });

  // سرچ real-time
  input.addEventListener("input", (e) => {
    renderResults(e.target.value.trim());
  });
}
