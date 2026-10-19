export const STORAGE_KEYS = Object.freeze({
  dashboard: "linkDashboard.data.v1",
  settings: "linkDashboard.settings.v1",
});

const makeLink = (id, title, url, brand, order) => ({ id, title, url, brand, order });
const makeGroup = (id, name, column, order, links) => ({ id, name, column, order, links });

export const DEFAULT_DASHBOARD = Object.freeze({
  schemaVersion: 3,
  activeTabId: "ai",
  tabs: [
    {
      id: "ai",
      name: "AI",
      order: 0,
      groups: [makeGroup("ai-assistants", "AI assistants", 0, 0, [makeLink("arena-ai", "Arena AI", "https://arena.ai/", "arena", 0), makeLink("chatgpt", "ChatGPT", "https://chatgpt.com/", "chatgpt", 1), makeLink("claude", "Claude", "https://claude.ai/", "claude", 2), makeLink("gemini", "Gemini", "https://gemini.google.com/app", null, 3)])],
    },
    {
      id: "work",
      name: "Work",
      order: 1,
      groups: [
        makeGroup("work-development", "Development", 0, 0, [makeLink("github", "GitHub", "https://github.com/", null, 0), makeLink("mdn", "MDN Web Docs", "https://developer.mozilla.org/", null, 1), makeLink("stackoverflow", "Stack Overflow", "https://stackoverflow.com/", null, 2)]),
        makeGroup("work-design", "Design & UI", 1, 0, [makeLink("figma", "Figma", "https://www.figma.com/", null, 0), makeLink("react-bits", "React Bits", "https://reactbits.dev/", null, 1), makeLink("uiverse", "Uiverse", "https://uiverse.io/", null, 2), makeLink("lucide", "Lucide Icons", "https://lucide.dev/", null, 3)]),
      ],
    },
    {
      id: "social",
      name: "Social",
      order: 3,
      groups: [makeGroup("social-messaging", "Messaging & email", 0, 0, [makeLink("gmail", "Gmail", "https://mail.google.com/", null, 0), makeLink("telegram-web", "Telegram Web", "https://web.telegram.org/", null, 1), makeLink("whatsapp-web", "WhatsApp Web", "https://web.whatsapp.com/", null, 2)])],
    },
  ],
});

export const DEFAULT_WEATHER_LOCATION = Object.freeze({
  id: 113646,
  name: "تبریز",
  admin1: "آذربایجان شرقی",
  country: "ایران",
  countryCode: "IR",
  latitude: 38.08,
  longitude: 46.2919,
  timezone: "Asia/Tehran",
});

export const DEFAULT_SETTINGS = Object.freeze({
  showSearch: true,
  showClockAndWeather: true,
  openLinksInNewTab: true,
  weatherCity: "تبریز",
  weatherLocation: DEFAULT_WEATHER_LOCATION,
  theme: "ember",
  backgroundMode: "scene",
  backgroundColor: "#101817",
  wallpaperPreset: null,
  primaryColor: null,
  textColor: null,
  groupBlur: 0,
  cardOpacity: 0,
});
