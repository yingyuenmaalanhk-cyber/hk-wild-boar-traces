/**
 * 豬絲馬跡 — shared site behaviour
 * Nav toggle, small helpers, and filling the site-wide data snapshot banner
 * from data/meta.json.
 */

export const SITE = {
  name: "豬絲馬跡",
  nameEn: "HK Wild Boar Traces",
  /** Public repository URL — shown as the footer source-code link. */
  repoUrl: "https://github.com/yingyuenmaalanhk-cyber/hk-wild-boar-traces",
  sourceName: "漁農自然護理署",
};

/** Fetch a JSON file from /data with a helpful error message. */
export async function loadJSON(path) {
  const resp = await fetch(path);
  if (!resp.ok) {
    throw new Error(`無法載入 ${path}（HTTP ${resp.status}）`);
  }
  return resp.json();
}

/** Format an ISO date (2026-08-12) as 2026年8月12日. */
export function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

/** Escape untrusted strings before inserting into HTML. */
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

/** Days between an ISO date and the dataset reference date. */
export function daysSince(iso, referenceIso) {
  return Math.round((new Date(referenceIso) - new Date(iso)) / 86400000);
}

/* --- navigation ---------------------------------------------------------- */

function initNav() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  if (!header || !toggle) return;
  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

/* --- data snapshot banner ------------------------------------------------ */

async function initDataBanner() {
  const banner = document.querySelector("[data-banner]");
  if (!banner) return;
  try {
    const meta = await loadJSON("data/meta.json");
    const parts = banner.querySelectorAll("[data-banner-part]");
    for (const part of parts) {
      const key = part.dataset.bannerPart;
      if (key === "date") part.textContent = meta.coverage.reference_date;
      if (key === "source") part.textContent = meta.data_source.publisher;
    }
    banner.hidden = false;
  } catch (error) {
    console.error(error);
    banner.hidden = false;
  }
}

/* --- footer repo link ---------------------------------------------------- */

function initRepoLink() {
  const link = document.querySelector("[data-repo-link]");
  if (link && SITE.repoUrl) {
    link.href = SITE.repoUrl;
    link.hidden = false;
  }
}

initNav();
initDataBanner();
initRepoLink();
