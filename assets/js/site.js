/**
 * 豬絲馬跡 — shared site behaviour
 * Language initialisation, nav toggle, and the site-wide data snapshot
 * banner filled from data/meta.json.
 */

import { currentLang, initI18n, loadJSON, metaField } from "./i18n.js";

/* --- language ------------------------------------------------------------- */

initI18n();

/* --- navigation ----------------------------------------------------------- */

function initNav() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  if (!header || !toggle) return;
  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

/* --- data snapshot banner -------------------------------------------------- */

async function initDataBanner() {
  const banner = document.querySelector("[data-banner]");
  if (!banner) return;

  const render = (meta) => {
    const lang = currentLang();
    const publisher =
      lang === "en" ? meta.data_source.publisher_en : meta.data_source.publisher;
    const publisherShort = publisher.includes("漁農") || publisher.includes("Agriculture")
      ? (lang === "en" ? "AFCD" : "漁農自然護理署")
      : publisher;
    const snapshot = banner.querySelector("[data-banner-date]");
    const source = banner.querySelector("[data-banner-source]");
    if (snapshot) snapshot.textContent = meta.coverage.reference_date;
    if (source) source.textContent = publisherShort;
  };

  try {
    const meta = await loadJSON("data/meta.json");
    render(meta);
    banner.hidden = false;
    document.addEventListener("langchange", () => render(meta));
  } catch (error) {
    console.error(error);
    banner.hidden = false;
  }
}

initNav();
initDataBanner();
