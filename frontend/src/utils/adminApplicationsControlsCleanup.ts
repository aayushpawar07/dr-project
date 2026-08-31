function cleanText(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function removeFilterControl() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1, h2")).find(
    (item) => cleanText(item.textContent) === "Application Management",
  );
  if (!heading) return;

  let container: HTMLElement | null = heading.parentElement;
  for (let i = 0; container && i < 5; i += 1) {
    const filterButton = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => cleanText(button.textContent) === "Filters",
    );
    if (filterButton) {
      filterButton.style.display = "none";
      filterButton.setAttribute("aria-hidden", "true");
      return;
    }
    container = container.parentElement;
  }
}

let scheduled = false;
function scheduleCleanup() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    removeFilterControl();
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleCleanup, { once: true });
  } else {
    scheduleCleanup();
  }

  const observer = new MutationObserver(scheduleCleanup);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
