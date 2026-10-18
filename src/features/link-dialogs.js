import { normalizeWebUrl } from "../utils/dom.js";

export function initializeLinkDialogs({ getDashboard, onAddLink, onEditLink, onDeleteLink, onToast }) {
  const dialog = document.getElementById("link-dialog");
  const form = document.getElementById("link-form");
  const titleElement = document.getElementById("link-dialog-title");
  const titleInput = document.getElementById("link-title-input");
  const urlInput = document.getElementById("link-url-input");
  const errorMessage = document.getElementById("link-error");
  const submitButton = document.getElementById("link-submit");

  const deleteDialog = document.getElementById("delete-link-dialog");
  const deleteName = document.getElementById("delete-link-name");
  const deleteSummary = document.getElementById("delete-link-summary");
  const deleteConfirmButton = document.getElementById("delete-link-confirm");

  let mode = "add";
  let targetTabId = null;
  let targetGroupId = null;
  let targetLinkId = null;
  let deleteTarget = null;

  const findTargetGroup = () => getDashboard().tabs
    .find((tab) => tab.id === targetTabId)?.groups
    .find((group) => group.id === targetGroupId) ?? null;

  const clearError = () => {
    errorMessage.textContent = "";
    titleInput.removeAttribute("aria-invalid");
    urlInput.removeAttribute("aria-invalid");
  };

  const showError = (message, control) => {
    errorMessage.textContent = message;
    control.setAttribute("aria-invalid", "true");
    control.focus();
  };

  const openAdd = (tabId, groupId) => {
    const group = getDashboard().tabs.find((tab) => tab.id === tabId)?.groups.find((entry) => entry.id === groupId);
    if (!group) return;
    mode = "add";
    targetTabId = tabId;
    targetGroupId = groupId;
    targetLinkId = null;
    titleElement.textContent = "Add a link";
    submitButton.textContent = "Add link";
    titleInput.value = "";
    urlInput.value = "";
    clearError();
    dialog.showModal();
    titleInput.focus();
  };

  const openEdit = (tabId, groupId, link) => {
    mode = "edit";
    targetTabId = tabId;
    targetGroupId = groupId;
    targetLinkId = link.id;
    titleElement.textContent = "Edit link";
    submitButton.textContent = "Save changes";
    titleInput.value = link.title;
    urlInput.value = link.url;
    clearError();
    dialog.showModal();
    titleInput.focus();
    titleInput.select();
  };

  const openDelete = (tabId, groupId, link) => {
    deleteTarget = { tabId, groupId, linkId: link.id };
    deleteName.textContent = link.title;
    deleteSummary.textContent = "This link will be removed from its group.";
    deleteDialog.showModal();
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();
    const linkTitle = titleInput.value.trim();
    const rawUrl = urlInput.value.trim();
    if (!linkTitle) {
      showError("Enter a link title.", titleInput);
      return;
    }
    if (linkTitle.length > 80) {
      showError("Link titles must be 80 characters or fewer.", titleInput);
      return;
    }
    if (!rawUrl) {
      showError("Enter a URL.", urlInput);
      return;
    }
    const url = normalizeWebUrl(rawUrl);
    if (!url) {
      showError("Enter a valid HTTP or HTTPS address.", urlInput);
      return;
    }

    const group = findTargetGroup();
    if (!group) {
      showError("This group is no longer available.", titleInput);
      return;
    }

    try {
      const linkData = { title: linkTitle, url };
      const succeeded = mode === "edit"
        ? await onEditLink(targetTabId, targetGroupId, targetLinkId, linkData)
        : await onAddLink(targetTabId, targetGroupId, linkData);
      if (succeeded !== false) {
        const focusId = `group-focus-${targetGroupId}`;
        dialog.close();
        document.getElementById(focusId)?.focus();
      }
    } catch (error) {
      console.error("Could not save the link:", error);
      showError("Could not save the link. Please try again.", titleInput);
    }
  });

  [titleInput, urlInput].forEach((control) => control.addEventListener("input", clearError));
  dialog.querySelectorAll("[data-close-link-dialog]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  deleteDialog.querySelectorAll("[data-close-delete-link]").forEach((button) => {
    button.addEventListener("click", () => deleteDialog.close());
  });
  deleteDialog.addEventListener("click", (event) => {
    if (event.target === deleteDialog) deleteDialog.close();
  });
  deleteDialog.addEventListener("close", () => {
    if (!deleteTarget) return;
    const { tabId, groupId } = deleteTarget;
    if (getDashboard().tabs.find((tab) => tab.id === tabId)?.groups.some((group) => group.id === groupId)) {
      document.getElementById(`group-focus-${groupId}`)?.focus();
    }
  });

  deleteConfirmButton.addEventListener("click", async () => {
    if (!deleteTarget) return;
    const { tabId, groupId, linkId } = deleteTarget;
    const group = getDashboard().tabs.find((tab) => tab.id === tabId)?.groups.find((entry) => entry.id === groupId);
    const link = group?.links.find((entry) => entry.id === linkId);
    if (!group || !link) {
      deleteDialog.close();
      onToast("This link is no longer available.");
      return;
    }
    try {
      const succeeded = await onDeleteLink(tabId, groupId, linkId);
      if (succeeded !== false) deleteDialog.close();
    } catch (error) {
      console.error("Could not delete the link:", error);
      onToast("Could not delete this link. Please try again.");
    }
  });

  return { openAdd, openEdit, openDelete };
}
