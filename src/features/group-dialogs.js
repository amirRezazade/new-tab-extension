import { normalizeWebUrl } from "../utils/dom.js";

export function initializeGroupDialogs({ getDashboard, onAdd, onRename, onDelete, onToast }) {
  const dialog = document.getElementById("group-name-dialog");
  const form = document.getElementById("group-name-form");
  const input = document.getElementById("group-name-input");
  const title = document.getElementById("group-name-dialog-title");
  const errorMessage = document.getElementById("group-name-error");
  const initialLinkFields = document.getElementById("group-initial-link-fields");
  const initialLinkTitle = document.getElementById("group-link-title-input");
  const initialLinkUrl = document.getElementById("group-link-url-input");
  const submitButton = document.getElementById("group-name-submit");

  const deleteDialog = document.getElementById("delete-group-dialog");
  const deleteName = document.getElementById("delete-group-name");
  const deleteSummary = document.getElementById("delete-group-summary");
  const deleteConfirmButton = document.getElementById("delete-group-confirm");

  let mode = "add";
  let targetTabId = null;
  let targetColumn = 0;
  let targetGroupId = null;
  let deleteTarget = null;

  const clearError = () => {
    errorMessage.textContent = "";
    [input, initialLinkTitle, initialLinkUrl].forEach((control) => control.removeAttribute("aria-invalid"));
  };

  const showError = (message, control = input) => {
    errorMessage.textContent = message;
    control.setAttribute("aria-invalid", "true");
    control.focus();
  };

  const findTargetGroup = () => {
    const tab = getDashboard().tabs.find((entry) => entry.id === targetTabId);
    return tab?.groups.find((group) => group.id === targetGroupId) ?? null;
  };

  const openAdd = (tabId, columnIndex) => {
    mode = "add";
    targetTabId = tabId;
    targetColumn = columnIndex;
    targetGroupId = null;
    title.textContent = "Add a group";
    input.value = "";
    initialLinkTitle.value = "";
    initialLinkUrl.value = "";
    initialLinkFields.hidden = false;
    submitButton.textContent = "Add group";
    clearError();
    dialog.showModal();
    input.focus();
  };

  const openRename = (tabId, group) => {
    mode = "rename";
    targetTabId = tabId;
    targetColumn = group.column;
    targetGroupId = group.id;
    title.textContent = "Rename group";
    input.value = group.name;
    initialLinkTitle.value = "";
    initialLinkUrl.value = "";
    initialLinkFields.hidden = true;
    submitButton.textContent = "Save changes";
    clearError();
    dialog.showModal();
    input.focus();
    input.select();
  };

  const openDelete = (tabId, group) => {
    deleteTarget = { tabId, groupId: group.id, column: group.column };
    deleteName.textContent = group.name;
    const linkCount = group.links.length;
    deleteSummary.textContent = linkCount
      ? `This also removes ${linkCount} ${linkCount === 1 ? "link" : "links"} inside the group.`
      : "This group does not contain any links.";
    deleteDialog.showModal();
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();
    const name = input.value.trim();
    if (!name) {
      showError("Please enter a group name.");
      return;
    }
    if (name.length > 32) {
      showError("Group names must be 32 characters or fewer.");
      return;
    }

    const dashboard = getDashboard();
    const tab = dashboard.tabs.find((entry) => entry.id === targetTabId);
    if (!tab) {
      showError("This tab is no longer available. Close this dialog and try again.");
      return;
    }

    const duplicate = tab.groups.some((group) =>
      group.id !== targetGroupId && group.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
    if (duplicate) {
      showError("A group with this name already exists in this tab.");
      return;
    }

    if (mode === "rename") {
      const group = findTargetGroup();
      if (!group) {
        showError("This group is no longer available. Close this dialog and try again.");
        return;
      }
      try {
        const succeeded = await onRename(targetTabId, targetGroupId, name);
        if (succeeded !== false) {
          const focusId = `group-focus-${targetGroupId}`;
          dialog.close();
          document.getElementById(focusId)?.focus();
        }
      } catch (error) {
        console.error("Could not rename the group:", error);
        showError("Could not save this group. Please try again.");
      }
      return;
    }

    const titleValue = initialLinkTitle.value.trim();
    const urlValue = initialLinkUrl.value.trim();
    const hasTitle = Boolean(titleValue);
    const hasUrl = Boolean(urlValue);
    if (hasTitle !== hasUrl) {
      const missing = hasTitle ? initialLinkUrl : initialLinkTitle;
      showError("To add the first link, fill in both its title and URL, or leave both fields blank.", missing);
      return;
    }

    let initialLink = null;
    if (hasTitle && hasUrl) {
      const normalizedUrl = normalizeWebUrl(urlValue);
      if (!normalizedUrl) {
        showError("Enter a valid HTTP or HTTPS web address.", initialLinkUrl);
        return;
      }
      initialLink = { title: titleValue, url: normalizedUrl };
    }

    try {
      const succeeded = await onAdd(targetTabId, targetColumn, name, initialLink);
      if (succeeded !== false) {
        const focusId = `add-group-button-${targetTabId}-${targetColumn}`;
        dialog.close();
        document.getElementById(focusId)?.focus();
      }
    } catch (error) {
      console.error("Could not create the group:", error);
      showError("Could not save this group. Please try again.");
    }
  });

  [input, initialLinkTitle, initialLinkUrl].forEach((control) => control.addEventListener("input", clearError));
  dialog.querySelectorAll("[data-close-group-dialog]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    const targetStillExists = mode === "rename" && findTargetGroup();
    if (targetStillExists) {
      document.getElementById(`group-focus-${targetGroupId}`)?.focus();
    } else {
      document.getElementById(`add-group-button-${targetTabId}-${targetColumn}`)?.focus();
    }
  });

  deleteDialog.querySelectorAll("[data-close-delete-group]").forEach((button) => {
    button.addEventListener("click", () => deleteDialog.close());
  });
  deleteDialog.addEventListener("click", (event) => {
    if (event.target === deleteDialog) deleteDialog.close();
  });
  deleteDialog.addEventListener("close", () => {
    if (!deleteTarget) return;
    const { tabId, groupId, column } = deleteTarget;
    if (getDashboard().tabs.some((tab) => tab.groups.some((group) => group.id === groupId))) {
      document.getElementById(`group-focus-${groupId}`)?.focus();
    } else {
      document.getElementById(`add-group-button-${tabId}-${column}`)?.focus();
    }
  });

  deleteConfirmButton.addEventListener("click", async () => {
    if (!deleteTarget) return;
    const { tabId, groupId } = deleteTarget;
    const group = getDashboard().tabs.find((tab) => tab.id === tabId)?.groups.find((entry) => entry.id === groupId);
    if (!group) {
      deleteDialog.close();
      onToast("This group is no longer available.");
      return;
    }
    try {
      const succeeded = await onDelete(tabId, groupId);
      if (succeeded !== false) deleteDialog.close();
    } catch (error) {
      console.error("Could not delete the group:", error);
      onToast("Could not delete this group. Please try again.");
    }
  });

  return { openAdd, openRename, openDelete };
}
