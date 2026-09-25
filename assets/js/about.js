import "./site.js";

/**
 * 豬絲馬跡 — about page
 * Renders the data limitations lists from data/meta.json in both languages;
 * which list is visible is decided purely by the html[lang] CSS rules, so a
 * language switch needs no re-render here.
 */

import { esc, loadJSON } from "./i18n.js";

async function init() {
  const meta = await loadJSON("data/meta.json");
  const zh = document.querySelector("[data-limitations]");
  const en = document.querySelector("[data-limitations-en]");
  if (zh && meta.limitations?.length) {
    zh.innerHTML = meta.limitations.map((item) => `<li>${esc(item)}</li>`).join("");
  }
  if (en && meta.limitations_en?.length) {
    en.innerHTML = meta.limitations_en.map((item) => `<li>${esc(item)}</li>`).join("");
  }
}

init().catch((error) => console.error(error));
