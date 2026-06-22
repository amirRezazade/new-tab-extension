import { state, saveState } from "./state.js";

const starterWallpapers = [
  { name: "Milky Way", url: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1920" },
  { name: "Mountain", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920" },
  { name: "Ocean Sunset", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920" },
  { name: "Forest", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920" },
  { name: "City Night", url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920" },
  { name: "Desert", url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920" },
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
    img.src = wp.url + "&w=400";
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
  if (state.wallpaper) {
    document.body.style.backgroundImage = `url('${state.wallpaper}')`;
  }

  // باز/بسته کردن پنل
  document.getElementById("wallpaperBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const panel = document.getElementById("wallpaperPanel");
    const isOpen = panel.classList.contains("open");
    if (!isOpen) renderWallpaperGrid();
    panel.classList.toggle("open");
  });

  // بستن با کلیک بیرون پنل
  document.addEventListener("click", (e) => {
    const panel = document.getElementById("wallpaperPanel");
    const btn = document.getElementById("wallpaperBtn");
    if (!panel.contains(e.target) && e.target !== btn) {
      panel.classList.remove("open");
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
