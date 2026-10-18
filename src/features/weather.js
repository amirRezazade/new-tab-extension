const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const SVG_NS = "http://www.w3.org/2000/svg";

const WEATHER_CODES = new Map([
  [0, { icon: "clear", image: "sun.png", label: "آسمان صاف" }],
  [1, { icon: "clear", image: "sun-cloud.png", label: "عمدتاً صاف" }],
  [2, { icon: "partly-cloudy", image: "partly-cloudy.png", label: "نیمه‌ابری" }],
  [3, { icon: "cloudy", image: "cloudy.png", label: "ابری" }],
  [45, { icon: "fog", image: "fog.png", label: "مه" }],
  [48, { icon: "fog", image: "fog.png", label: "مه یخ‌زده" }],
  [51, { icon: "drizzle", image: "rainy1.png", label: "ریزباران خفیف" }],
  [53, { icon: "drizzle", image: "rainy1.png", label: "ریزباران" }],
  [55, { icon: "drizzle", image: "rainy2.png", label: "ریزباران شدید" }],
  [56, { icon: "freezing-rain", label: "ریزباران یخ‌زن" }],
  [57, { icon: "freezing-rain", label: "ریزباران یخ‌زن شدید" }],
  [61, { icon: "rain", image: "rain1.png", label: "باران خفیف" }],
  [63, { icon: "rain", image: "rain2.png", label: "باران" }],
  [65, { icon: "rain", image: "rain2.png", label: "باران شدید" }],
  [66, { icon: "freezing-rain", label: "باران یخ‌زن" }],
  [67, { icon: "freezing-rain", label: "باران یخ‌زن شدید" }],
  [71, { icon: "snow", image: "snow1.png", label: "برف خفیف" }],
  [73, { icon: "snow", image: "snow2.png", label: "برف" }],
  [75, { icon: "snow", image: "snow3.png", label: "برف شدید" }],
  [77, { icon: "snow", image: "snow1.png", label: "دانه‌های برف" }],
  [80, { icon: "showers", image: "rainy3.png", label: "رگبار خفیف" }],
  [81, { icon: "showers", image: "rainy3.png", label: "رگبار" }],
  [82, { icon: "showers", image: "rainy4.png", label: "رگبار شدید" }],
  [85, { icon: "snow", image: "snow2.png", label: "رگبار برف" }],
  [86, { icon: "snow", image: "snow3.png", label: "رگبار برف شدید" }],
  [95, { icon: "thunderstorm", image: "thunderstorm.png", label: "رعدوبرق" }],
  [96, { icon: "thunderstorm", image: "hail.png", label: "رعدوبرق و تگرگ" }],
  [99, { icon: "thunderstorm", image: "hail.png", label: "رعدوبرق و تگرگ شدید" }],
]);

const SUN = `
  <circle cx="8.7" cy="8.3" r="3" fill="rgba(255, 209, 102, 0.14)" stroke="#ffd166" stroke-width="1.6" />
  <path d="M8.7 2.6v1.5m0 8.4V14m5.7-5.7h-1.5m-8.4 0H3m9.7-4-1.1 1.1m-5.8 5.8-1.1 1.1m8 0-1.1-1.1m-5.8-5.8L4.7 4.3" fill="none" stroke="#ffd166" stroke-width="1.45" stroke-linecap="round" />
`;

const MOON = `
  <path d="M17.7 13.9a6.8 6.8 0 0 1-8.9-8.8 7 7 0 1 0 8.9 8.8Z" fill="rgba(255, 209, 102, 0.12)" stroke="#ffd166" stroke-width="1.6" stroke-linejoin="round" />
  <path d="M16.9 4.1v2.1m-1.05-1.05h2.1m2.1 4.1v1.5m-.75-.75h1.5" fill="none" stroke="#ffd166" stroke-width="1.25" stroke-linecap="round" />
`;

const CLOUD = `
  <path d="M6.8 16.1h10.1a3.1 3.1 0 0 0 .2-6.2 5.1 5.1 0 0 0-9.8-1.2 3.9 3.9 0 0 0-.5 7.4Z" fill="rgba(255, 255, 255, 0.08)" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" />
`;

const RAIN = `
  <path d="m8.5 17.3-.8 2.1m4.3-2.1-.8 2.1m4.3-2.1-.8 2.1" fill="none" stroke="#84d0ff" stroke-width="1.6" stroke-linecap="round" />
`;

const SNOW = `
  <path d="M8.5 17.2v4m-1.7-3 3.4 2m0-2-3.4 2m8.8-3v4m-1.7-3 3.4 2m0-2-3.4 2" fill="none" stroke="#d9f1ff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
`;

function getWeatherIconMarkup(iconName, isDay) {
  const sky = isDay ? SUN : MOON;
  switch (iconName) {
    case "clear":
      return isDay ? `<g transform="translate(3.3 3.7)">${SUN}</g>` : MOON;
    case "partly-cloudy":
      return `${sky}${CLOUD}`;
    case "cloudy":
      return CLOUD;
    case "fog":
      return `${CLOUD}<path d="M4.5 18.5h15m-12 2.6h9" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" opacity="0.76" />`;
    case "drizzle":
      return `${CLOUD}<path d="M8.2 17.5v1m4-.4v1m4-.7v1" fill="none" stroke="#84d0ff" stroke-width="1.7" stroke-linecap="round" />`;
    case "freezing-rain":
      return `${CLOUD}${RAIN}<path d="M19.2 17.7v2m-.9-1.5 1.8 1m0-1-1.8 1" fill="none" stroke="#d9f1ff" stroke-width="1" stroke-linecap="round" />`;
    case "rain":
      return `${CLOUD}${RAIN}`;
    case "showers":
      return `${sky}${CLOUD}${RAIN}`;
    case "snow":
      return `${CLOUD}${SNOW}`;
    case "thunderstorm":
      return `${CLOUD}<path d="m13.3 15.9-2.7 3.5h2.5l-1 3 3.7-4.9h-2.5l1-1.6Z" fill="#ffd166" stroke="#ffd166" stroke-width="0.8" stroke-linejoin="round" /><path d="m8.4 17.5-.6 1.8m7.8-1.8-.6 1.8" fill="none" stroke="#84d0ff" stroke-width="1.35" stroke-linecap="round" />`;
    default:
      return CLOUD;
  }
}

function createSvgWeatherIcon(iconName, isDay) {
  const icon = document.createElementNS(SVG_NS, "svg");
  icon.setAttribute("class", "weather-status__icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");
  icon.innerHTML = getWeatherIconMarkup(iconName, isDay);
  return icon;
}

const DAYLIGHT_ONLY_WEATHER_IMAGES = new Set(["sun.png", "sun-cloud.png", "partly-cloudy.png"]);

function createWeatherIcon(iconName, isDay, imageName = "") {
  if (!imageName || (!isDay && DAYLIGHT_ONLY_WEATHER_IMAGES.has(imageName))) {
    return createSvgWeatherIcon(iconName, isDay);
  }

  const image = document.createElement("img");
  image.className = "weather-status__icon";
  image.alt = "";
  image.setAttribute("aria-hidden", "true");
  image.draggable = false;
  image.decoding = "async";
  image.addEventListener("error", () => image.replaceWith(createSvgWeatherIcon(iconName, isDay)), { once: true });
  image.src = new URL(`../../assets/weather-icons/${imageName}`, import.meta.url).href;
  return image;
}

function normalizeLocation(location) {
  if (!location || !Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90 || !Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180) return null;
  return {
    id: typeof location.id === "number" || typeof location.id === "string" ? location.id : null,
    name: typeof location.name === "string" && location.name.trim() ? location.name.trim() : "",
    admin1: typeof location.admin1 === "string" ? location.admin1 : "",
    country: typeof location.country === "string" ? location.country : "",
    countryCode: typeof location.countryCode === "string" ? location.countryCode : "",
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: typeof location.timezone === "string" ? location.timezone : "",
  };
}

async function fetchJSON(url, signal) {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Weather service returned ${response.status}.`);
  return response.json();
}

async function geocodeCity(city, signal) {
  const url = new URL(GEOCODING_ENDPOINT);
  url.searchParams.set("name", city);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "fa");
  url.searchParams.set("format", "json");
  const payload = await fetchJSON(url, signal);
  const result = payload.results?.[0];
  if (!result) return null;
  return normalizeLocation({
    id: result.id,
    name: result.name,
    admin1: result.admin1,
    country: result.country,
    countryCode: result.country_code,
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
  });
}

function getLocationKey(city, location) {
  return location ? `coordinates:${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}` : `city:${city.toLocaleLowerCase()}`;
}

function setStatusMessage(element, message, state, accessibleLabel = message) {
  element.replaceChildren(document.createTextNode(message));
  element.setAttribute("aria-label", accessibleLabel);
  element.dataset.state = state;
}

export function initializeWeather({ element, city = "تبریز", location = null, enabled = true }) {
  let currentCity = String(city || "تبریز").trim() || "تبریز";
  let currentLocation = normalizeLocation(location);
  let activeKey = "";
  let requestId = 0;
  let abortController = null;
  let isEnabled = Boolean(enabled);

  const load = async (requestedCity, requestedLocation = currentLocation, { force = false } = {}) => {
    currentCity = String(requestedCity || "تبریز").trim() || "تبریز";
    currentLocation = normalizeLocation(requestedLocation);
    if (!isEnabled) return;

    const requestKey = getLocationKey(currentCity, currentLocation);
    if (!force && requestKey === activeKey) return;
    activeKey = requestKey;
    const thisRequest = ++requestId;
    abortController?.abort();
    abortController = new AbortController();
    const { signal } = abortController;
    setStatusMessage(element, "در حال دریافت آب‌وهوا…", "loading", `در حال دریافت آب‌وهوا برای ${currentCity}`);

    try {
      const locationData = currentLocation || (await geocodeCity(currentCity, signal));
      if (!locationData) throw new Error(`No weather location found for ${currentCity}.`);
      if (thisRequest !== requestId || !isEnabled) return;
      currentLocation = locationData;

      const forecastURL = new URL(FORECAST_ENDPOINT);
      forecastURL.searchParams.set("latitude", String(locationData.latitude));
      forecastURL.searchParams.set("longitude", String(locationData.longitude));
      forecastURL.searchParams.set("current", "temperature_2m,weather_code,is_day");
      forecastURL.searchParams.set("timezone", locationData.timezone || "auto");
      const forecast = await fetchJSON(forecastURL, signal);
      if (thisRequest !== requestId || !isEnabled) return;

      const current = forecast.current;
      if (!current || !Number.isFinite(current.temperature_2m)) throw new Error("Weather data is unavailable.");
      const condition = WEATHER_CODES.get(current.weather_code) || { icon: "cloudy", label: "شرایط نامشخص" };
      const isDay = current.is_day !== 0;
      const temperature = Math.round(current.temperature_2m);
      const placeName = locationData.name || currentCity;

      const temperatureElement = document.createElement("span");
      temperatureElement.className = "weather-status__temperature";
      temperatureElement.textContent = `${temperature}°`;

      const separator = document.createElement("span");
      separator.className = "weather-status__separator";
      separator.setAttribute("aria-hidden", "true");
      separator.textContent = "·";

      const placeElement = document.createElement("span");
      placeElement.className = "weather-status__place";
      placeElement.textContent = placeName;

      element.replaceChildren(createWeatherIcon(condition.icon, isDay, condition.image), temperatureElement, separator, placeElement);
      element.setAttribute("aria-label", `آب‌وهوای ${placeName}: ${temperature} درجهٔ سلسیوس، ${condition.label}`);
      element.dataset.state = "ready";
    } catch (error) {
      if (error?.name === "AbortError" || thisRequest !== requestId) return;
      setStatusMessage(element, "آب‌وهوا در دسترس نیست", "error", `آب‌وهوا برای ${currentCity} در دسترس نیست`);
    }
  };

  const refreshTimer = globalThis.setInterval(() => {
    if (isEnabled) void load(currentCity, currentLocation, { force: true });
  }, REFRESH_INTERVAL_MS);
  if (isEnabled) void load(currentCity, currentLocation, { force: true });

  return {
    setLocation(nextCity, nextLocation) {
      void load(nextCity, nextLocation);
    },
    setCity(nextCity) {
      void load(nextCity, null);
    },
    setEnabled(nextEnabled) {
      const wasEnabled = isEnabled;
      isEnabled = Boolean(nextEnabled);
      if (!isEnabled) {
        requestId += 1;
        abortController?.abort();
        element.replaceChildren();
        element.removeAttribute("aria-label");
        element.dataset.state = "idle";
      } else if (!wasEnabled) {
        void load(currentCity, currentLocation, { force: true });
      }
    },
    refresh() {
      return load(currentCity, currentLocation, { force: true });
    },
    destroy() {
      requestId += 1;
      abortController?.abort();
      globalThis.clearInterval(refreshTimer);
    },
  };
}
