const SECTION_TITLES = [
  "job details",
  "about the role",
  "eligibility",
  "eligibility criteria",
  "key responsibilities",
  "responsibilities",
  "benefits",
  "walk-in interview",
  "important dates",
  "documents required",
  "selection process",
  "important notes",
  "job overview",
  "contact",
  "contact information",
];

const SECTION_PATTERN = new RegExp(
  `\\b(${SECTION_TITLES.map((title) => title.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")).join("|")})\\b`,
  "gi",
);

function normalizeDescription(raw: string): string {
  let text = raw.replace(/\r\n?/g, "\n").trim();

  // Older AI-pasted descriptions may have been stored as one long line.
  // Add safe section breaks around common recruitment headings.
  if (!text.includes("\n")) {
    text = text.replace(SECTION_PATTERN, (match) => `\n\n${match}\n`);
    text = text.replace(/\s+[•●▪]\s+/g, "\n- ");
    text = text.replace(/\s+-\s+(?=[A-Z0-9🎓🏥👤💰📍📋🎂📝📢📅⏰⚠️📄🎯🔄🚫☎️🌐])/g, "\n- ");
  }

  return text
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isSectionHeading(line: string): boolean {
  const normalized = line
    .replace(/^[^A-Za-z0-9]+/, "")
    .replace(/[:：]+$/, "")
    .trim()
    .toLowerCase();

  return SECTION_TITLES.includes(normalized);
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

function createBodyLine(line: string): HTMLElement {
  const element = document.createElement("p");
  element.className = "medex-description-line";

  const colonIndex = line.indexOf(":");
  if (colonIndex > 0 && colonIndex <= 32) {
    const label = document.createElement("strong");
    label.textContent = `${line.slice(0, colonIndex + 1)} `;
    element.append(label);
    appendLinkifiedText(element, line.slice(colonIndex + 1).trim());
  } else {
    appendLinkifiedText(element, line);
  }

  return element;
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

  const formatted = document.createElement("div");
  formatted.className = "medex-job-description";

  const lines = normalizeDescription(raw).split("\n");
  let list: HTMLUListElement | null = null;

  const closeList = () => {
    if (list) {
      formatted.append(list);
      list = null;
    }
  };

  lines.forEach((line) => {
    if (!line) {
      closeList();
      return;
    }

    if (isSectionHeading(line)) {
      closeList();
      const heading = document.createElement("h3");
      heading.className = "medex-description-heading";
      heading.textContent = line.replace(/[:：]+$/, "");
      formatted.append(heading);
      return;
    }

    if (/^[-•*]\s+/.test(line)) {
      if (!list) {
        list = document.createElement("ul");
        list.className = "medex-description-list";
      }
      const item = document.createElement("li");
      appendLinkifiedText(item, line.replace(/^[-•*]\s+/, ""));
      list.append(item);
      return;
    }

    closeList();
    formatted.append(createBodyLine(line));
  });

  closeList();
  original.replaceWith(formatted);
  card.dataset.medexDescriptionEnhanced = "true";
  card.classList.add("medex-description-card");
}

function findLinkByText(root: ParentNode, labels: string[]): HTMLAnchorElement | null {
  return (
    Array.from(root.querySelectorAll("a")).find((anchor) => {
      const text = anchor.textContent?.trim().toLowerCase() || "";
      return labels.some((label) => text.includes(label));
    }) as HTMLAnchorElement | undefined
  ) || null;
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
  header.innerHTML = `
    <div>
      <div class="medex-government-links-eyebrow">Government Job</div>
      <h2>Official Links</h2>
      <p>Use the official source to verify the notification and application details.</p>
    </div>
  `;
  section.append(header);

  const grid = document.createElement("div");
  grid.className = "medex-government-links-grid";

  if (websiteSource) {
    const link = document.createElement("a");
    link.className = "medex-official-link medex-official-website";
    link.href = websiteSource.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.innerHTML = `
      <span class="medex-official-link-icon">🌐</span>
      <span class="medex-official-link-copy">
        <strong>Official Website</strong>
        <small>Open the official recruitment/application page</small>
      </span>
      <span class="medex-official-link-arrow">↗</span>
    `;
    grid.append(link);
  }

  if (pdfSource) {
    const link = document.createElement("a");
    link.className = "medex-official-link medex-official-pdf";
    link.href = pdfSource.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.innerHTML = `
      <span class="medex-official-link-icon">📄</span>
      <span class="medex-official-link-copy">
        <strong>Notification PDF</strong>
        <small>Read the complete official notification</small>
      </span>
      <span class="medex-official-link-arrow">↗</span>
    `;
    grid.append(link);
  }

  section.append(grid);

  if (jobDetailsCard?.nextSibling) {
    mainColumn.insertBefore(section, jobDetailsCard.nextSibling);
  } else {
    mainColumn.append(section);
  }

  // The original large inline PDF block consumes significant space. The two
  // official actions above are the primary government-job navigation now.
  Array.from(mainColumn.children).forEach((element) => {
    const heading = Array.from(element.querySelectorAll("h2")).find(
      (item) => item.textContent?.trim().toLowerCase() === "official documents",
    );
    if (heading) element.classList.add("medex-official-docs-original");
  });
}

function enhanceJobDetailPage() {
  const root = document;
  enhanceDescription(root);
  enhanceGovernmentLinks(root);
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
