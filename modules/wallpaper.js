import { state, saveState } from "./state.js";

export const starterWallpapers = [
  { name: "Dragon Oath", url: "../images/wallpapers/11.jpg" },
  { name: "Crescent Ember", url: "../images/wallpapers/1.jpg" },
  { name: "Summit Glow", url: "../images/wallpapers/2.jpg" },
  { name: "Violet Tempest", url: "../images/wallpapers/3.jpg" },
  { name: "Wraith Circle", url: "../images/wallpapers/4.jpg" },
  { name: "Wraith Circle", url: "../images/wallpapers/5.jpg" },
  { name: "Mist Valley", url: "../images/wallpapers/6.jpg" },
  { name: "Mist Valley", url: "../images/wallpapers/7.jpg" },
  { name: "Solar Portal", url: "../images/wallpapers/8.jpg" },
  { name: "Crimson Gate", url: "../images/wallpapers/9.jpg" },
  { name: "Poppy Drift", url: "../images/wallpapers/10.jpg" },
  { name: "Lonely road", url: "../images/wallpapers/12.jpg" },
  { name: "Desert car", url: "../images/wallpapers/13.jpg" },
  { name: "Laid Streaks", url: "../images/wallpapers/14.jpg" },
];

function setWallpaper(url) {
  document.body.style.backgroundImage = `url('${url}')`;
  state.wallpaper = url;
  saveState();
  renderWallpaperGrid();
}

function renderWallpaperGrid() {
  const grid = document.getElementById("wallpaperGrid");
  grid.innerHTML = "";

  starterWallpapers.forEach((wp) => {
    const item = document.createElement("div");
    item.className = "wallpaper-item" + (state.wallpaper === wp.url ? " active" : "");

    const img = document.createElement("img");
    img.src = wp.url;
    img.loading = "lazy";

    const label = document.createElement("span");
    label.textContent = wp.name;

    item.appendChild(img);
    item.appendChild(label);
    item.addEventListener("click", (e) => {
      e.stopPropagation();

      // آپدیت UI بدون rebuild
      document.querySelectorAll(".wallpaper-item").forEach((el) => el.classList.remove("active"));
      item.classList.add("active");

      // عوض کردن بک‌گراند و ذخیره
      document.body.style.backgroundImage = `url('${wp.url}')`;
      state.wallpaper = wp.url;
      saveState();
    });
    grid.appendChild(item);
  });
}

export function initWallpaper() {
  // اگه والپیپر ذخیره‌شده داشت، اعمالش کن

  // باز/بسته کردن پنل
  document.getElementById("wallpaperBtn").addEventListener("click", (e) => {
    e.stopPropagation();

    const panel = document.getElementById("wallpaperPanel");
    const isOpen = panel.classList.contains("open");
    if (!isOpen) renderWallpaperGrid();
    panel.classList.toggle("open");
    document.getElementById("wallpaperBtn").classList.toggle("active");
  });

  // بستن با کلیک بیرون پنل
  document.addEventListener("click", (e) => {
    const panel = document.getElementById("wallpaperPanel");
    const btn = document.getElementById("wallpaperBtn");
    if (!panel.contains(e.target) && e.target !== btn) {
      panel.classList.remove("open");
      document.getElementById("wallpaperBtn").classList.remove("active");
    }
  });

  // آپلود تصویر
  document.getElementById("uploadWallpaperBtn").addEventListener("click", () => {
    document.getElementById("wallpaperFileInput").click();
  });

  document.getElementById("wallpaperFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setWallpaper(event.target.result);
    };
    reader.readAsDataURL(file);
  });
}
