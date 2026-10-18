import { createElement, isSafeWebUrl } from "./dom.js";

function getChromeFaviconUrl(pageUrl) {
  if (!globalThis.chrome?.runtime?.getURL) return null;
  try {
    const faviconUrl = new URL(globalThis.chrome.runtime.getURL("/_favicon/"));
    faviconUrl.searchParams.set("pageUrl", pageUrl);
    faviconUrl.searchParams.set("size", "32");
    return faviconUrl.href;
  } catch {
    return null;
  }
}

function getFaviconCandidates(value) {
  if (!isSafeWebUrl(value)) return [];
  try {
    const pageUrl = new URL(value);
    const secureOrigin = pageUrl.protocol === "https:" ? pageUrl.origin : `https://${pageUrl.host}`;
    const candidates = [getChromeFaviconUrl(pageUrl.href)].filter(Boolean);
    ["/favicon.ico", "/favicon.svg", "/favicon.png", "/apple-touch-icon.png"].forEach((path) => {
      candidates.push(new URL(path, secureOrigin).href);
    });
    return [...new Set(candidates)];
  } catch {
    return [];
  }
}

export function createFaviconIcon({ url, fallbackText, className, modifierClass = "" }) {
  const root = createElement("span", `${className}${modifierClass ? ` ${modifierClass}` : ""}`);
  root.setAttribute("aria-hidden", "true");

  const fallback = createElement("span", "favicon-fallback", fallbackText || "?");
  const image = document.createElement("img");
  image.className = "favicon-image";
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.draggable = false;

  const candidates = getFaviconCandidates(url);
  if (candidates.length === 0) {
    root.append(fallback);
    return root;
  }

  let candidateIndex = 0;
  image.addEventListener("load", () => root.classList.add("has-favicon"));
  image.addEventListener("error", () => {
    root.classList.remove("has-favicon");
    candidateIndex += 1;
    if (candidateIndex < candidates.length) {
      image.src = candidates[candidateIndex];
    } else {
      image.remove();
    }
  });

  root.append(fallback, image);
  image.src = candidates[candidateIndex];
  return root;
}
