import "../styles/admin-applications-polish.css";

function cleanText(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function isPrimaryApplicationCard(node: HTMLElement) {
  const classes = node.classList;
  const text = cleanText(node.textContent);

  return (
    classes.contains("group") &&
    classes.contains("relative") &&
    classes.contains("overflow-hidden") &&
    classes.contains("flex-col") &&
    text.includes("Progress") &&
    (text.includes("View Resume") || text.includes("No resume uploaded"))
  );
}

function findApplicationCard(start: Element | null): HTMLElement | null {
  let node = start as HTMLElement | null;
  let fallback: HTMLElement | null = null;

  for (let depth = 0; node && depth < 16; depth += 1) {
    const text = cleanText(node.textContent);
    const hasProgress = text.includes("Progress");
    const hasResume = text.includes("View Resume") || text.includes("No resume uploaded");

    if (!fallback && hasProgress && hasResume) fallback = node;
    if (isPrimaryApplicationCard(node)) return node;
    node = node.parentElement;
  }

  return fallback;
}

function findContentWrapper(element: HTMLElement, card: HTMLElement) {
  let node: HTMLElement | null = element;

  while (node?.parentElement && node.parentElement !== card) {
    node = node.parentElement;
  }

  return node?.parentElement === card ? node : null;
}

function findInfoRow(icon: SVGElement, card: HTMLElement) {
  let node = icon.parentElement;

  while (node && node !== card) {
    const text = cleanText(node.textContent);
    if (
      text &&
      node.classList.contains("flex") &&
      node.classList.contains("items-center") &&
      !text.includes("Actions") &&
      !text.includes("View Resume")
    ) {
      return node;
    }
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

function findLeaf(root: HTMLElement, matcher: (text: string) => boolean) {
  return Array.from(root.querySelectorAll<HTMLElement>("div, p, span")).find((element) => {
    if (element.children.length > 0) return false;
    return matcher(cleanText(element.textContent));
  });
}

function enhanceCard(card: HTMLElement) {
  if (card.dataset.medexApplicantEnhanced === "v2") return;

  card.dataset.medexApplicantEnhanced = "v2";
  card.classList.add("medex-applicant-card");
  card.parentElement?.classList.add("medex-applicant-grid");

  const candidateName = Array.from(card.querySelectorAll<HTMLHeadingElement>("h2")).find(
    (heading) => !cleanText(heading.textContent).toLowerCase().startsWith("application details"),
  );

  if (candidateName) {
    candidateName.classList.add("medex-applicant-name");

    const content = findContentWrapper(candidateName, card);
    content?.classList.add("medex-applicant-card-content");

    const identity = candidateName.parentElement;
    identity?.classList.add("medex-applicant-identity");

    const role = candidateName.nextElementSibling as HTMLElement | null;
    role?.classList.add("medex-applicant-role");

    const profileGroup = identity?.parentElement;
    profileGroup?.classList.add("medex-applicant-profile-group");

    const avatarWrapper = profileGroup?.firstElementChild as HTMLElement | null;
    avatarWrapper?.classList.add("medex-applicant-avatar-wrapper");

    const avatar = avatarWrapper
      ? Array.from(avatarWrapper.querySelectorAll<HTMLElement>("div")).find(
          (element) =>
            element.classList.contains("rounded-full") &&
            element.classList.contains("items-center") &&
            cleanText(element.textContent).length === 1,
        )
      : null;
    avatar?.classList.add("medex-applicant-avatar");

    if (avatarWrapper) {
      Array.from(avatarWrapper.children).forEach((child) => {
        if (child !== avatar) (child as HTMLElement).classList.add("medex-applicant-avatar-badge");
      });
    }

    const header = profileGroup?.parentElement;
    header?.classList.add("medex-applicant-header");

    const status = header?.lastElementChild as HTMLElement | null;
    if (status && status !== profileGroup) {
      status.classList.add("medex-applicant-status");
      const statusSpans = Array.from(status.querySelectorAll<HTMLElement>("span"));
      statusSpans[0]?.classList.add("medex-applicant-status-full");
      statusSpans[1]?.classList.add("medex-applicant-status-short");
    }

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
    if (!className.includes("lucide-briefcase") && !className.includes("lucide-calendar") && !className.includes("lucide-clock")) return;

    const row = findInfoRow(icon, card);
    if (!row) return;

    row.classList.add("medex-applicant-meta-row");
    const iconContainer = icon.parentElement;
    if (iconContainer && iconContainer !== row) iconContainer.classList.add("medex-applicant-meta-icon-wrap");
    icon.classList.add("medex-applicant-meta-icon");
  });

  const progressLabel = findLeaf(card, (text) => text === "Progress");
  if (progressLabel) {
    const progressHeader = progressLabel.parentElement;
    const progressSection = progressHeader?.parentElement;
    progressSection?.classList.add("medex-applicant-progress");
    progressHeader?.classList.add("medex-applicant-progress-header");

    const stepsSection = progressSection?.nextElementSibling as HTMLElement | null;
    stepsSection?.classList.add("medex-applicant-steps");
  }

  const notesParagraph = Array.from(card.querySelectorAll<HTMLParagraphElement>("p")).find((element) =>
    cleanText(element.textContent).startsWith("Notes:"),
  );
  if (notesParagraph) {
    notesParagraph.classList.add("medex-applicant-notes-copy");
    notesParagraph.parentElement?.classList.add("medex-applicant-notes");
    const spans = Array.from(notesParagraph.querySelectorAll<HTMLElement>("span"));
    spans[0]?.classList.add("medex-applicant-notes-label");
  }

  const buttons = Array.from(card.querySelectorAll<HTMLButtonElement>("button"));
  const actionsButton = buttons.find((button) => cleanText(button.textContent) === "Actions");
  const resumeButton = buttons.find((button) => cleanText(button.textContent) === "View Resume");

  actionsButton?.classList.add("medex-applicant-actions-button");
  resumeButton?.classList.add("medex-applicant-resume-button");

  const footer = commonAncestor(actionsButton, resumeButton, card);
  footer?.classList.add("medex-applicant-footer");

  const noResume = findLeaf(card, (text) => text.includes("No resume uploaded"));
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

    if (!expected.every((label) => labels.includes(label))) return;

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
    if (element.children.length === 0 && cleanText(element.textContent).includes("No resume uploaded")) seeds.push(element);
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
