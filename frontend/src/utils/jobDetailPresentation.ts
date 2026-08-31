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

type IconName =
  | "briefcase"
  | "checkCircle"
  | "clipboard"
  | "calendar"
  | "award"
  | "fileText"
  | "alertTriangle"
  | "phone"
  | "building"
  | "mapPin"
  | "shield"
  | "tag"
  | "graduation"
  | "clock"
  | "users"
  | "wallet"
  | "globe"
  | "mail"
  | "link"
  | "user"
  | "info"
  | "sparkles";

const SECTION_ORDER: Array<{
  key: DescriptionSectionKey;
  label: string;
  icon: IconName;
  helper: string;
}> = [
  { key: "details", label: "Job Details", icon: "briefcase", helper: "Role overview and key facts" },
  { key: "eligibility", label: "Eligibility", icon: "checkCircle", helper: "Qualification and requirement checklist" },
  { key: "responsibilities", label: "Responsibilities", icon: "clipboard", helper: "What the selected candidate will do" },
  { key: "application", label: "Application", icon: "calendar", helper: "How, when and where to apply" },
  { key: "selection", label: "Selection", icon: "award", helper: "Selection stages and process" },
  { key: "documents", label: "Documents", icon: "fileText", helper: "Documents candidates should keep ready" },
  { key: "notes", label: "Important Notes", icon: "alertTriangle", helper: "Conditions, benefits and important notices" },
  { key: "contact", label: "Contact", icon: "phone", helper: "Official contact and support information" },
];

const ICONS: Record<IconName, string> = {
  briefcase: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"></path></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.5 2.5L16 9"></path></svg>',
  clipboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"></rect><path d="M9 4.5V3h6v1.5M8 9h8M8 13h8M8 17h5"></path></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M7 3v4M17 3v4M3 10h18M8 14h3M13 14h3M8 17h3"></path></svg>',
  award: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="6"></circle><path d="m8.5 14-1 7 4.5-2 4.5 2-1-7M9.5 9.5l1.5 1.5 3.5-3.5"></path></svg>',
  fileText: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l4 4v16H6z"></path><path d="M14 2v5h5M9 12h6M9 16h6M9 8h2"></path></svg>',
  alertTriangle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.5 20h19z"></path><path d="M12 9v5M12 17h.01"></path></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-4-1-2 2c-4-1.7-7.3-5-9-9l2-2z"></path></svg>',
  building: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V5l8-3 8 3v16M8 8h1M8 12h1M8 16h1M15 8h1M15 12h1M15 16h1M9 21v-3h6v3"></path></svg>',
  mapPin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"></path><path d="m9 12 2 2 4-4"></path></svg>',
  tag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12V4h8l10 10-7 7z"></path><circle cx="8" cy="8" r="1"></circle></svg>',
  graduation: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 10-5 10 5-10 5z"></path><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"></path></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1"></path></svg>',
  wallet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h14a2 2 0 0 1 2 2v12H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"></path><path d="M16 10h6v5h-6a2.5 2.5 0 0 1 0-5Z"></path></svg>',
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"></path></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"></path><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"></path></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v6M12 7h.01"></path></svg>',
  sparkles: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3zM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8zM5 13l.7 1.8L7.5 15l-1.8.7L5 17.5l-.7-1.8L2.5 15l1.8-.7z"></path></svg>',
};

const BULLET_PATTERN = /^[•●▪·*\-–—]\s*/;

function iconElement(name: IconName, className = "medex-icon"): HTMLSpanElement {
  const icon = document.createElement("span");
  icon.className = className;
  icon.innerHTML = ICONS[name];
  return icon;
}

function sectionConfig(key: DescriptionSectionKey) {
  return SECTION_ORDER.find((item) => item.key === key) || SECTION_ORDER[0];
}

function normalizeDescription(raw: string): string {
  let text = raw.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").trim();

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
  const value = line.replace(BULLET_PATTERN, "").replace(/[:：]+$/, "").trim().toLowerCase();

  if (/^step\s*1\b/.test(value) || value.includes("basic job information") || value === "job details" || value === "job overview" || value === "about the role") return "details";
  if (/^step\s*2\b/.test(value) || value.includes("requirements & details") || value === "eligibility" || value === "eligibility criteria" || value === "additional requirements") return "eligibility";
  if (value === "key responsibilities" || value === "responsibilities") return "responsibilities";
  if (/^step\s*3\b/.test(value) || /^step\s*4\b/.test(value) || value.includes("extra details") || value === "application process" || value === "walk-in interview" || value === "interview schedule" || value === "important dates") return "application";
  if (value === "selection process") return "selection";
  if (value === "documents required" || value === "important documents required") return "documents";
  if (value === "important notes" || value === "benefits" || value === "benefits & perks") return "notes";
  if (value === "contact" || value === "contact information") return "contact";
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

  normalizeDescription(raw)
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || /^-{3,}$/.test(trimmed)) return;
      const detected = detectSection(trimmed);
      if (detected) {
        current = detected;
        if (isMainSectionHeading(trimmed)) return;
      }
      buckets.get(current)?.push(trimmed);
    });

  return SECTION_ORDER.map(({ key, label }) => ({ key, label, lines: buckets.get(key) || [] })).filter(
    (section) => section.lines.length > 0,
  );
}

function appendLinkifiedText(parent: HTMLElement, text: string) {
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  let lastIndex = 0;

  for (const match of text.matchAll(urlPattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) parent.append(document.createTextNode(text.slice(lastIndex, index)));
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

  if (lastIndex < text.length) parent.append(document.createTextNode(text.slice(lastIndex)));
}

function stripBullet(line: string): string {
  return line.replace(BULLET_PATTERN, "").trim();
}

function looksLikeSubheading(line: string): boolean {
  const clean = stripBullet(line);
  return clean.endsWith(":") && clean.length <= 70 && clean.indexOf(":") === clean.length - 1;
}

function iconForLabel(label: string): IconName {
  const value = label.toLowerCase();
  if (/hospital|organization|organisation|institute|department/.test(value)) return "building";
  if (/location|venue|city|state|address/.test(value)) return "mapPin";
  if (/sector|government/.test(value)) return "shield";
  if (/category|speciality|specialty|job type|duty type/.test(value)) return "tag";
  if (/qualification|degree|education|registration/.test(value)) return "graduation";
  if (/experience|working days|shift|time|reporting/.test(value)) return "clock";
  if (/post|vacanc|candidate/.test(value)) return "users";
  if (/salary|pay|fee|amount|hra|allowance|remuneration|stipend/.test(value)) return "wallet";
  if (/date|interview|deadline|last date/.test(value)) return "calendar";
  if (/website|url|link|mode/.test(value)) return "globe";
  if (/email/.test(value)) return "mail";
  if (/phone|contact/.test(value)) return "phone";
  if (/title|role/.test(value)) return "briefcase";
  if (/name/.test(value)) return "user";
  return "info";
}

function createKeyValueRow(labelText: string, valueText: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "medex-kv-row";

  const iconWrap = iconElement(iconForLabel(labelText), "medex-kv-icon");
  const copy = document.createElement("div");
  copy.className = "medex-kv-copy";

  const label = document.createElement("span");
  label.className = "medex-kv-label";
  label.textContent = labelText.replace(/[:：]+$/, "").trim();

  const value = document.createElement("span");
  value.className = "medex-kv-value";
  appendLinkifiedText(value, valueText.trim());

  copy.append(label, value);
  row.append(iconWrap, copy);
  return row;
}

function bulletIconForSection(key: DescriptionSectionKey): IconName {
  if (key === "eligibility") return "checkCircle";
  if (key === "documents") return "fileText";
  if (key === "notes") return "alertTriangle";
  if (key === "contact") return "phone";
  if (key === "application") return "calendar";
  if (key === "selection") return "award";
  if (key === "responsibilities") return "clipboard";
  return "checkCircle";
}

function createContentBlock(section: DescriptionSection): HTMLElement {
  const block = document.createElement("div");
  block.className = `medex-section-body medex-section-${section.key}`;
  let list: HTMLDivElement | null = null;
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
      const heading = document.createElement("div");
      heading.className = "medex-description-subheading";
      heading.append(iconElement(iconForLabel(line), "medex-subheading-icon"));
      const text = document.createElement("h4");
      text.textContent = stripBullet(line).replace(/[:：]+$/, "");
      heading.append(text);
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
        list = document.createElement("div");
        list.className = "medex-description-list";
      }
      const item = document.createElement("div");
      item.className = "medex-description-list-item";
      item.append(iconElement(bulletIconForSection(section.key), "medex-list-icon"));
      const text = document.createElement("div");
      text.className = "medex-list-copy";
      appendLinkifiedText(text, clean);
      item.append(text);
      list.append(item);
      return;
    }

    flushList();
    const paragraph = document.createElement("div");
    paragraph.className = "medex-description-line";
    paragraph.append(iconElement(section.key === "details" ? "info" : bulletIconForSection(section.key), "medex-line-icon"));
    const text = document.createElement("p");
    appendLinkifiedText(text, clean);
    paragraph.append(text);
    block.append(paragraph);
  });

  flushList();
  flushGrid();
  return block;
}

function createTabButton(section: DescriptionSection, index: number): HTMLButtonElement {
  const config = sectionConfig(section.key);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "medex-description-tab";
  button.dataset.tab = section.key;
  button.id = `medex-tab-${section.key}`;
  button.setAttribute("role", "tab");
  button.setAttribute("aria-selected", index === 0 ? "true" : "false");
  button.setAttribute("aria-controls", `medex-panel-${section.key}`);
  button.tabIndex = index === 0 ? 0 : -1;

  button.append(iconElement(config.icon, "medex-tab-icon"));
  const label = document.createElement("span");
  label.className = "medex-tab-label";
  label.textContent = section.label;
  const count = document.createElement("span");
  count.className = "medex-tab-count";
  count.textContent = String(section.lines.length);
  button.append(label, count);
  return button;
}

function createSectionPanel(section: DescriptionSection, index: number): HTMLElement {
  const config = sectionConfig(section.key);
  const panel = document.createElement("section");
  panel.className = "medex-description-panel";
  panel.dataset.panel = section.key;
  panel.dataset.section = section.key;
  panel.id = `medex-panel-${section.key}`;
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", `medex-tab-${section.key}`);
  panel.hidden = index !== 0;

  const header = document.createElement("div");
  header.className = "medex-description-panel-header";

  const titleGroup = document.createElement("div");
  titleGroup.className = "medex-panel-title-group";
  titleGroup.append(iconElement(config.icon, "medex-panel-icon"));
  const titleCopy = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = section.label;
  const helper = document.createElement("p");
  helper.textContent = config.helper;
  titleCopy.append(title, helper);
  titleGroup.append(titleCopy);

  const hint = document.createElement("span");
  hint.className = "medex-panel-count";
  hint.textContent = `${section.lines.length} item${section.lines.length === 1 ? "" : "s"}`;

  header.append(titleGroup, hint);
  panel.append(header, createContentBlock(section));
  return panel;
}

function createPreviewCard(
  title: string,
  section: DescriptionSection | undefined,
  tone: "overview" | "documents" | "notes",
): HTMLElement | null {
  if (!section || section.lines.length === 0) return null;

  const iconName: IconName = tone === "documents" ? "fileText" : tone === "notes" ? "alertTriangle" : "briefcase";
  const card = document.createElement("div");
  card.className = `medex-summary-card medex-summary-${tone}`;

  const heading = document.createElement("div");
  heading.className = "medex-summary-heading";
  heading.append(iconElement(iconName, "medex-summary-icon"));
  const headingText = document.createElement("h4");
  headingText.textContent = title;
  heading.append(headingText);
  card.append(heading);

  const list = document.createElement("div");
  list.className = "medex-summary-list";
  section.lines
    .filter((line) => !looksLikeSubheading(line) && !/^-{3,}$/.test(line))
    .slice(0, 5)
    .forEach((line) => {
      const item = document.createElement("div");
      item.className = "medex-summary-item";
      item.append(iconElement(iconName, "medex-summary-item-icon"));
      const copy = document.createElement("div");
      const clean = stripBullet(line);
      const colonIndex = clean.indexOf(":");
      if (colonIndex > 0 && colonIndex <= 38) {
        const strong = document.createElement("strong");
        strong.textContent = `${clean.slice(0, colonIndex)}: `;
        copy.append(strong);
        appendLinkifiedText(copy, clean.slice(colonIndex + 1).trim());
      } else {
        appendLinkifiedText(copy, clean);
      }
      item.append(copy);
      list.append(item);
    });

  card.append(list);
  return card;
}

function enhanceDescription(root: ParentNode) {
  const descriptionHeading = Array.from(root.querySelectorAll("h2")).find(
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

  const intro = document.createElement("div");
  intro.className = "medex-description-intro";
  intro.append(iconElement("sparkles", "medex-intro-icon"));
  const introCopy = document.createElement("div");
  const introTitle = document.createElement("strong");
  introTitle.textContent = "Everything important, organised for quick scanning";
  const introText = document.createElement("p");
  introText.textContent = "Switch between sections to check eligibility, dates, documents and other job details without reading one long block.";
  introCopy.append(introTitle, introText);
  intro.append(introCopy);

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

  const activateTab = (target: HTMLButtonElement) => {
    const key = target.dataset.tab;
    tabs.querySelectorAll<HTMLButtonElement>(".medex-description-tab").forEach((button) => {
      const active = button === target;
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.tabIndex = active ? 0 : -1;
    });
    panels.querySelectorAll<HTMLElement>(".medex-description-panel").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== key;
    });
  };

  tabs.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>(".medex-description-tab");
    if (target) activateTab(target);
  });

  tabs.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(tabs.querySelectorAll<HTMLButtonElement>(".medex-description-tab"));
    const currentIndex = buttons.findIndex((button) => button.getAttribute("aria-selected") === "true");
    if (currentIndex < 0) return;
    event.preventDefault();
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = buttons.length - 1;
    activateTab(buttons[nextIndex]);
    buttons[nextIndex].focus();
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

  original.replaceWith(intro, shell);
  if (summaryGrid.children.length) card.append(summaryGrid);
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
  Array.from(root.querySelectorAll("a")).forEach((anchor) => {
    const text = anchor.textContent?.trim().toLowerCase() || "";
    if (anchor.dataset.medexRelabeled === "true") return;
    if (text.includes("official apply link")) {
      anchor.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) node.textContent = "";
      });
      const label = document.createElement("span");
      label.textContent = "Official Website";
      const firstSvg = anchor.querySelector("svg");
      if (firstSvg) firstSvg.after(label);
      else anchor.prepend(label);
      anchor.dataset.medexRelabeled = "true";
    } else if (text.includes("view notification") || text.includes("official notification pdf")) {
      anchor.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) node.textContent = "";
      });
      const label = document.createElement("span");
      label.textContent = "Notification PDF";
      const firstSvg = anchor.querySelector("svg");
      if (firstSvg) firstSvg.after(label);
      else anchor.prepend(label);
      anchor.dataset.medexRelabeled = "true";
    }
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
  const jobDetailsCard = Array.from(mainColumn.children).find((element) =>
    Array.from(element.querySelectorAll("h2")).some((heading) => heading.textContent?.trim().toLowerCase() === "job details"),
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
  heading.textContent = "Official Sources";
  const help = document.createElement("p");
  help.textContent = "Verify the complete notification and application details from the official source.";
  headerCopy.append(eyebrow, heading, help);
  header.append(headerCopy);
  section.append(header);

  const grid = document.createElement("div");
  grid.className = "medex-government-links-grid";

  const addOfficialLink = (source: HTMLAnchorElement, type: "website" | "pdf") => {
    const link = document.createElement("a");
    link.className = `medex-official-link medex-official-${type}`;
    link.href = source.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.append(iconElement(type === "website" ? "globe" : "fileText", "medex-official-link-icon"));
    const copy = document.createElement("span");
    copy.className = "medex-official-link-copy";
    const strong = document.createElement("strong");
    strong.textContent = type === "website" ? "Official Website" : "Notification PDF";
    const small = document.createElement("small");
    small.textContent = type === "website" ? "Open the official recruitment/application page" : "Read the complete official notification";
    copy.append(strong, small);
    link.append(copy, iconElement("link", "medex-official-link-arrow"));
    grid.append(link);
  };

  if (websiteSource) addOfficialLink(websiteSource, "website");
  if (pdfSource) addOfficialLink(pdfSource, "pdf");
  section.append(grid);

  if (jobDetailsCard?.nextSibling) mainColumn.insertBefore(section, jobDetailsCard.nextSibling);
  else mainColumn.append(section);

  Array.from(mainColumn.children).forEach((element) => {
    const headingNode = Array.from(element.querySelectorAll("h2")).find(
      (item) => item.textContent?.trim().toLowerCase() === "official documents",
    );
    if (headingNode) element.classList.add("medex-official-docs-original");
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
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleEnhancement, { once: true });
  else scheduleEnhancement();
  const observer = new MutationObserver(scheduleEnhancement);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
