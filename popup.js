// گرفتن اطلاعات تب فعلی
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const url = tab.url;
  const title = tab.title;

  document.getElementById("pageUrl").textContent = url;
  document.getElementById("linkTitle").value = title;
  // لود کردن گروه‌ها از storage
  chrome.storage.sync.get(["appState"], (result) => {
    const state = result.appState;
    if (!state) return;

    const select = document.getElementById("groupSelect");

    // پر کردن dropdown با همه گروه‌های همه تب‌ها
    state.tabOrder.forEach((tabId) => {
      const tab = state.tabs[tabId];
      tab.groups.forEach((group, groupIndex) => {
        const option = document.createElement("option");
        option.value = `${tabId}:${groupIndex}`;
        option.textContent = `${tab.name} › ${group.title}`;
        select.appendChild(option);
      });
    });

    // اضافه کردن لینک
    document.getElementById("addBtn").addEventListener("click", () => {
      const customTitle = document.getElementById("linkTitle").value.trim() || title;
      const [tabId, groupIndex] = select.value.split(":");

      state.tabs[tabId].groups[parseInt(groupIndex)].links.push({
        name: customTitle, // ← به‌جای title ثابت
        url: url,
      });

      chrome.storage.sync.set({ appState: state }, () => {
        document.getElementById("successMsg").style.display = "block";
        document.getElementById("addBtn").style.display = "none";
        setTimeout(() => window.close(), 1000);
      });
    });
  });
});
