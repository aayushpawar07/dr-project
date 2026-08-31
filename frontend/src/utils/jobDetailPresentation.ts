import "../styles/job-detail-presentation.css";

type DescriptionSectionKey =
  | "details"
  | "eligibility"
  | "responsibilities"
  | "application"
  | "selection"
  | "documents"
  | "notes"
  | "contact";

type DescriptionSection = {
  key: DescriptionSectionKey;
  label: string;
  lines: string[];
};

const SECTION_ORDER: Array<{ key: DescriptionSectionKey; label: string }> = [
  { key: "details", label: "Job Details" },
  { key: "eligibility", label: "Eligibility" },
  { key: "responsibilities", label: "Responsibilities" },
  { key: "application", label: "Application" },
  { key: "selection", label: "Selection" },
  { key: "documents", label: "Documents" },
  { key: "notes", label: "Important Notes" },
  { key: "contact", label: "Contact" },
];

const BULLET_PATTERN = /^[•●▪·*\-–—]\s*/;

function normalizeDescription(raw: string): string {
  let text = raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();

  // Older AI-pasted jobs may have been stored as a single line. Add safe
  // breaks before the common headings that already exist in the content.
  if (!text.includes("\n")) {
    text = text
      .replace(/\s+(STEP\s*[1-4]\s*:[^:]{2,80})/gi, "\n\n$1\n")
      .replace(/\s+(Application Process\s*:)/gi, "\n\n$1\n")
      .replace(/\s+(Selection Process\s*:)/gi, "\n\n$1\n")
      .replace(/\s+(Important Documents Required\s*:|Documents Required\s*:)/gi, "\n\n$1\n")
      .replace(/\s+(Important Notes\s*:)/gi, "\n\n$1\n")
      .replace(/\s+(Contact Information\s*:|Contact\s*:)/gi, "\n\n$1\n")
      .replace(/\s+[•●▪·]\s*/g, "\n· ");
  }

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => line !== "---" || index === 0 || lines[index - 1] !== "---")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectSection(line: string): DescriptionSectionKey | null {
  const value = line
    .replace(BULLET_PATTERN, "")
    .replace(/[:：]+$/, "")
    .trim()
    .toLowerCase();

  if (/^step\s*1\b/.test(value) || value.includes("basic job information") || value === "job details" || value === "job overview" || value === "about the role") {
    return "details";
  }
  if (/^step\s*2\b/.test(value) || value.includes("requirements & details") || value === "eligibility" || value === "eligibility criteria") {
    return "eligibility";
  }
  if (value === "key responsibilities" || value === "responsibilities") {
    return "responsibilities";
  }
  if (/^step\s*3\b/.test(value) || /^step\s*4\b/.test(value) || value.includes("extra details") || value === "application process" || value === "walk-in interview" || value === "interview schedule" || value === "important dates") {
    return "application";
  }
  if (value === "selection process") {
    return "selection";
  }
  if (value === "documents required" || value === "important documents required") {
    return "documents";
  }
  if (value === "important notes" || value === "benefits" || value === "benefits & perks") {
    return "notes";
  }
  if (value === "contact" || value === "contact information") {
    return "contact";
  }

  return null;
}

function isMainSectionHeading(line: string): boolean {
  const value = line.replace(BULLET_PATTERN, "").trim();
  if (/^step\s*[1-4]\b/i.test(value)) return true;

  const normalized = value.replace(/[:：]+$/, "").trim().toLowerCase();
  return [
    "job details",
    "job overview",
    "about the role",
    "eligibility",
    "eligibility criteria",
    "key responsibilities",
    "responsibilities",
    "application process",
    "walk-in interview",
    "selection process",
    "documents required",
    "important documents required",
    "important notes",
    "contact",
    "contact information",
  ].includes(normalized);
}

function parseSections(raw: string): DescriptionSection[] {
  const buckets = new Map<DescriptionSectionKey, string[]>();
  SECTION_ORDER.forEach(({ key }) => buckets.set(key, []));

  let current: DescriptionSectionKey = "details";
  const lines = normalizeDescription(raw).split("\n");

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || /^-{3,}$/.test(trimmed)) return;

    const detected = detectSection(trimmed);
    if (detected) {
      current = detected;
      if (isMainSectionHeading(trimmed)) return;
    }

    buckets.get(current)?.push(trimmed);
  });

  return SECTION_ORDER
    .map(({ key, label }) => ({ key, label, lines: buckets.get(key) || [] }))
    .filter((section) => section.lines.length > 0);
}

function appendLinkifiedText(parent: HTMLElement, text: string) {
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  let lastIndex = 0;

  for (const match of text.matchAll(urlPattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parent.append(document.createTextNode(text.slice(lastIndex, index)));
    }

    const value = match[0].replace(/[),.;]+$/, "");
    const anchor = document.createElement("a");
    anchor.href = value.startsWith("www.") ? `https://${value}` : value;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.className = "medex-description-link";
    anchor.textContent = value;
    parent.append(anchor);

    const trailing = match[0].slice(value.length);
    if (trailing) parent.append(document.createTextNode(trailing));
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parent.append(document.createTextNode(text.slice(lastIndex)));
  }
}

function stripBullet(line: string): string {
  return line.replace(BULLET_PATTERN, "").trim();
}

function looksLikeSubheading(line: string): boolean {
  const clean = stripBullet(line);
  return clean.endsWith(":") && clean.length <= 70 && clean.indexOf(":") === clean.length - 1;
}

function createKeyValueRow(labelText: string, valueText: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "medex-kv-row";

  const label = document.createElement("span");
  label.className = "medex-kv-label";
  label.textContent = labelText.replace(/[:：]+$/, "").trim();

  const value = document.createElement("span");
  value.className = "medex-kv-value";
  appendLinkifiedText(value, valueText.trim());

  row.append(label, value);
  return row;
}

function createContentBlock(section: DescriptionSection): HTMLElement {
  const block = document.createElement("div");
  block.className = `medex-section-body medex-section-${section.key}`;

  let list: HTMLUListElement | null = null;
  let kvGrid: HTMLDivElement | null = null;

  const flushList = () => {
    if (list) {
      block.append(list);
      list = null;
    }
  };

  const flushGrid = () => {
    if (kvGrid) {
      block.append(kvGrid);
      kvGrid = null;
    }
  };

  section.lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || /^-{3,}$/.test(line)) return;

    if (looksLikeSubheading(line)) {
      flushList();
      flushGrid();
      const heading = document.createElement("h4");
      heading.className = "medex-description-subheading";
      heading.textContent = stripBullet(line).replace(/[:：]+$/, "");
      block.append(heading);
      return;
    }

    const clean = stripBullet(line);
    const colonIndex = clean.indexOf(":");
    if (colonIndex > 0 && colonIndex <= 42 && clean.slice(colonIndex + 1).trim()) {
      flushList();
      if (!kvGrid) {
        kvGrid = document.createElement("div");
        kvGrid.className = "medex-kv-grid";
      }
      kvGrid.append(createKeyValueRow(clean.slice(0, colonIndex), clean.slice(colonIndex + 1)));
      return;
    }

    const compactNumberRow = clean.match(/^(.{2,45}?)\s+(\d{1,4})$/);
    if (compactNumberRow && !/[.!?]$/.test(clean)) {
      flushList();
      if (!kvGrid) {
        kvGrid = document.createElement("div");
        kvGrid.className = "medex-kv-grid";
      }
      kvGrid.append(createKeyValueRow(compactNumberRow[1], compactNumberRow[2]));
      return;
    }

    flushGrid();

    if (BULLET_PATTERN.test(line)) {
      if (!list) {
        list = document.createElement("ul");
        list.className = "medex-description-list";
      }
      const item = document.createElement("li");
      appendLinkifiedText(item, clean);
      list.append(item);
      return;
    }

    flushList();
    const paragraph = document.createElement("p");
    paragraph.className = "medex-description-line";
    appendLinkifiedText(paragraph, clean);
    block.append(paragraph);
  });

  flushList();
  flushGrid();
  return block;
}

function createTabButton(section: DescriptionSection, index: number): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "medex-description-tab";
  button.dataset.tab = section.key;
  button.setAttribute("role", "tab");
  button.setAttribute("aria-selected", index === 0 ? "true" : "false");
  button.textContent = section.label;
  return button;
}

function createSectionPanel(section: DescriptionSection, index: number): HTMLElement {
  const panel = document.createElement("section");
  panel.className = "medex-description-panel";
  panel.dataset.panel = section.key;
  panel.dataset.section = section.key;
  panel.setAttribute("role", "tabpanel");
  panel.hidden = index !== 0;

  const header = document.createElement("div");
  header.className = "medex-description-panel-header";

  const title = document.createElement("h3");
  title.textContent = section.label;

  const hint = document.createElement("span");
  hint.textContent = `${section.lines.length} item${section.lines.length === 1 ? "" : "s"}`;

  header.append(title, hint);
  panel.append(header, createContentBlock(section));
  return panel;
}

function createPreviewCard(
  title: string,
  section: DescriptionSection | undefined,
  tone: "overview" | "documents" | "notes",
): HTMLElement | null {
  if (!section || section.lines.length === 0) return null;

  const card = document.createElement("div");
  card.className = `medex-summary-card medex-summary-${tone}`;

  const heading = document.createElement("h4");
  heading.textContent = title;
  card.append(heading);

  const list = document.createElement("ul");
  section.lines
    .filter((line) => !looksLikeSubheading(line) && !/^-{3,}$/.test(line))
    .slice(0, 5)
    .forEach((line) => {
      const item = document.createElement("li");
      const clean = stripBullet(line);
      const colonIndex = clean.indexOf(":");
      if (colonIndex > 0 && colonIndex <= 38) {
        const strong = document.createElement("strong");
        strong.textContent = `${clean.slice(0, colonIndex)}: `;
        item.append(strong);
        appendLinkifiedText(item, clean.slice(colonIndex + 1).trim());
      } else {
        appendLinkifiedText(item, clean);
      }
      list.append(item);
    });

  card.append(list);
  return card;
}

function enhanceDescription(root: ParentNode) {
  const headings = Array.from(root.querySelectorAll("h2"));
  const descriptionHeading = headings.find(
    (heading) => heading.textContent?.trim().toLowerCase() === "job description",
  );

  const card = descriptionHeading?.parentElement;
  if (!card || card.dataset.medexDescriptionEnhanced === "true") return;

  const original = card.querySelector("p.text-gray-700") as HTMLParagraphElement | null;
  if (!original) return;

  const raw = original.textContent || "";
  if (!raw.trim()) return;

  const sections = parseSections(raw);
  if (!sections.length) return;

  card.dataset.medexDescriptionEnhanced = "true";
  card.classList.add("medex-description-card");
  descriptionHeading?.classList.add("medex-description-title");

  const intro = document.createElement("p");
  intro.className = "medex-description-intro";
  intro.textContent = "Browse the important details by section instead of reading one long description.";

  const shell = document.createElement("div");
  shell.className = "medex-description-shell";

  const tabs = document.createElement("div");
  tabs.className = "medex-description-tabs";
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Job description sections");

  const panels = document.createElement("div");
  panels.className = "medex-description-panels";

  sections.forEach((section, index) => {
    tabs.append(createTabButton(section, index));
    panels.append(createSectionPanel(section, index));
  });

  tabs.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>(".medex-description-tab");
    if (!target) return;

    const key = target.dataset.tab;
    tabs.querySelectorAll<HTMLButtonElement>(".medex-description-tab").forEach((button) => {
      const active = button === target;
      button.setAttribute("aria-selected", active ? "true" : "false");
    });

    panels.querySelectorAll<HTMLElement>(".medex-description-panel").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== key;
    });
  });

  shell.append(tabs, panels);

  const details = sections.find((section) => section.key === "details");
  const documents = sections.find((section) => section.key === "documents");
  const notes = sections.find((section) => section.key === "notes");
  const summaryGrid = document.createElement("div");
  summaryGrid.className = "medex-description-summary-grid";

  [
    createPreviewCard("Job Overview", details, "overview"),
    createPreviewCard("Documents Required", documents, "documents"),
    createPreviewCard("Important Notes", notes, "notes"),
  ].forEach((summaryCard) => {
    if (summaryCard) summaryGrid.append(summaryCard);
  });

  if (summaryGrid.childElementCount > 0) shell.append(summaryGrid);

  descriptionHeading?.after(intro);
  original.replaceWith(shell);
}

function findLinkByText(root: ParentNode, labels: string[]): HTMLAnchorElement | null {
  return (
    (Array.from(root.querySelectorAll("a")).find((anchor) => {
      const text = anchor.textContent?.trim().toLowerCase() || "";
      return labels.some((label) => text.includes(label));
    }) as HTMLAnchorElement | undefined) || null
  );
}

function relabelExistingGovernmentLinks(root: ParentNode) {
  const websiteLinks = Array.from(root.querySelectorAll("a")).filter((anchor) =>
    anchor.textContent?.toLowerCase().includes("official apply link"),
  );
  websiteLinks.forEach((anchor) => {
    if (anchor.dataset.medexRelabeled === "true") return;
    const svgs = Array.from(anchor.querySelectorAll("svg"));
    anchor.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) node.textContent = "";
    });
    const label = document.createElement("span");
    label.textContent = "Official Website";
    if (svgs.length > 0) svgs[0].after(label);
    else anchor.prepend(label);
    anchor.dataset.medexRelabeled = "true";
  });

  const pdfLinks = Array.from(root.querySelectorAll("a")).filter((anchor) => {
    const text = anchor.textContent?.toLowerCase() || "";
    return text.includes("view notification") || text.includes("official notification pdf");
  });
  pdfLinks.forEach((anchor) => {
    if (anchor.dataset.medexRelabeled === "true") return;
    const svgs = Array.from(anchor.querySelectorAll("svg"));
    anchor.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) node.textContent = "";
    });
    const label = document.createElement("span");
    label.textContent = "Notification PDF";
    if (svgs.length > 0) svgs[0].after(label);
    else anchor.prepend(label);
    anchor.dataset.medexRelabeled = "true";
  });
}

function enhanceGovernmentLinks(root: ParentNode) {
  const governmentBadge = Array.from(root.querySelectorAll("span, div")).some(
    (element) => element.textContent?.trim().toLowerCase() === "government",
  );
  if (!governmentBadge) return;

  relabelExistingGovernmentLinks(root);

  const page = root.querySelector(".min-h-screen.bg-gray-50");
  if (!page || page.querySelector(".medex-government-links")) return;

  const websiteSource = findLinkByText(root, ["official website", "official apply link"]);
  const pdfSource = findLinkByText(root, ["notification pdf", "view notification", "official notification pdf"]);

  if (!websiteSource && !pdfSource) return;

  const mainColumn = page.querySelector(".md\\:col-span-2.space-y-6");
  if (!mainColumn) return;

  const cards = Array.from(mainColumn.children);
  const jobDetailsCard = cards.find((element) =>
    Array.from(element.querySelectorAll("h2")).some(
      (heading) => heading.textContent?.trim().toLowerCase() === "job details",
    ),
  );

  const section = document.createElement("section");
  section.className = "medex-government-links";

  const header = document.createElement("div");
  header.className = "medex-government-links-header";

  const headerCopy = document.createElement("div");
  const eyebrow = document.createElement("div");
  eyebrow.className = "medex-government-links-eyebrow";
  eyebrow.textContent = "Government Job";
  const heading = document.createElement("h2");
  heading.textContent = "Official Links";
  const helper = document.createElement("p");
  helper.textContent = "Verify the notification and application details from the official source.";
  headerCopy.append(eyebrow, heading, helper);
  header.append(headerCopy);
  section.append(header);

  const grid = document.createElement("div");
  grid.className = "medex-government-links-grid";

  const appendOfficialLink = (
    source: HTMLAnchorElement,
    className: string,
    icon: string,
    title: string,
    description: string,
  ) => {
    const link = document.createElement("a");
    link.className = `medex-official-link ${className}`;
    link.href = source.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const iconElement = document.createElement("span");
    iconElement.className = "medex-official-link-icon";
    iconElement.textContent = icon;

    const copy = document.createElement("span");
    copy.className = "medex-official-link-copy";
    const strong = document.createElement("strong");
    strong.textContent = title;
    const small = document.createElement("small");
    small.textContent = description;
    copy.append(strong, small);

    const arrow = document.createElement("span");
    arrow.className = "medex-official-link-arrow";
    arrow.textContent = "↗";

    link.append(iconElement, copy, arrow);
    grid.append(link);
  };

  if (websiteSource) {
    appendOfficialLink(
      websiteSource,
      "medex-official-website",
      "🌐",
      "Official Website",
      "Open the official recruitment/application page",
    );
  }

  if (pdfSource) {
    appendOfficialLink(
      pdfSource,
      "medex-official-pdf",
      "📄",
      "Notification PDF",
      "Read the complete official notification",
    );
  }

  section.append(grid);

  if (jobDetailsCard?.nextSibling) {
    mainColumn.insertBefore(section, jobDetailsCard.nextSibling);
  } else {
    mainColumn.append(section);
  }

  // The compact official-link panel replaces the oversized duplicate PDF card.
  Array.from(mainColumn.children).forEach((element) => {
    const officialHeading = Array.from(element.querySelectorAll("h2")).find(
      (item) => item.textContent?.trim().toLowerCase() === "official documents",
    );
    if (officialHeading) element.classList.add("medex-official-docs-original");
  });
}

function enhanceJobDetailPage() {
  enhanceDescription(document);
  enhanceGovernmentLinks(document);
}

let scheduled = false;
function scheduleEnhancement() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    enhanceJobDetailPage();
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
