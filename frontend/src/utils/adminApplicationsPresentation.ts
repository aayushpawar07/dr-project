import "../styles/admin-applications-polish.css";

function cleanText(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function findApplicationCard(start: Element | null): HTMLElement | null {
  let node = start as HTMLElement | null;

  for (let depth = 0; node && depth < 12; depth += 1) {
    const text = cleanText(node.textContent);
    const hasProgress = text.includes("Progress");
    const hasActions = text.includes("Actions");
    const hasResume = text.includes("View Resume") || text.includes("No resume uploaded");

    if (hasProgress && hasActions && hasResume) return node;
    node = node.parentElement;
  }

  return null;
}

function closestFlex(element: Element | null, boundary: HTMLElement) {
  let node = element?.parentElement || null;

  while (node && node !== boundary) {
    if (node.classList.contains("flex")) return node;
    node = node.parentElement;
  }

  return null;
}

function commonAncestor(a: Element | null, b: Element | null, boundary: HTMLElement) {
  if (!a || !b) return null;
  const parents = new Set<Element>();
  let node: Element | null = a;

  while (node && node !== boundary) {
    parents.add(node);
    node = node.parentElement;
  }

  node = b;
  while (node && node !== boundary) {
    if (parents.has(node)) return node as HTMLElement;
    node = node.parentElement;
  }

  return null;
}

function directTextElement(root: HTMLElement, matcher: (text: string) => boolean) {
  return Array.from(root.querySelectorAll<HTMLElement>("div, p, span")).find((element) => {
    if (element.children.length > 0) return false;
    return matcher(cleanText(element.textContent));
  });
}

function enhanceCard(card: HTMLElement) {
  if (card.dataset.medexApplicantEnhanced === "true") return;

  card.dataset.medexApplicantEnhanced = "true";
  card.classList.add("medex-applicant-card");
  card.parentElement?.classList.add("medex-applicant-grid");

  const candidateName = Array.from(card.querySelectorAll<HTMLHeadingElement>("h2")).find(
    (heading) => !cleanText(heading.textContent).toLowerCase().startsWith("application details"),
  );

  if (candidateName) {
    candidateName.classList.add("medex-applicant-name");

    const identity = candidateName.parentElement;
    identity?.classList.add("medex-applicant-identity");

    const role = candidateName.nextElementSibling as HTMLElement | null;
    if (role) role.classList.add("medex-applicant-role");

    const profileGroup = identity?.parentElement;
    profileGroup?.classList.add("medex-applicant-profile-group");

    const avatar = profileGroup?.firstElementChild as HTMLElement | null;
    if (avatar && avatar !== identity) avatar.classList.add("medex-applicant-avatar");

    const header = profileGroup?.parentElement;
    header?.classList.add("medex-applicant-header");

    const status = header?.lastElementChild as HTMLElement | null;
    if (status && status !== profileGroup) status.classList.add("medex-applicant-status");

    const jobHeading = Array.from(card.querySelectorAll<HTMLHeadingElement>("h3")).find((heading) => {
      const text = cleanText(heading.textContent);
      return text && !text.toLowerCase().includes("candidate information");
    });

    if (jobHeading) {
      jobHeading.classList.add("medex-applicant-job-title");
      if (role && cleanText(jobHeading.textContent).toLowerCase() === cleanText(role.textContent).toLowerCase()) {
        jobHeading.classList.add("medex-applicant-job-title-duplicate");
      }
    }
  }

  card.querySelectorAll<SVGElement>("svg").forEach((icon) => {
    const className = icon.getAttribute("class") || "";
    if (!className.includes("lucide-briefcase") && !className.includes("lucide-calendar")) return;

    const row = closestFlex(icon, card);
    const rowText = cleanText(row?.textContent);
    if (!row || rowText.includes("Actions") || rowText.includes("View Resume")) return;

    row.classList.add("medex-applicant-meta-row");
    icon.classList.add("medex-applicant-meta-icon");
  });

  const progressLabel = directTextElement(card, (text) => text === "Progress");
  if (progressLabel) {
    const progressHeader = progressLabel.parentElement;
    const progressSection = progressHeader?.parentElement;
    progressSection?.classList.add("medex-applicant-progress");
    progressHeader?.classList.add("medex-applicant-progress-header");

    const stepsSection = progressSection?.nextElementSibling as HTMLElement | null;
    if (stepsSection) stepsSection.classList.add("medex-applicant-steps");
  }

  const notes = directTextElement(card, (text) => text.startsWith("Notes:"));
  if (notes) notes.classList.add("medex-applicant-notes");

  const buttons = Array.from(card.querySelectorAll<HTMLButtonElement>("button"));
  const actionsButton = buttons.find((button) => cleanText(button.textContent) === "Actions");
  const resumeButton = buttons.find((button) => cleanText(button.textContent) === "View Resume");

  actionsButton?.classList.add("medex-applicant-actions-button");
  resumeButton?.classList.add("medex-applicant-resume-button");

  const footer = commonAncestor(actionsButton, resumeButton, card);
  footer?.classList.add("medex-applicant-footer");

  const noResume = directTextElement(card, (text) => text.includes("No resume uploaded"));
  if (noResume) {
    noResume.classList.add("medex-applicant-no-resume");
    const noResumeFooter = commonAncestor(actionsButton, noResume, card);
    noResumeFooter?.classList.add("medex-applicant-footer");
  }
}

function enhanceApplicationTabs() {
  document.querySelectorAll<HTMLElement>('[role="tablist"]').forEach((tabList) => {
    const tabs = Array.from(tabList.querySelectorAll<HTMLElement>('[role="tab"]'));
    const labels = tabs.map((tab) => cleanText(tab.textContent).replace(/\s*\(\d+\)$/, "").toLowerCase());

    const expected = ["all", "active", "interviews", "completed"];
    if (!expected.every((label) => labels.some((value) => value === label))) return;

    tabList.classList.add("medex-applications-tabs");
    tabs.forEach((tab) => tab.classList.add("medex-applications-tab"));
  });
}

function enhanceApplicationCards() {
  const seeds: Element[] = [];

  document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    const text = cleanText(button.textContent);
    if (text === "View Resume" || text === "Actions") seeds.push(button);
  });

  document.querySelectorAll<HTMLElement>("div, p, span").forEach((element) => {
    if (element.children.length === 0 && cleanText(element.textContent).includes("No resume uploaded")) {
      seeds.push(element);
    }
  });

  const cards = new Set<HTMLElement>();
  seeds.forEach((seed) => {
    const card = findApplicationCard(seed);
    if (card) cards.add(card);
  });

  cards.forEach(enhanceCard);
  enhanceApplicationTabs();
}

let scheduled = false;
function scheduleEnhancement() {
  if (scheduled) return;
  scheduled = true;

  requestAnimationFrame(() => {
    scheduled = false;
    enhanceApplicationCards();
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
