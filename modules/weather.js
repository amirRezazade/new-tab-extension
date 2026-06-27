import { state } from "./state.js";

const weatherCodes = {
  0: { icon: "../images/weather-icons/sun.png" },
  1: { icon: "../images/weather-icons/sun-cloud.png" },
  2: { icon: "../images/weather-icons/partly-cloudy.png" },
  3: { icon: "../images/weather-icons/cloudy.png" },
  45: { icon: "../images/weather-icons/fog.png" },
  48: { icon: "../images/weather-icons/fog.png" },
  51: { icon: "../images/weather-icons/rany1.png" },
  53: { icon: "../images/weather-icons/rany1.png" },
  55: { icon: "../images/weather-icons/rany2.png" },
  63: { icon: "../images/weather-icons/rain1.png" },
  65: { icon: "../images/weather-icons/rain2.png" },
  71: { icon: "../images/weather-icons/snow1.png" },
  73: { icon: "../images/weather-icons/snow2.png" },
  75: { icon: "../images/weather-icons/snow3.png" },
  80: { icon: "../images/weather-icons/rany3.png" },
  81: { icon: "../images/weather-icons/rany3.png" },
  82: { icon: "../images/weather-icons/rany4.png" },
  95: { icon: "../images/weather-icons/Thunderstorm.png" },
  99: { icon: "../images/weather-icons/hail.png" },
};

export async function initWeather() {
  const widget = document.getElementById("weatherWidget");
  if (!widget) return;

  const lat = state.settings?.cityLat;
  const lon = state.settings?.cityLon;
  const cityName = state.settings?.city;

  if (!lat || !lon) {
    widget.style.display = "none";
    return;
  }

  try {
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&temperature_unit=celsius`);
    const data = await weatherRes.json();

    const temp = Math.round(data.current.temperature_2m);
    const code = data.current.weathercode;
    const weather = weatherCodes[code] || { icon: "🌡️" };

    document.getElementById("weatherIcon").src = `${weather.icon}`;
    document.getElementById("weatherTemp").textContent = `${temp}°C`;
    document.getElementById("weatherCity").textContent = cityName;
    widget.style.display = "flex";
  } catch {
    widget.style.display = "none";
  }
}
