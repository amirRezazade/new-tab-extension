document.getElementById("searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const query = e.target.value.trim();
    if (query) {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
  }
});

function initSearch() {
  document.getElementById("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const query = e.target.value.trim();
      if (query) window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
  });
}
export { initSearch };
