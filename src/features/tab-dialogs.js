export function initializeTabDialogs({ getDashboard, onAdd, onRename, onDelete, onToast }) {
  const nameDialog = document.getElementById("tab-name-dialog");
  const nameForm = document.getElementById("tab-name-form");
  const nameInput = document.getElementById("tab-name-input");
  const nameTitle = document.getElementById("tab-name-dialog-title");
  const nameSubmit = document.getElementById("tab-name-submit");
  const nameError = document.getElementById("tab-name-error");

  const deleteDialog = document.getElementById("delete-tab-dialog");
  const deleteName = document.getElementById("delete-tab-name");
  const deleteSummary = document.getElementById("delete-tab-summary");
  const deleteConfirm = document.getElementById("delete-tab-confirm");

  let mode = "add";
  let targetTabId = null;

  const clearNameError = () => {
    nameError.textContent = "";
    nameInput.removeAttribute("aria-invalid");
  };

  const showNameError = (message) => {
    nameError.textContent = message;
    nameInput.setAttribute("aria-invalid", "true");
    nameInput.focus();
  };

  const openNameDialog = (nextMode, tab = null) => {
    mode = nextMode;
    targetTabId = tab?.id ?? null;
    clearNameError();

    if (mode === "add") {
      nameTitle.textContent = "Add a tab";
      nameSubmit.textContent = "Add tab";
      nameInput.value = "";
    } else {
      nameTitle.textContent = "Rename tab";
      nameSubmit.textContent = "Save changes";
      nameInput.value = tab?.name ?? "";
    }

    nameDialog.showModal();
    nameInput.focus();
    if (mode === "rename") nameInput.select();
  };

  const openDeleteDialog = (tab) => {
    if (getDashboard().tabs.length <= 1) {
      onToast("Keep at least one tab in your dashboard.");
      return;
    }

    targetTabId = tab.id;
    deleteName.textContent = tab.name;
    const groupCount = tab.groups.length;
    const linkCount = tab.groups.reduce((total, group) => total + group.links.length, 0);
    deleteSummary.textContent = `${groupCount} ${groupCount === 1 ? "group" : "groups"} · ${linkCount} ${linkCount === 1 ? "link" : "links"} will be removed.`;
    deleteDialog.showModal();
  };

  nameForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearNameError();

    const name = nameInput.value.trim();
    if (!name) {
      showNameError("Please enter a tab name.");
      return;
    }
    if (name.length > 32) {
      showNameError("Tab names must be 32 characters or fewer.");
      return;
    }

    const duplicate = getDashboard().tabs.some((tab) =>
      tab.id !== targetTabId && tab.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
    if (duplicate) {
      showNameError("A tab with this name already exists.");
      return;
    }

    try {
      const succeeded = mode === "add"
        ? await onAdd(name)
        : await onRename(targetTabId, name);
      if (succeeded !== false) nameDialog.close();
    } catch (error) {
      console.error("Could not save the tab name:", error);
      showNameError("Could not save this tab. Please try again.");
    }
  });

  deleteConfirm.addEventListener("click", async () => {
    if (!targetTabId) return;
    try {
      const succeeded = await onDelete(targetTabId);
      if (succeeded !== false) deleteDialog.close();
    } catch (error) {
      console.error("Could not delete the tab:", error);
      onToast("Could not delete this tab. Please try again.");
    }
  });

  nameInput.addEventListener("input", clearNameError);

  nameDialog.querySelectorAll("[data-close-tab-name]").forEach((button) => {
    button.addEventListener("click", () => nameDialog.close());
  });
  deleteDialog.querySelectorAll("[data-close-delete-tab]").forEach((button) => {
    button.addEventListener("click", () => deleteDialog.close());
  });

  nameDialog.addEventListener("click", (event) => {
    if (event.target === nameDialog) nameDialog.close();
  });
  deleteDialog.addEventListener("click", (event) => {
    if (event.target === deleteDialog) deleteDialog.close();
  });

  return {
    openAdd() {
      openNameDialog("add");
    },
    openRename(tab) {
      openNameDialog("rename", tab);
    },
    openDelete(tab) {
      openDeleteDialog(tab);
    },
  };
}
