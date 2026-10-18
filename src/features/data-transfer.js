const MAX_BACKUP_FILE_BYTES = 16 * 1024 * 1024;

function downloadJSONFile(jsonText) {
  const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `novatab-backup-${date}.json`;
  anchor.hidden = true;
  const activeDialog = document.querySelector("dialog[open]");
  (activeDialog || document.body).append(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function initializeDataTransfer({ importActions, exportButtons, onExport, onImport, onToast }) {
  exportButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const jsonText = await onExport();
        downloadJSONFile(jsonText);
        onToast("Dashboard backup exported.");
      } catch (error) {
        onToast(error instanceof Error ? error.message : "Could not export the dashboard.");
      } finally {
        button.disabled = false;
      }
    });
  });

  importActions.forEach(({ button, fileInput }) => {
    button.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;
      if (file.size > MAX_BACKUP_FILE_BYTES) {
        onToast("That backup file is too large.");
        return;
      }

      if (!globalThis.confirm("Importing this backup will replace the current dashboard and appearance settings. Continue?")) {
        return;
      }

      button.disabled = true;
      try {
        const didImport = await onImport(await file.text());
        if (didImport) onToast("Dashboard backup imported.");
      } catch (error) {
        onToast(error instanceof Error ? error.message : "Could not import that backup.");
      } finally {
        button.disabled = false;
      }
    });
  });
}
