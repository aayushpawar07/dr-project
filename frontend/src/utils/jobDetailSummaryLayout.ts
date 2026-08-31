import "../styles/job-detail-summary-layout.css";

function moveSummaryCardsToFullWidthRow() {
  const descriptionCard = document.querySelector<HTMLElement>(".medex-description-card");
  if (!descriptionCard) return;

  const summaryGrid = document.querySelector<HTMLElement>(".medex-description-summary-grid");
  if (!summaryGrid) return;

  const mainColumn = descriptionCard.parentElement;
  const detailGrid = mainColumn?.parentElement;
  const pageContainer = detailGrid?.parentElement;

  if (!mainColumn || !detailGrid || !pageContainer) return;

  // The page uses a 2/3 main column + 1/3 sidebar layout. The summary cards
  // should sit below that entire grid so they can use the full container width.
  if (
    summaryGrid.dataset.medexLayout === "full-width" &&
    summaryGrid.parentElement === pageContainer &&
    summaryGrid.previousElementSibling === detailGrid
  ) {
    return;
  }

  summaryGrid.dataset.medexDetached = "true";
  summaryGrid.dataset.medexLayout = "full-width";
  summaryGrid.classList.add("medex-description-summary-grid-detached");
  summaryGrid.setAttribute("aria-label", "Job summary highlights");

  if (detailGrid.nextSibling) {
    pageContainer.insertBefore(summaryGrid, detailGrid.nextSibling);
  } else {
    pageContainer.append(summaryGrid);
  }
}

let scheduled = false;
function scheduleSummaryLayout() {
  if (scheduled) return;
  scheduled = true;

  requestAnimationFrame(() => {
    scheduled = false;
    moveSummaryCardsToFullWidthRow();
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
