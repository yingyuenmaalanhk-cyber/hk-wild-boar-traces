/**
 * 豬絲馬跡 — about page
 * Renders the data limitations list from data/meta.json so the site copy and
 * the pipeline always agree.
 */

import { loadJSON } from "./site.js";

async function init() {
  const meta = await loadJSON("data/meta.json");
  const list = document.querySelector("[data-limitations]");
  if (list && meta.limitations?.length) {
    list.innerHTML = meta.limitations.map((item) => `<li>${item}</li>`).join("");
  }
}

init().catch((error) => console.error(error));
