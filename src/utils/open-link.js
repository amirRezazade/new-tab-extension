export function openWebLinkInBackground(event, url) {
  const tabsApi = globalThis.chrome?.tabs;
  if (!tabsApi?.create || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

  try {
    tabsApi.create({ url, active: false }, () => {
      const error = globalThis.chrome?.runtime?.lastError;
      if (error) console.error("Could not open the link in a background tab:", error.message);
    });
    event.preventDefault();
    return true;
  } catch (error) {
    console.error("Could not open the link in a background tab:", error);
    return false;
  }
}
