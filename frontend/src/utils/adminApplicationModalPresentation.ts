import "../styles/admin-application-modals-polish.css";

function cleanText(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function markSectionCards(dialog: HTMLElement) {
  const sectionNames = [
    "Candidate Information",
    "Job Information",
    "Resume",
    "Application Notes",
  ];

  dialog.querySelectorAll<HTMLElement>("h3").forEach((heading) => {
    const text = cleanText(heading.textContent);
    if (!sectionNames.includes(text)) return;

    const section = heading.parentElement;
    if (!section) return;

    section.classList.add("medex-application-modal-section");
    section.dataset.section = text.toLowerCase().replace(/\s+/g, "-");
    heading.classList.add("medex-application-modal-section-title");
  });
}

function enhanceApplicationDetailsDialog(dialog: HTMLElement) {
  if (dialog.dataset.medexApplicationModal === "details") return;

  dialog.dataset.medexApplicationModal = "details";
  dialog.classList.add("medex-application-details-dialog");

  const header = dialog.querySelector<HTMLElement>('[data-slot="dialog-header"]');
  header?.classList.add("medex-application-modal-header");

  const title = dialog.querySelector<HTMLElement>('[data-slot="dialog-title"]');
  title?.classList.add("medex-application-modal-title");

  if (title) {
    const text = cleanText(title.textContent);
    const separator = text.indexOf(" - ");
    if (separator > -1) {
      const label = text.slice(0, separator);
      const candidate = text.slice(separator + 3);
      title.textContent = "";

      const eyebrow = document.createElement("span");
      eyebrow.className = "medex-application-modal-eyebrow";
      eyebrow.textContent = label;

      const candidateName = document.createElement("span");
      candidateName.className = "medex-application-modal-candidate";
      candidateName.textContent = candidate;

      title.append(eyebrow, candidateName);
    }
  }

  const body = Array.from(dialog.children).find(
    (child) => child instanceof HTMLElement && child !== header && child.getAttribute("data-slot") !== "dialog-close",
  ) as HTMLElement | undefined;
  body?.classList.add("medex-application-modal-body");

  markSectionCards(dialog);

  const closeButton = dialog.querySelector<HTMLElement>('[data-slot="dialog-close"]');
  closeButton?.classList.add("medex-application-modal-close");
}

function enhanceStatusDialog(dialog: HTMLElement) {
  if (dialog.dataset.medexApplicationModal === "status") return;

  dialog.dataset.medexApplicationModal = "status";
  dialog.classList.add("medex-application-status-dialog");

  const header = dialog.querySelector<HTMLElement>('[data-slot="dialog-header"]');
  header?.classList.add("medex-application-modal-header");

  const title = dialog.querySelector<HTMLElement>('[data-slot="dialog-title"]');
  title?.classList.add("medex-application-modal-title", "medex-status-modal-title");

  if (title && !dialog.querySelector(".medex-status-modal-subtitle")) {
    const subtitle = document.createElement("p");
    subtitle.className = "medex-status-modal-subtitle";
    subtitle.textContent = "Update the candidate's current application stage and add an optional note.";
    title.after(subtitle);
  }

  const closeButton = dialog.querySelector<HTMLElement>('[data-slot="dialog-close"]');
  closeButton?.classList.add("medex-application-modal-close");

  dialog.querySelectorAll<HTMLElement>("label").forEach((label) => {
    label.classList.add("medex-status-field-label");
  });

  dialog.querySelectorAll<HTMLElement>("select, textarea").forEach((field) => {
    field.classList.add("medex-status-field");
  });

  const updateButton = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => cleanText(button.textContent) === "Update Status",
  );
  const cancelButton = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => cleanText(button.textContent) === "Cancel",
  );

  updateButton?.classList.add("medex-status-primary-action");
  cancelButton?.classList.add("medex-status-secondary-action");

  const actionRow = updateButton?.parentElement;
  if (actionRow && cancelButton && actionRow.contains(cancelButton)) {
    actionRow.classList.add("medex-status-action-row");
  }
}

function enhanceOverlay(dialog: HTMLElement) {
  const overlay = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"][data-state="open"]');
  if (!overlay) return;

  if (dialog.classList.contains("medex-application-details-dialog")) {
    overlay.classList.add("medex-application-modal-overlay");
  }

  if (dialog.classList.contains("medex-application-status-dialog")) {
    overlay.classList.add("medex-application-modal-overlay", "medex-application-status-overlay");
  }
}

function enhanceOpenApplicationDialogs() {
  document.querySelectorAll<HTMLElement>('[data-slot="dialog-content"][data-state="open"]').forEach((dialog) => {
    const title = cleanText(dialog.querySelector('[data-slot="dialog-title"]')?.textContent);

    if (title.startsWith("Application Details")) {
      enhanceApplicationDetailsDialog(dialog);
      enhanceOverlay(dialog);
    } else if (title === "Update Application Status") {
      enhanceStatusDialog(dialog);
      enhanceOverlay(dialog);
    }
  });
}

let scheduled = false;
function scheduleEnhancement() {
  if (scheduled) return;
  scheduled = true;

  requestAnimationFrame(() => {
    scheduled = false;
    enhanceOpenApplicationDialogs();
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleEnhancement, { once: true });
  } else {
    scheduleEnhancement();
  }

  const observer = new MutationObserver(scheduleEnhancement);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-state"],
  });
}
