import "../styles/job-detail-overview-polish.css";

function cleanText(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function findHeading(text: string) {
  return Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3")).find(
    (heading) => cleanText(heading.textContent) === text,
  );
}

function findStructuredOrganization() {
  const rows = Array.from(document.querySelectorAll<HTMLElement>(".medex-kv-row"));

  for (const row of rows) {
    const label = cleanText(row.querySelector<HTMLElement>(".medex-kv-label")?.textContent).toLowerCase();
    if (!label) continue;

    if (
      label.includes("organization/hospital name") ||
      label === "organization" ||
      label === "hospital name" ||
      label.includes("organisation/hospital name")
    ) {
      const value = cleanText(row.querySelector<HTMLElement>(".medex-kv-value")?.textContent);
      if (value) return value;
    }
  }

  const summaryItems = Array.from(document.querySelectorAll<HTMLElement>(".medex-summary-item"));
  for (const item of summaryItems) {
    const strong = cleanText(item.querySelector("strong")?.textContent).toLowerCase();
    if (!strong.includes("organization") && !strong.includes("hospital name")) continue;

    const full = cleanText(item.textContent);
    const separator = full.indexOf(":");
    if (separator > -1) {
      const value = full.slice(separator + 1).trim();
      if (value) return value;
    }
  }

  return "";
}

function createBuildingIcon() {
  const wrapper = document.createElement("span");
  wrapper.className = "medex-job-organization-icon";
  wrapper.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 21V5l8-3 8 3v16M8 8h1M8 12h1M8 16h1M15 8h1M15 12h1M15 16h1M9 21v-3h6v3"></path>
    </svg>
  `;
  return wrapper;
}

function ensureOrganization(heroCard: HTMLElement, organization: string) {
  const h1 = heroCard.querySelector<HTMLHeadingElement>("h1");
  if (!h1 || !organization) return;

  h1.classList.add("medex-job-hero-title");

  const titleContainer = h1.parentElement;
  if (!titleContainer) return;
  titleContainer.classList.add("medex-job-hero-copy");

  const existingOrganization = Array.from(titleContainer.children).find((child) => {
    if (!(child instanceof HTMLElement) || child === h1) return false;
    const text = cleanText(child.textContent);
    return text === organization;
  }) as HTMLElement | undefined;

  if (existingOrganization) {
    existingOrganization.classList.add("medex-job-organization-line");
    return;
  }

  if (titleContainer.querySelector(".medex-job-organization-line")) return;

  const line = document.createElement("div");
  line.className = "medex-job-organization-line medex-job-organization-injected";
  line.dataset.organization = organization;
  line.append(createBuildingIcon());

  const text = document.createElement("span");
  text.textContent = organization;
  line.append(text);

  h1.insertAdjacentElement("afterend", line);
}

function updateAboutOrganization(organization: string) {
  if (!organization) return;

  const heading = Array.from(document.querySelectorAll<HTMLElement>("h2, h3")).find(
    (item) => cleanText(item.textContent) === "About Organization",
  );
  if (!heading) return;

  const card = heading.parentElement;
  if (!card) return;
  card.classList.add("medex-about-organization-card");

  const buildingIcon = card.querySelector<SVGElement>('svg[class*="lucide-building"]');
  const row = buildingIcon?.parentElement;
  const value = row?.querySelector<HTMLElement>("span");

  if (value && !cleanText(value.textContent)) {
    value.textContent = organization;
  }

  if (value) value.classList.add("medex-about-organization-name");
}

function enhanceJobFacts(jobDetailsCard: HTMLElement) {
  jobDetailsCard.classList.add("medex-job-facts-card");

  const heading = Array.from(jobDetailsCard.querySelectorAll<HTMLHeadingElement>("h2, h3")).find(
    (item) => cleanText(item.textContent) === "Job Details",
  );
  heading?.classList.add("medex-job-facts-title");

  const grid = heading?.nextElementSibling as HTMLElement | null;
  if (!grid) return;
  grid.classList.add("medex-job-facts-grid");

  Array.from(grid.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    child.classList.add("medex-job-fact");

    const icon = child.querySelector<SVGElement>("svg");
    icon?.classList.add("medex-job-fact-icon");

    const copy = icon?.nextElementSibling as HTMLElement | null;
    copy?.classList.add("medex-job-fact-copy");

    const paragraphs = Array.from(child.querySelectorAll<HTMLParagraphElement>("p"));
    if (paragraphs[0]) paragraphs[0].classList.add("medex-job-fact-label");
    if (paragraphs[1]) paragraphs[1].classList.add("medex-job-fact-value");

    const label = cleanText(paragraphs[0]?.textContent).toLowerCase().replace(/\s+/g, "-");
    if (label) child.dataset.fact = label;
  });
}

function enhanceHero(heroCard: HTMLElement) {
  heroCard.classList.add("medex-job-hero-card");

  const h1 = heroCard.querySelector<HTMLHeadingElement>("h1");
  h1?.classList.add("medex-job-hero-title");

  const metaCandidates = Array.from(heroCard.querySelectorAll<HTMLElement>("div")).filter((element) => {
    const text = cleanText(element.textContent).toLowerCase();
    return text.includes("views") && text.includes("applications") && text.includes("posted");
  });

  const meta = metaCandidates.sort((a, b) => a.children.length - b.children.length)[0];
  meta?.classList.add("medex-job-hero-meta");

  heroCard.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    const text = cleanText(button.textContent);
    if (text === "Edit Job" || text === "Share") {
      button.classList.add("medex-job-hero-action");
    }
  });
}

function enhanceJobOverview() {
  const jobDetailsHeading = findHeading("Job Details");
  const jobDetailsCard = jobDetailsHeading?.parentElement;
  if (!jobDetailsCard) return;

  enhanceJobFacts(jobDetailsCard);

  const heroCard = jobDetailsCard.previousElementSibling as HTMLElement | null;
  if (heroCard?.querySelector("h1")) {
    enhanceHero(heroCard);

    const organization = findStructuredOrganization();
    if (organization) {
      ensureOrganization(heroCard, organization);
      updateAboutOrganization(organization);
    }
  }
}

let scheduled = false;
function scheduleEnhancement() {
  if (scheduled) return;
  scheduled = true;

  requestAnimationFrame(() => {
    scheduled = false;
    enhanceJobOverview();
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleEnhancement, { once: true });
  } else {
    scheduleEnhancement();
  }

  const observer = new MutationObserver(scheduleEnhancement);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
