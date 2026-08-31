import "../styles/job-detail-summary-layout.css";

function moveSummaryCardsOutsideDescription() {
  const descriptionCard = document.querySelector<HTMLElement>(".medex-description-card");
  if (!descriptionCard) return;

  const summaryGrid = descriptionCard.querySelector<HTMLElement>(".medex-description-summary-grid");
  if (!summaryGrid) return;

  const mainColumn = descriptionCard.parentElement;
  if (!mainColumn) return;

  if (summaryGrid.dataset.medexDetached === "true") return;

  summaryGrid.dataset.medexDetached = "true";
  summaryGrid.classList.add("medex-description-summary-grid-detached");
  summaryGrid.setAttribute("aria-label", "Job summary highlights");

  if (descriptionCard.nextSibling) {
    mainColumn.insertBefore(summaryGrid, descriptionCard.nextSibling);
  } else {
    mainColumn.append(summaryGrid);
  }
}

let scheduled = false;
function scheduleSummaryLayout() {
  if (scheduled) return;
  scheduled = true;

  requestAnimationFrame(() => {
    scheduled = false;
    moveSummaryCardsOutsideDescription();
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleSummaryLayout, { once: true });
  } else {
    scheduleSummaryLayout();
  }

  const observer = new MutationObserver(scheduleSummaryLayout);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
