export const STORAGE_KEYS = Object.freeze({
  dashboard: "linkDashboard.data.v1",
  settings: "linkDashboard.settings.v1",
});

const makeLink = (id, title, url, brand, order) => ({ id, title, url, brand, order });

export const DEFAULT_DASHBOARD = Object.freeze({
  schemaVersion: 2,
  activeTabId: "ai",
  tabs: [
    {
      id: "ai",
      name: "Ai",
      order: 0,
      groups: [
        {
          id: "ai-chats",
          name: "chats",
          order: 0,
          column: 0,
          links: [
            makeLink("arena-ai", "Arena AI", "https://arena.ai/", "arena", 0),
            makeLink("chatgpt", "ChatGPT", "https://chatgpt.com/", "chatgpt", 1),
            makeLink("claude", "Claude", "https://claude.ai/", "claude", 2),
            makeLink("z-ai", "Z.ai", "https://chat.z.ai/", "zai", 3),
            makeLink("kimi", "Kimi", "https://www.kimi.com/", "kimi", 4),
            makeLink("genspark", "Genspark", "https://www.genspark.ai/", "genspark", 5),
            makeLink("deepseek", "DeepSeek", "https://chat.deepseek.com/", "deepseek", 6),
          ],
        },
      ],
    },
    { id: "work", name: "Work", order: 1, groups: [] },
    { id: "job", name: "job", order: 2, groups: [] },
    { id: "social", name: "Social", order: 3, groups: [] },
    { id: "school", name: "school", order: 4, groups: [] },
    { id: "projects", name: "my projects", order: 5, groups: [] },
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
