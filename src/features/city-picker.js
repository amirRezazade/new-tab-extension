const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
const MAX_RESULTS = 6;
const SEARCH_DELAY_MS = 300;

function normalizeResult(result) {
  if (!result || typeof result.name !== "string"
    || !Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) return null;
  return {
    id: typeof result.id === "number" || typeof result.id === "string" ? result.id : null,
    name: result.name.trim().slice(0, 80),
    admin1: typeof result.admin1 === "string" ? result.admin1.slice(0, 100) : "",
    country: typeof result.country === "string" ? result.country.slice(0, 100) : "",
    countryCode: typeof result.country_code === "string" ? result.country_code.slice(0, 8) : "",
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: typeof result.timezone === "string" ? result.timezone.slice(0, 80) : "",
  };
}

function getDetails(location) {
  return [location.admin1, location.country].filter(Boolean).join(" · ");
}

export function initializeCityPicker({ input, listbox, wrapper, initialCity, initialLocation, onSelect }) {
  let selectedCity = initialCity || "تبریز";
  let selectedLocation = initialLocation || null;
  let suggestions = [];
  let activeIndex = -1;
  let requestId = 0;
  let debounceTimer = null;
  let abortController = null;
  let composing = false;

  const close = ({ restore = false } = {}) => {
    clearTimeout(debounceTimer);
    requestId += 1;
    abortController?.abort();
    abortController = null;
    listbox.hidden = true;
    listbox.replaceChildren();
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    suggestions = [];
    activeIndex = -1;
    if (restore) input.value = selectedCity;
  };

  const renderMessage = (message) => {
    const option = document.createElement("div");
    option.className = "city-suggestions__message";
    option.setAttribute("role", "option");
    option.setAttribute("aria-disabled", "true");
    option.textContent = message;
    listbox.replaceChildren(option);
    listbox.hidden = false;
    input.setAttribute("aria-expanded", "true");
    input.removeAttribute("aria-activedescendant");
  };

  const updateActiveOption = () => {
    const options = [...listbox.querySelectorAll(".city-suggestion")];
    options.forEach((option, index) => option.setAttribute("aria-selected", String(index === activeIndex)));
    const activeOption = options[activeIndex];
    if (activeOption) input.setAttribute("aria-activedescendant", activeOption.id);
    else input.removeAttribute("aria-activedescendant");
  };

  const select = (location) => {
    if (!location) return;
    selectedLocation = location;
    selectedCity = location.name;
    input.value = location.name;
    close();
    onSelect(location);
  };

  const renderSuggestions = (locations) => {
    suggestions = locations;
    activeIndex = -1;
    if (suggestions.length === 0) {
      renderMessage("No matching cities found.");
      return;
    }

    const options = suggestions.map((location, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "city-suggestion";
      option.id = `weather-city-option-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.dataset.locationIndex = String(index);

      const primary = document.createElement("span");
      primary.className = "city-suggestion__name";
      primary.textContent = [location.name, location.admin1].filter(Boolean).join(" — ");
      const secondary = document.createElement("span");
      secondary.className = "city-suggestion__details";
      secondary.textContent = [location.country, location.timezone].filter(Boolean).join(" · ");
      option.append(primary, secondary);
      return option;
    });
    listbox.replaceChildren(...options);
    listbox.hidden = false;
    input.setAttribute("aria-expanded", "true");
    updateActiveOption();
  };

  const search = async (query) => {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      close();
      return [];
    }

    clearTimeout(debounceTimer);
    abortController?.abort();
    abortController = new AbortController();
    const { signal } = abortController;
    const thisRequest = ++requestId;
    renderMessage("Searching cities…");

    try {
      const url = new URL(GEOCODING_ENDPOINT);
      url.searchParams.set("name", cleanQuery);
      url.searchParams.set("count", String(MAX_RESULTS));
      url.searchParams.set("language", "fa");
      url.searchParams.set("format", "json");
      const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`City search failed (${response.status}).`);
      const payload = await response.json();
      if (thisRequest !== requestId) return [];

      const seen = new Set();
      const locations = (Array.isArray(payload.results) ? payload.results : [])
        .map(normalizeResult)
        .filter(Boolean)
        .filter((location) => {
          const key = `${location.id ?? ""}:${location.latitude}:${location.longitude}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, MAX_RESULTS);
      renderSuggestions(locations);
      return locations;
    } catch (error) {
      if (error?.name === "AbortError" || thisRequest !== requestId) return [];
      renderMessage("Could not load city suggestions.");
      return [];
    }
  };

  const scheduleSearch = () => {
    if (composing) return;
    clearTimeout(debounceTimer);
    const query = input.value.trim();
    if (query.length < 2) {
      close();
      return;
    }
    requestId += 1;
    abortController?.abort();
    abortController = null;
    suggestions = [];
    activeIndex = -1;
    renderMessage("Searching cities…");
    debounceTimer = globalThis.setTimeout(() => void search(query), SEARCH_DELAY_MS);
  };

  const submit = async () => {
    const query = input.value.trim();
    if (!query) {
      close({ restore: true });
      return;
    }

    let locations = suggestions;
    if (!listbox.hidden && locations.length > 0) {
      select(locations[activeIndex >= 0 ? activeIndex : 0]);
      return;
    }
    locations = await search(query);
    if (locations.length > 0) select(locations[0]);
  };

  input.addEventListener("input", scheduleSearch);
  input.addEventListener("compositionstart", () => { composing = true; });
  input.addEventListener("compositionend", () => {
    composing = false;
    scheduleSearch();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
      return;
    }
    if (event.key === "ArrowDown" && !listbox.hidden && suggestions.length > 0) {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % suggestions.length;
      updateActiveOption();
    } else if (event.key === "ArrowUp" && !listbox.hidden && suggestions.length > 0) {
      event.preventDefault();
      activeIndex = activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1;
      updateActiveOption();
    } else if (event.key === "Escape" && !listbox.hidden) {
      event.stopPropagation();
      close({ restore: true });
    }
  });
  listbox.addEventListener("click", (event) => {
    const option = event.target.closest(".city-suggestion");
    if (!option) return;
    const location = suggestions[Number(option.dataset.locationIndex)];
    select(location);
  });
  document.addEventListener("pointerdown", (event) => {
    if (wrapper.contains(event.target)) return;
    close({ restore: true });
  });
  wrapper.addEventListener("focusout", () => {
    globalThis.requestAnimationFrame(() => {
      if (!wrapper.contains(document.activeElement)) close({ restore: true });
    });
  });

  input.value = selectedLocation?.name || selectedCity;

  return {
    search,
    submit,
    setSelected(location, city = location?.name || selectedCity) {
      selectedLocation = location || null;
      selectedCity = city || "تبریز";
      input.value = selectedLocation?.name || selectedCity;
      close();
    },
    getSelected() {
      return selectedLocation;
    },
    destroy() {
      clearTimeout(debounceTimer);
      abortController?.abort();
      requestId += 1;
    },
  };
}
